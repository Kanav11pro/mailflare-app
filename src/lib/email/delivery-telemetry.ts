/**
 * Delivery Telemetry & Outbound Analytics Engine
 * Parses Resend webhook event payloads, computes delivery latencies, and generates diagnostic dossiers.
 */

export type OutboundDeliveryStatus =
	| "queued"
	| "sent"
	| "delivered"
	| "bounced"
	| "complained"
	| "failed";

export interface ResendOutboundWebhookData {
	email_id: string;
	from?: string;
	to?: string[];
	subject?: string;
	message?: string;
	bounce_type?: "Permanent" | "Transient" | string;
	click?: {
		ipAddress?: string;
		link?: string;
		timestamp?: string;
	};
	url?: string;
	[key: string]: any;
}

export interface ResendWebhookPayload {
	type: string;
	created_at?: string;
	data?: ResendOutboundWebhookData;
}

export interface DeliveryTimelineMilestone {
	id: string;
	title: string;
	description: string;
	timestamp: string | null;
	status: "completed" | "current" | "failed" | "pending";
	type: "created" | "sent" | "delivered" | "opened" | "clicked" | "bounced";
}

export interface DeliveryDiagnosticsDossier {
	messageId: string;
	providerMessageId: string | null;
	direction: "inbound" | "outbound";
	recipient: string;
	sender: string;
	subject: string;
	status: OutboundDeliveryStatus;
	deliveryLatencyMs: number | null;
	deliveryLatencyFormatted: string | null;
	deliveryAt: string | null;
	deliveryError: string | null;
	deliveryBounceType: string | null;
	authAlignment: {
		spf: boolean;
		dkim: boolean;
		dmarc: boolean;
		sendingDomain: string;
	};
	engagement: {
		openCount: number;
		openedAt: string | null;
		clickCount: number;
		clickedAt: string | null;
		lastClickedUrl: string | null;
	};
	timeline: DeliveryTimelineMilestone[];
}

/**
 * Formats a duration in milliseconds to a human-readable latency string.
 */
export function formatDeliveryLatency(ms: number | null | undefined): string | null {
	if (ms === null || ms === undefined || Number.isNaN(ms) || ms < 0) {
		return null;
	}
	if (ms < 1000) {
		return `${Math.round(ms)}ms`;
	}
	const seconds = (ms / 1000).toFixed(1);
	return `${seconds}s`;
}

/**
 * Calculates delivery latency between creation time and event timestamp.
 */
export function calculateDeliveryLatency(
	createdAt: Date | string | number,
	eventAt: Date | string | number = new Date(),
): number {
	const start = new Date(createdAt).getTime();
	const end = new Date(eventAt).getTime();
	if (Number.isNaN(start) || Number.isNaN(end)) return 0;
	return Math.max(0, end - start);
}

/**
 * Generates an end-to-end chronological delivery timeline for a message.
 */
export function buildDeliveryTimeline(message: {
	createdAt: Date | string | number;
	status: string;
	deliveryStatus?: string | null;
	deliveryAt?: Date | string | number | null;
	deliveryLatencyMs?: number | null;
	deliveryError?: string | null;
	deliveryBounceType?: string | null;
	openedAt?: Date | string | number | null;
	openCount?: number;
	clickedAt?: Date | string | number | null;
	clickCount?: number;
	lastClickedUrl?: string | null;
}): DeliveryTimelineMilestone[] {
	const createdTime = new Date(message.createdAt).toISOString();
	const isBounced = message.deliveryStatus === "bounced" || message.status === "bounced";
	const isDelivered =
		message.deliveryStatus === "delivered" ||
		message.status === "delivered" ||
		!!message.deliveryAt ||
		!!message.openedAt ||
		!!message.clickedAt;
	const isOpened = (message.openCount ?? 0) > 0 || !!message.openedAt;
	const isClicked = (message.clickCount ?? 0) > 0 || !!message.clickedAt;

	const timeline: DeliveryTimelineMilestone[] = [
		{
			id: "m_created",
			title: "Composed & Queued",
			description: "Message encrypted and scheduled via Mailflare Edge pipeline.",
			timestamp: createdTime,
			status: "completed",
			type: "created",
		},
		{
			id: "m_sent",
			title: "Dispatched via Resend",
			description: "Authenticated with Apex DMARC alignment (mail.studyholic.xyz).",
			timestamp: createdTime,
			status: "completed",
			type: "sent",
		},
	];

	if (isBounced) {
		timeline.push({
			id: "m_bounced",
			title: `Delivery Bounced (${message.deliveryBounceType || "Permanent"})`,
			description: message.deliveryError || "Recipient MX rejected message.",
			timestamp: message.deliveryAt ? new Date(message.deliveryAt).toISOString() : createdTime,
			status: "failed",
			type: "bounced",
		});
		return timeline;
	}

	if (isDelivered) {
		const latencyStr = formatDeliveryLatency(message.deliveryLatencyMs);
		timeline.push({
			id: "m_delivered",
			title: latencyStr ? `Delivered to Inbox (${latencyStr})` : "Delivered to Recipient MX",
			description: "Handshake completed successfully with recipient mail server.",
			timestamp: message.deliveryAt ? new Date(message.deliveryAt).toISOString() : createdTime,
			status: "completed",
			type: "delivered",
		});
	} else {
		timeline.push({
			id: "m_delivered",
			title: "In Transit",
			description: "Negotiating SMTP delivery with recipient MX...",
			timestamp: null,
			status: "current",
			type: "delivered",
		});
	}

	if (isOpened) {
		timeline.push({
			id: "m_opened",
			title: `Opened (${message.openCount} ${message.openCount === 1 ? "time" : "times"})`,
			description: "Recipient opened email client and viewed message content.",
			timestamp: message.openedAt ? new Date(message.openedAt).toISOString() : null,
			status: "completed",
			type: "opened",
		});
	}

	if (isClicked) {
		timeline.push({
			id: "m_clicked",
			title: `Link Clicked (${message.clickCount} ${message.clickCount === 1 ? "click" : "clicks"})`,
			description: message.lastClickedUrl
				? `Interacted with: ${message.lastClickedUrl}`
				: "Recipient clicked embedded action link.",
			timestamp: message.clickedAt ? new Date(message.clickedAt).toISOString() : null,
			status: "completed",
			type: "clicked",
		});
	}

	return timeline;
}
