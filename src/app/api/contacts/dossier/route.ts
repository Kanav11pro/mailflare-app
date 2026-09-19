import { and, desc, eq, like, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { contacts, messageAttachments, messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { normalizeEmailAddress } from "@/lib/email/address";
import { getContactByEmail, toContactDetails } from "../utils";

export async function GET(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const url = new URL(request.url);
	const rawEmail = url.searchParams.get("email")?.trim() ?? "";
	const email = normalizeEmailAddress(rawEmail);

	if (!email) {
		return NextResponse.json({ error: "Email address is required" }, { status: 400 });
	}

	const db = getDb(env);

	// 1. Contact profile
	const storedContact = toContactDetails(await getContactByEmail(db, user.id, email));

	// 2. Query messages involving this sender/recipient
	const userMessages = await db
		.select({
			id: messages.id,
			direction: messages.direction,
			fromAddr: messages.fromAddr,
			toAddr: messages.toAddr,
			subject: messages.subject,
			snippet: messages.snippet,
			spamScore: messages.spamScore,
			spamVerdict: messages.spamVerdict,
			trackersBlockedCount: messages.trackersBlockedCount,
			createdAt: messages.createdAt,
		})
		.from(messages)
		.where(
			and(
				eq(messages.userId, user.id),
				or(
					like(messages.fromAddr, `%${email}%`),
					like(messages.toAddr, `%${email}%`),
				),
			),
		)
		.orderBy(desc(messages.createdAt));

	let totalReceived = 0;
	let totalSent = 0;
	let totalTrackersBlocked = 0;
	let spamScoreSum = 0;
	let spamScoreCount = 0;
	let firstContactAt: Date | null = null;
	let lastContactAt: Date | null = null;
	let lastSpamVerdict: string | null = null;

	const messageIds: string[] = [];

	for (const msg of userMessages) {
		messageIds.push(msg.id);
		const isReceived = msg.direction === "inbound" || msg.fromAddr.toLowerCase().includes(email.toLowerCase());

		if (isReceived) {
			totalReceived++;
			totalTrackersBlocked += msg.trackersBlockedCount || 0;
			if (msg.spamScore !== null && msg.spamScore !== undefined) {
				spamScoreSum += msg.spamScore;
				spamScoreCount++;
			}
			if (!lastSpamVerdict && msg.spamVerdict) {
				lastSpamVerdict = msg.spamVerdict;
			}
		} else {
			totalSent++;
		}

		const msgDate = new Date(msg.createdAt);
		if (!lastContactAt || msgDate > lastContactAt) {
			lastContactAt = msgDate;
		}
		if (!firstContactAt || msgDate < firstContactAt) {
			firstContactAt = msgDate;
		}
	}

	// 3. Shared attachments
	let sharedAttachments: Array<{
		id: string;
		messageId: string;
		filename: string;
		contentType: string;
		size: number;
		createdAt: Date;
	}> = [];

	if (messageIds.length > 0) {
		// Take attachments from the last 50 messages
		const subsetIds = messageIds.slice(0, 50);
		const attachmentRows = await db
			.select({
				id: messageAttachments.id,
				messageId: messageAttachments.messageId,
				filename: messageAttachments.filename,
				contentType: messageAttachments.contentType,
				size: messageAttachments.size,
				createdAt: messageAttachments.createdAt,
			})
			.from(messageAttachments)
			.where(eq(messageAttachments.disposition, "attachment"))
			.orderBy(desc(messageAttachments.createdAt))
			.limit(20);

		// Filter for matching messageIds
		const idSet = new Set(subsetIds);
		sharedAttachments = attachmentRows.filter((att) => idSet.has(att.messageId));
	}

	// Extract sender domain for trust assessment
	const domainMatch = email.match(/@([^>]+)/);
	const senderDomain = domainMatch ? domainMatch[1] : "";

	const averageSpamScore = spamScoreCount > 0 ? Math.round(spamScoreSum / spamScoreCount) : 0;
	const trustLevel = averageSpamScore >= 70 ? "untrusted" : averageSpamScore >= 30 ? "suspicious" : "trusted";

	return NextResponse.json({
		contact: storedContact ?? {
			email,
			displayName: null,
			hasAvatar: false,
			source: null,
			blocked: false,
			lastSeenAt: lastContactAt,
		},
		stats: {
			totalReceived,
			totalSent,
			totalExchanged: totalReceived + totalSent,
			firstContactAt,
			lastContactAt,
			senderDomain,
			averageSpamScore,
			lastSpamVerdict: lastSpamVerdict || "inbox",
			trustLevel,
			totalTrackersBlocked,
		},
		sharedAttachments,
		recentMessages: userMessages.slice(0, 5).map((m) => ({
			id: m.id,
			subject: m.subject || "(No Subject)",
			snippet: m.snippet || "",
			direction: m.direction,
			createdAt: m.createdAt,
		})),
	});
}
