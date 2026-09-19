import { inArray, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { devicePushTokens } from "@/db/schema";

export interface PushNotificationPayload {
	title: string;
	body: string;
	data?: {
		messageId?: string;
		mailboxId?: string;
		threadId?: string | null;
		type?: string;
		[key: string]: any;
	};
	sound?: string;
	badge?: number;
}

export async function sendPushNotificationToUsers(
	env: CloudflareEnv,
	userIds: string[],
	payload: PushNotificationPayload,
): Promise<void> {
	if (!userIds || userIds.length === 0) return;

	try {
		const db = getDb(env);
		const tokens = await db
			.select({
				id: devicePushTokens.id,
				token: devicePushTokens.token,
				userId: devicePushTokens.userId,
			})
			.from(devicePushTokens)
			.where(inArray(devicePushTokens.userId, userIds));

		if (tokens.length === 0) return;

		const messages = tokens.map((t) => ({
			to: t.token,
			sound: payload.sound ?? "default",
			title: payload.title,
			body: payload.body,
			data: payload.data ?? {},
			priority: "high",
			channelId: "default",
		}));

		// Expo Push API accepts up to 100 messages per chunk
		const response = await fetch("https://exp.host/--/api/v2/push/send", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				"Accept-Encoding": "gzip, deflate",
			},
			body: JSON.stringify(messages),
		});

		if (!response.ok) {
			console.warn(`Expo push API returned status ${response.status}: ${await response.text()}`);
			return;
		}

		const result: any = await response.json();
		if (result && Array.isArray(result.data)) {
			// Clean up unregistered or invalid tokens
			const invalidTokenIds: string[] = [];
			result.data.forEach((ticket: any, index: number) => {
				if (
					ticket.status === "error" &&
					(ticket.details?.error === "DeviceNotRegistered" ||
						ticket.message?.includes("not registered"))
				) {
					if (tokens[index]) {
						invalidTokenIds.push(tokens[index].id);
					}
				}
			});

			if (invalidTokenIds.length > 0) {
				await db
					.delete(devicePushTokens)
					.where(inArray(devicePushTokens.id, invalidTokenIds));
			}
		}
	} catch (err) {
		console.error("Failed to send push notifications:", err);
	}
}
