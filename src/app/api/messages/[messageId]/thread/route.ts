import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { getMessageContactNames } from "@/lib/contacts/service";
import { listMessageAttachments } from "@/lib/email/attachments";
import { getUnsubscribeUrlFromRawR2Key } from "@/lib/email/unsubscribe";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";

type RouteParams = {
	params: Promise<{ messageId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { messageId } = await params;
	const db = getDb(env);

	const [targetMessage] = await db
		.select()
		.from(messages)
		.where(eq(messages.id, messageId))
		.limit(1);

	if (!targetMessage?.mailboxId) {
		return NextResponse.json({ error: "Message not found" }, { status: 404 });
	}

	const access = await getMailboxAccessLevel(db, user, targetMessage.mailboxId);
	if (!access?.canRead) {
		return NextResponse.json({ error: "Access denied" }, { status: 403 });
	}

	// If no threadId or thread is singular, return just this message
	const threadId = targetMessage.threadId;
	let threadMessages = [targetMessage];

	if (threadId) {
		const allInThread = await db
			.select()
			.from(messages)
			.where(
				and(
					eq(messages.mailboxId, targetMessage.mailboxId),
					eq(messages.threadId, threadId),
				),
			)
			.orderBy(asc(messages.createdAt));

		if (allInThread.length > 0) {
			threadMessages = allInThread;
		}
	}

	// Hydrate each message with contacts, attachments, and unsubscribe info
	const hydrated = await Promise.all(
		threadMessages.map(async (msg) => {
			const [contactNames, attachments, unsubscribeUrl] = await Promise.all([
				getMessageContactNames(env, msg.userId, msg.fromAddr, msg.toAddr),
				listMessageAttachments(env, msg.id),
				getUnsubscribeUrlFromRawR2Key(env, msg.rawR2Key),
			]);

			return {
				message: { ...msg, ...contactNames },
				body: msg,
				attachments,
				unsubscribeUrl,
			};
		}),
	);

	return NextResponse.json({
		threadId: threadId || targetMessage.id,
		count: hydrated.length,
		messages: hydrated,
	});
}
