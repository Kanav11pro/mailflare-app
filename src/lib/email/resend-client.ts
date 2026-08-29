import type { AttachmentContent } from "./attachment-types";

export interface SendEmailViaResendOptions {
	apiKey: string;
	from: string;
	to: string | string[];
	subject: string;
	html?: string | null;
	text?: string | null;
	replyTo?: string | string[] | null;
	attachments?: AttachmentContent[];
}

export interface ResendSendResponse {
	id: string;
}

export async function sendEmailViaResend(
	options: SendEmailViaResendOptions,
): Promise<ResendSendResponse> {
	const { apiKey, from, to, subject, html, text, replyTo, attachments } = options;

	if (!apiKey) {
		throw new Error("Resend API key is not configured");
	}

	const formattedAttachments = (attachments ?? []).map((att) => {
		const base64Content = Buffer.from(att.content).toString("base64");
		return {
			filename: att.filename,
			content: base64Content,
			content_type: att.type,
			disposition: att.disposition === "inline" ? "inline" : "attachment",
			content_id: att.contentId ?? undefined,
		};
	});

	const payload: Record<string, unknown> = {
		from,
		to: Array.isArray(to) ? to : [to],
		subject,
	};

	if (html) payload.html = html;
	if (text) payload.text = text;
	if (replyTo) payload.reply_to = Array.isArray(replyTo) ? replyTo : [replyTo];
	if (formattedAttachments.length > 0) payload.attachments = formattedAttachments;

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	const json = (await response.json()) as { id?: string; message?: string; name?: string; statusCode?: number };

	if (!response.ok || !json.id) {
		const errorMessage = json.message || json.name || `Resend API failed with status ${response.status}`;
		throw new Error(`Resend send error: ${errorMessage}`);
	}

	return { id: json.id };
}
