import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { devicePushTokens } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { newId } from "@/lib/ids";

export async function POST(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			token?: string;
			platform?: "ios" | "android" | "web";
			deviceName?: string;
		};

		if (!body.token || typeof body.token !== "string" || !body.token.trim()) {
			return NextResponse.json({ error: "Valid token is required" }, { status: 400 });
		}

		const token = body.token.trim();
		const platform = body.platform === "ios" ? "ios" : body.platform === "web" ? "web" : "android";
		const deviceName = body.deviceName?.slice(0, 100) ?? null;

		const db = getDb(env);

		// Check if token already exists for this user
		const [existing] = await db
			.select({ id: devicePushTokens.id })
			.from(devicePushTokens)
			.where(
				and(
					eq(devicePushTokens.userId, user.id),
					eq(devicePushTokens.token, token),
				),
			)
			.limit(1);

		if (existing) {
			await db
				.update(devicePushTokens)
				.set({
					platform,
					deviceName,
					updatedAt: new Date(),
				})
				.where(eq(devicePushTokens.id, existing.id));
		} else {
			await db.insert(devicePushTokens).values({
				id: newId("dpt"),
				userId: user.id,
				token,
				platform,
				deviceName,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error("Failed to register push token:", err);
		return NextResponse.json({ error: err.message || "Failed to register push token" }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { token?: string };
		if (!body.token) {
			return NextResponse.json({ error: "Token is required" }, { status: 400 });
		}

		const db = getDb(env);
		await db
			.delete(devicePushTokens)
			.where(
				and(
					eq(devicePushTokens.userId, user.id),
					eq(devicePushTokens.token, body.token),
				),
			);

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error("Failed to unregister push token:", err);
		return NextResponse.json({ error: err.message || "Failed to unregister push token" }, { status: 500 });
	}
}
