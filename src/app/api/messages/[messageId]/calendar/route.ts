import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { messageAttachments, messages, mailboxes, domains } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { parseIcs, generateRsvpReplyIcs } from "@/lib/calendar/ics";
import { extractActionItemsAndMeetings } from "@/lib/calendar/action-items";
import { sendEmail } from "@/lib/email/send";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ messageId: string }> },
) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { messageId } = await params;
	const db = getDb(env);

	const [msg] = await db
		.select()
		.from(messages)
		.where(and(eq(messages.id, messageId), eq(messages.userId, user.id)))
		.limit(1);

	if (!msg) {
		return NextResponse.json({ error: "Message not found" }, { status: 404 });
	}

	// 1. Check for .ics attachment or body
	const attachments = await db
		.select()
		.from(messageAttachments)
		.where(eq(messageAttachments.messageId, messageId));

	let parsedEvent: ReturnType<typeof parseIcs> = null;

	const icsAtt = attachments.find(
		(a) =>
			a.contentType.toLowerCase().includes("calendar") ||
			a.contentType.toLowerCase().includes("ics") ||
			a.filename.toLowerCase().endsWith(".ics"),
	);

	if (icsAtt) {
		try {
			const r2Obj = await env.BUCKET.get(icsAtt.r2Key);
			if (r2Obj) {
				const icsText = await r2Obj.text();
				parsedEvent = parseIcs(icsText);
			}
		} catch (err) {
			console.error("Failed to parse calendar attachment from R2:", err);
		}
	}

	// If body itself contains iCalendar text (e.g. text/calendar body)
	if (!parsedEvent && msg.textBody && msg.textBody.includes("BEGIN:VCALENDAR")) {
		parsedEvent = parseIcs(msg.textBody);
	}

	// Find user's attendance status in the event
	let userStatus: "ACCEPTED" | "DECLINED" | "TENTATIVE" | "NEEDS-ACTION" = "NEEDS-ACTION";
	if (parsedEvent) {
		const userAttendee = parsedEvent.attendees.find((a) => {
			const email = a.email.toLowerCase();
			return email === user.email.toLowerCase() || (msg.toAddr && msg.toAddr.toLowerCase().includes(email));
		});
		if (userAttendee && userAttendee.partStat) {
			userStatus = userAttendee.partStat;
		}
	}

	// 2. Extract action items / deadlines / proposed meetings
	const actionItems = extractActionItemsAndMeetings({
		subject: msg.subject,
		textBody: msg.textBody,
		receivedAt: msg.createdAt,
	});

	return NextResponse.json({
		hasEvent: !!parsedEvent,
		event: parsedEvent
			? {
					uid: parsedEvent.uid,
					method: parsedEvent.method,
					summary: parsedEvent.summary,
					description: parsedEvent.description,
					location: parsedEvent.location,
					url: parsedEvent.url,
					conferenceUrl: parsedEvent.conferenceUrl,
					dtStart: parsedEvent.dtStart ? parsedEvent.dtStart.toISOString() : null,
					dtEnd: parsedEvent.dtEnd ? parsedEvent.dtEnd.toISOString() : null,
					isAllDay: parsedEvent.isAllDay,
					organizer: parsedEvent.organizer,
					attendees: parsedEvent.attendees,
					status: parsedEvent.status,
					userStatus,
				}
			: null,
		actionItems,
	});
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ messageId: string }> },
) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { messageId } = await params;
	const body = await request.json().catch(() => ({}));
	const action = body.action as "accept" | "decline" | "tentative";
	const comment = (body.comment as string) || undefined;

	if (!action || !["accept", "decline", "tentative"].includes(action)) {
		return NextResponse.json(
			{ error: "Invalid action. Must be 'accept', 'decline', or 'tentative'" },
			{ status: 400 },
		);
	}

	const db = getDb(env);

	const [msg] = await db
		.select()
		.from(messages)
		.where(and(eq(messages.id, messageId), eq(messages.userId, user.id)))
		.limit(1);

	if (!msg) {
		return NextResponse.json({ error: "Message not found" }, { status: 404 });
	}

	// Find the calendar attachment
	const attachments = await db
		.select()
		.from(messageAttachments)
		.where(eq(messageAttachments.messageId, messageId));

	const icsAtt = attachments.find(
		(a) =>
			a.contentType.toLowerCase().includes("calendar") ||
			a.contentType.toLowerCase().includes("ics") ||
			a.filename.toLowerCase().endsWith(".ics"),
	);

	let icsText = "";
	if (icsAtt) {
		const r2Obj = await env.BUCKET.get(icsAtt.r2Key);
		if (r2Obj) {
			icsText = await r2Obj.text();
		}
	} else if (msg.textBody && msg.textBody.includes("BEGIN:VCALENDAR")) {
		icsText = msg.textBody;
	}

	if (!icsText) {
		return NextResponse.json({ error: "No calendar invite found in this message" }, { status: 400 });
	}

	const event = parseIcs(icsText);
	if (!event || !event.organizer?.email) {
		return NextResponse.json({ error: "Calendar invite is missing organizer email" }, { status: 400 });
	}

	// Resolve sending mailbox
	let mailboxId = msg.mailboxId;
	let fromAddr = user.email;

	if (mailboxId) {
		const [mb] = await db
			.select({
				id: mailboxes.id,
				localPart: mailboxes.localPart,
				hostname: domains.hostname,
			})
			.from(mailboxes)
			.leftJoin(domains, eq(mailboxes.domainId, domains.id))
			.where(eq(mailboxes.id, mailboxId))
			.limit(1);
		if (mb) {
			fromAddr = `${mb.localPart}@${mb.hostname || "mail.studyholic.xyz"}`;
		}
	} else {
		const [firstMb] = await db
			.select({
				id: mailboxes.id,
				localPart: mailboxes.localPart,
				hostname: domains.hostname,
			})
			.from(mailboxes)
			.leftJoin(domains, eq(mailboxes.domainId, domains.id))
			.where(eq(mailboxes.userId, user.id))
			.limit(1);
		if (firstMb) {
			mailboxId = firstMb.id;
			fromAddr = `${firstMb.localPart}@${firstMb.hostname || "mail.studyholic.xyz"}`;
		}
	}

	if (!mailboxId) {
		return NextResponse.json({ error: "No active mailbox available to send RSVP" }, { status: 400 });
	}

	// Generate RFC 5546 REPLY iCalendar payload
	const rsvpIcs = generateRsvpReplyIcs({
		event,
		attendeeEmail: fromAddr,
		attendeeName: user.name,
		action,
		comment,
	});

	const actionTitle = action === "accept" ? "Accepted" : action === "decline" ? "Declined" : "Tentative";
	const subject = `${actionTitle}: ${event.summary}`;
	const text = `${user.name} has ${action === "accept" ? "accepted" : action === "decline" ? "declined" : "tentatively accepted"} this invitation.\n\nEvent: ${event.summary}\nDate: ${event.dtStart ? event.dtStart.toUTCString() : "TBD"}${comment ? `\n\nComment: ${comment}` : ""}`;

	const icsBuffer = new TextEncoder().encode(rsvpIcs);

	try {
		await sendEmail(env, {
			userId: user.id,
			from: fromAddr,
			to: [event.organizer.email],
			subject,
			text,
			mailboxId,
			inReplyTo: msg.providerMessageId || msg.id,
			references: msg.providerMessageId || msg.id,
			headers: {
				"Content-Class": "urn:content-classes:calendarmessage",
			},
			attachments: [
				{
					filename: "invite.ics",
					type: "text/calendar; method=REPLY; charset=UTF-8",
					content: icsBuffer,
					disposition: "attachment",
				},
			],
		});

		return NextResponse.json({
			success: true,
			action,
			summary: event.summary,
			organizer: event.organizer.email,
		});
	} catch (err: any) {
		console.error("RSVP dispatch failed:", err);
		return NextResponse.json({ error: err.message || "Failed to dispatch RSVP" }, { status: 500 });
	}
}
