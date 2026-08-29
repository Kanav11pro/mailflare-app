import { NextResponse } from "next/server";
import { and, desc, eq, or, asc } from "drizzle-orm";
import { getEnv } from "@/lib/cloudflare";
import { getDb } from "@/db";
import { messages } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";

type Params = { params: Promise<{ messageId: string }> };

export async function GET(request: Request, { params }: Params) {
	const { messageId } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	const db = getDb(env);

	// 1. Fetch current message
	const [targetMessage] = await db
		.select()
		.from(messages)
		.where(and(eq(messages.id, messageId), eq(messages.userId, user.id)))
		.limit(1);

	if (!targetMessage) {
		return NextResponse.json({ error: "Message not found" }, { status: 404 });
	}

	// 2. Normalize subject to group replies: "Re: Hello" -> "Hello", "Fwd: Hello" -> "Hello"
	const normalizedSubject = targetMessage.subject
		? targetMessage.subject.replace(/^(re|fwd|fw):\s*/i, "").trim().toLowerCase()
		: "";

	// 3. Find all messages sharing the same threadId, or having the same normalized subject and same mailbox
	let threadMessages: (typeof messages.$inferSelect)[] = [];

	if (targetMessage.threadId) {
		threadMessages = await db
			.select()
			.from(messages)
			.where(
				and(
					eq(messages.userId, user.id),
					or(
						eq(messages.threadId, targetMessage.threadId),
						targetMessage.mailboxId ? eq(messages.mailboxId, targetMessage.mailboxId) : undefined,
					),
				),
			)
			.orderBy(asc(messages.createdAt));
	} else {
		threadMessages = await db
			.select()
			.from(messages)
			.where(
				and(
					eq(messages.userId, user.id),
					targetMessage.mailboxId ? eq(messages.mailboxId, targetMessage.mailboxId) : undefined,
				),
			)
			.orderBy(asc(messages.createdAt));
	}

	// Filter by thread similarity
	const matched = threadMessages.filter((m) => {
		if (m.id === targetMessage.id) return true;
		if (m.threadId && targetMessage.threadId && m.threadId === targetMessage.threadId) return true;
		if (normalizedSubject && m.subject) {
			const sub = m.subject.replace(/^(re|fwd|fw):\s*/i, "").trim().toLowerCase();
			return sub === normalizedSubject;
		}
		return false;
	});

	return NextResponse.json({
		messages: matched.length > 0 ? matched : [targetMessage],
		threadId: targetMessage.threadId || targetMessage.id,
		count: matched.length > 0 ? matched.length : 1,
	});
}
