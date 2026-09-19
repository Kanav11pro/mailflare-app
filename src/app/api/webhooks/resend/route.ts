import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/cloudflare";
import { getDb } from "@/db";
import { messages } from "@/db/schema";
import { newId } from "@/lib/ids";
import { buildSnippet } from "@/lib/email/parse";
import { resolveInboundAddress, resolveInboxRuleDestination } from "@/lib/email/routing";
import { dispatchWebhooks } from "@/lib/email/webhooks";
import { upsertContactFromAddress } from "@/lib/contacts/service";
import { formatEmailAddress, getEmailAddress } from "@/lib/email/address";
import { storeMessageAttachments } from "@/lib/email/attachments";
import { getMailboxNotificationUserIds, notifyUsersOfNewMessage } from "@/lib/realtime/utils";
import type { AttachmentContent } from "@/lib/email/attachment-types";

interface ResendWebhookPayload {
	type: string;
	created_at?: string;
	data?: {
		email_id?: string;
		from?: string;
		to?: string[];
		subject?: string;
		message_id?: string;
		message?: string;
		bounce_type?: string;
		url?: string;
		click?: {
			link?: string;
		};
		attachments?: Array<{
			id: string;
			filename: string;
			content_type: string;
			content_disposition?: string;
			content_id?: string | null;
		}>;
	};
}

interface ResendReceivedEmail {
	id: string;
	from?: string;
	to?: string[];
	subject?: string;
	html?: string | null;
	text?: string | null;
	headers?: Record<string, string>;
	raw?: {
		download_url?: string;
	};
}

