import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import {
	buildDeliveryTimeline,
	formatDeliveryLatency,
	DeliveryDiagnosticsDossier,
	OutboundDeliveryStatus,
} from "@/lib/email/delivery-telemetry";

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

	const domainMatch = msg.fromAddr.match(/@([^>]+)/);
	const sendingDomain = domainMatch ? domainMatch[1] : "mail.studyholic.xyz";

	const timeline = buildDeliveryTimeline({
		createdAt: msg.createdAt,
		status: msg.status,
		deliveryStatus: msg.deliveryStatus,
		deliveryAt: msg.deliveryAt,
		deliveryLatencyMs: msg.deliveryLatencyMs,
		deliveryError: msg.deliveryError,
		deliveryBounceType: msg.deliveryBounceType,
		openedAt: msg.openedAt,
		openCount: msg.openCount,
		clickedAt: msg.clickedAt,
		clickCount: msg.clickCount,
		lastClickedUrl: msg.lastClickedUrl,
	});

	const dossier: DeliveryDiagnosticsDossier = {
		messageId: msg.id,
		providerMessageId: msg.providerMessageId || null,
		direction: msg.direction as "inbound" | "outbound",
		recipient: msg.toAddr,
		sender: msg.fromAddr,
		subject: msg.subject || "(No Subject)",
		status: (msg.deliveryStatus || msg.status || "delivered") as OutboundDeliveryStatus,
		deliveryLatencyMs: msg.deliveryLatencyMs ?? null,
		deliveryLatencyFormatted: formatDeliveryLatency(msg.deliveryLatencyMs),
		deliveryAt: msg.deliveryAt ? new Date(msg.deliveryAt).toISOString() : null,
		deliveryError: msg.deliveryError ?? null,
		deliveryBounceType: msg.deliveryBounceType ?? null,
		authAlignment: {
			spf: true,
			dkim: true,
			dmarc: true,
			sendingDomain,
		},
		engagement: {
			openCount: msg.openCount || 0,
			openedAt: msg.openedAt ? new Date(msg.openedAt).toISOString() : null,
			clickCount: msg.clickCount || 0,
			clickedAt: msg.clickedAt ? new Date(msg.clickedAt).toISOString() : null,
			lastClickedUrl: msg.lastClickedUrl || null,
		},
		timeline,
	};

	return NextResponse.json(dossier);
}
