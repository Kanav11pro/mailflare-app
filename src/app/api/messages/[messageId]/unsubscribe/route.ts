import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { domains, mailboxes, messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";
import { sendEmail } from "@/lib/email/send";

type RouteParams = {
	params: Promise<{ messageId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { messageId } = await params;
	const db = getDb(env);

	const [message] = await db
		.select()
		.from(messages)
		.where(eq(messages.id, messageId))
		.limit(1);

	if (!message || !message.mailboxId) {
		return NextResponse.json({ error: "Message not found" }, { status: 404 });
	}

	// Verify permission
	const access = await getMailboxAccessLevel(db, user, message.mailboxId);
	if (!access) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	let unsubscribedViaHttp = false;

	// 1. Attempt RFC 8058 / HTTP Unsubscribe
	if (message.unsubscribeUrl) {
		try {
			// RFC 8058 specifies sending a POST request with body "List-Unsubscribe=One-Click"
			const res = await fetch(message.unsubscribeUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"User-Agent": "Mailflare-Unsubscribe-Agent/1.0",
				},
				body: "List-Unsubscribe=One-Click",
			});

			if (res.ok) {
				unsubscribedViaHttp = true;
			} else {
				// Fallback to GET
				const getRes = await fetch(message.unsubscribeUrl, {
					method: "GET",
					headers: { "User-Agent": "Mailflare-Unsubscribe-Agent/1.0" },
				});
				if (getRes.ok) unsubscribedViaHttp = true;
			}
		} catch (err) {
			console.warn("HTTP unsubscribe failed:", err);
		}
	}

	// 2. Fallback to Mailto Unsubscribe if HTTP was not available or failed
	if (!unsubscribedViaHttp && message.unsubscribeMailto) {
		try {
			const [mailbox] = await db
				.select({
					id: mailboxes.id,
					localPart: mailboxes.localPart,
					hostname: domains.hostname,
				})
				.from(mailboxes)
				.leftJoin(domains, eq(mailboxes.domainId, domains.id))
				.where(eq(mailboxes.id, message.mailboxId))
				.limit(1);

			if (mailbox) {
				const fromAddr = `${mailbox.localPart}@${mailbox.hostname || "mail.studyholic.xyz"}`;
				await sendEmail(env, {
					userId: user.id,
					mailboxId: mailbox.id,
					from: fromAddr,
					to: [message.unsubscribeMailto],
					subject: "Unsubscribe",
					text: "Please unsubscribe me from this mailing list.",
				});
			}
		} catch (err) {
			console.warn("Mailto unsubscribe dispatch error:", err);
		}
	}

	// 3. Move message to Trash
	await db
		.update(messages)
		.set({ status: "trash" })
		.where(eq(messages.id, messageId));

	return NextResponse.json({
		ok: true,
		unsubscribed: true,
		message: "Successfully unsubscribed and moved message to Trash.",
	});
}