export async function POST(request: Request) {
	const env = getEnv();
	const apiKey = env.RESEND_API_KEY;

	if (!apiKey) {
		return NextResponse.json({ error: "RESEND_API_KEY is not configured" }, { status: 500 });
	}

	let body: ResendWebhookPayload;
	try {
		body = (await request.json()) as ResendWebhookPayload;
	} catch {
		return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
	}

	// 1. Handle Outbound Delivery Telemetry Events (email.delivered, email.bounced, email.opened, etc.)
	if (body.type !== "email.received") {
		const emailId = body.data?.email_id;
		if (!emailId) {
			return NextResponse.json({ ok: true, message: "Ignored event with no email_id" });
		}

		const db = getDb(env);
		const [matchingMsg] = await db
			.select()
			.from(messages)
			.where(eq(messages.providerMessageId, emailId))
			.limit(1);

		if (!matchingMsg) {
			return NextResponse.json({ ok: true, message: "No matching outbound message found" });
		}

		const eventTime = body.created_at ? new Date(body.created_at) : new Date();

		if (body.type === "email.delivered") {
			const latencyMs = Math.max(
				0,
				eventTime.getTime() - new Date(matchingMsg.createdAt).getTime()
			);
			await db
				.update(messages)
				.set({
					deliveryStatus: "delivered",
					deliveryAt: eventTime,
					deliveryLatencyMs: latencyMs,
					deliveryError: null,
				})
				.where(eq(messages.id, matchingMsg.id));
		} else if (body.type === "email.sent") {
			if (!matchingMsg.deliveryStatus || matchingMsg.deliveryStatus === "queued") {
				await db
					.update(messages)
					.set({ deliveryStatus: "sent" })
					.where(eq(messages.id, matchingMsg.id));
			}
		} else if (body.type === "email.delivery_delayed") {
			await db
				.update(messages)
				.set({
					deliveryError:
						body.data?.message || "Delivery delayed / greylisted by recipient mail server",
				})
				.where(eq(messages.id, matchingMsg.id));
		} else if (body.type === "email.bounced") {
			const bounceType = body.data?.bounce_type || "Permanent";
			const bounceError =
				body.data?.message ||
				(bounceType === "Permanent"
					? "550 5.1.1 Recipient mailbox rejected (address does not exist)"
					: "Transient SMTP delivery failure");
			await db
				.update(messages)
				.set({
					deliveryStatus: "bounced",
					deliveryBounceType: bounceType,
					deliveryError: bounceError,
					deliveryAt: eventTime,
				})
				.where(eq(messages.id, matchingMsg.id));
		} else if (body.type === "email.complained") {
			await db
				.update(messages)
				.set({
					deliveryStatus: "complained",
					deliveryError: "Recipient marked email as spam",
				})
				.where(eq(messages.id, matchingMsg.id));
		} else if (body.type === "email.opened") {
			await db
				.update(messages)
				.set({
					openedAt: matchingMsg.openedAt || eventTime,
					openCount: (matchingMsg.openCount || 0) + 1,
				})
				.where(eq(messages.id, matchingMsg.id));
		} else if (body.type === "email.clicked") {
			const clickedUrl = body.data?.click?.link || body.data?.url || matchingMsg.lastClickedUrl;
			await db
				.update(messages)
				.set({
					clickedAt: matchingMsg.clickedAt || eventTime,
					clickCount: (matchingMsg.clickCount || 0) + 1,
					lastClickedUrl: clickedUrl,
				})
				.where(eq(messages.id, matchingMsg.id));
		}

		return NextResponse.json({ ok: true, event: body.type, messageId: matchingMsg.id });
	}

	if (!body.data?.email_id) {
		return NextResponse.json({ ok: true, message: "Ignored empty email.received" });
	}

	const emailId = body.data.email_id;
	const db = getDb(env);

	try {
		// 1. Fetch full email content from Resend Receiving API
		const emailRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (!emailRes.ok) {
			console.error(`Failed to fetch received email ${emailId} from Resend: ${emailRes.status}`);
			return NextResponse.json({ error: "Failed to fetch email from Resend" }, { status: 502 });
		}

		const emailData = (await emailRes.json()) as ResendReceivedEmail;
		const recipient = (emailData.to && emailData.to[0]) || (body.data.to && body.data.to[0]) || "";
		const sender = emailData.from || body.data.from || "unknown@unknown.com";
		const subject = emailData.subject ?? body.data.subject ?? null;
		const html = emailData.html ?? null;
		const text = emailData.text ?? null;

		// 2. Resolve target mailbox
		const decision = await resolveInboundAddress(db, recipient);
		if (!decision || !decision.mailbox || decision.action === "reject") {
			console.warn(`No active mailbox found for recipient: ${recipient}`);
			return NextResponse.json({ ok: true, message: "No matching mailbox" });
		}

		// 3. Fetch any attachments
		const attachmentContents: AttachmentContent[] = [];
		const attachmentMetaList = body.data.attachments || [];

		for (const att of attachmentMetaList) {
			try {
				const attRes = await fetch(
					`https://api.resend.com/emails/receiving/${emailId}/attachments/${att.id}`,
					{
						headers: { Authorization: `Bearer ${apiKey}` },
					},
				);
				if (attRes.ok) {
					const attData = (await attRes.json()) as { download_url?: string };
					if (attData.download_url) {
						const fileRes = await fetch(attData.download_url);
						if (fileRes.ok) {
							const arrayBuffer = await fileRes.arrayBuffer();
							attachmentContents.push({
								filename: att.filename || "attachment",
								type: att.content_type || "application/octet-stream",
								content: arrayBuffer,
								disposition: att.content_disposition === "inline" ? "inline" : "attachment",
								contentId: att.content_id ?? null,
							});
						}
					}
				}
			} catch (attErr) {
				console.error(`Failed to fetch attachment ${att.id} for email ${emailId}:`, attErr);
			}
		}

		// 4. Save raw email into R2 if available
		const rawKey = `inbound/${Date.now()}-${newId()}.eml`;
		const rawContent = text || html || `Subject: ${subject}\nFrom: ${sender}\nTo: ${recipient}\n`;
		await env.BUCKET.put(rawKey, new TextEncoder().encode(rawContent).buffer, {
			httpMetadata: { contentType: "message/rfc822" },
			customMetadata: { from: sender, to: recipient, resendEmailId: emailId },
		});

		// 5. Store message in D1
		const messageId = newId("msg");
		const snippet = buildSnippet(text, html);
		const deliveredAddress =
			getEmailAddress(recipient) || `${decision.mailbox.localPart}@${decision.mailbox.hostname}`;
		const toAddr = formatEmailAddress(
			deliveredAddress,
			decision.mailbox.displayName ?? decision.mailbox.localPart,
		);
		const fromAddr = sender;

		const destination = await resolveInboxRuleDestination(db, {
			mailboxId: decision.mailbox.mailboxId,
			toAddress: toAddr,
			fromAddress: fromAddr,
			subject,
			content: [text, html, snippet].filter(Boolean).join(" "),
		});

		const contact = await upsertContactFromAddress(env, {
			userId: decision.mailbox.userId,
			address: fromAddr,
			source: "inbound",
		});

		await db.insert(messages).values({
			id: messageId,
			userId: decision.mailbox.userId,
			mailboxId: decision.mailbox.mailboxId,
			folderId: destination.folderId,
			direction: "inbound",
			providerMessageId: emailId,
			fromAddr,
			toAddr,
			subject,
			snippet,
			textBody: text,
			htmlBody: html,
			rawR2Key: rawKey,
			status: destination.status,
			threadId: body.data.message_id || emailId,
		});

		if (attachmentContents.length > 0) {
			await storeMessageAttachments(env, messageId, attachmentContents, { validate: false });
		}

		// 6. Realtime notification and webhooks
		const notificationUserIds = await getMailboxNotificationUserIds(
			env,
			decision.mailbox.mailboxId,
			decision.mailbox.userId,
		);
		await notifyUsersOfNewMessage(env, notificationUserIds, {
			type: "new_message",
			messageId,
			mailboxId: decision.mailbox.mailboxId,
			from: fromAddr,
			fromName: contact?.displayName ?? null,
			subject,
		});

		await dispatchWebhooks(env, decision.mailbox.userId, "message.inbound", {
			messageId,
			from: fromAddr,
			to: toAddr,
			subject,
		});

		return NextResponse.json({ ok: true, messageId });
	} catch (err) {
		console.error("Resend inbound webhook processing failed:", err);
		const message = err instanceof Error ? err.message : "Processing failed";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
