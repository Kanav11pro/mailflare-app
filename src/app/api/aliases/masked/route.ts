import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { domains, mailboxes, maskedAliases } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { newId } from "@/lib/ids";

function generateSlug(prefix?: string): string {
	const chars = "abcdefghjkmnpqrstuvwxyz23456789";
	let randomPart = "";
	for (let i = 0; i < 6; i++) {
		randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	const cleanPrefix = prefix
		? prefix
				.toLowerCase()
				.replace(/[^a-z0-9]/g, "")
				.slice(0, 10)
		: "";
	return cleanPrefix ? `${cleanPrefix}.${randomPart}` : `mask.${randomPart}`;
}

export async function GET(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const db = getDb(env);
		const rows = await db
			.select({
				id: maskedAliases.id,
				userId: maskedAliases.userId,
				mailboxId: maskedAliases.mailboxId,
				domainId: maskedAliases.domainId,
				localPart: maskedAliases.localPart,
				label: maskedAliases.label,
				status: maskedAliases.status,
				forwardCount: maskedAliases.forwardCount,
				blockedCount: maskedAliases.blockedCount,
				lastReceivedAt: maskedAliases.lastReceivedAt,
				expiresAt: maskedAliases.expiresAt,
				createdAt: maskedAliases.createdAt,
				domainHostname: domains.hostname,
				mailboxLocalPart: mailboxes.localPart,
				mailboxDisplayName: mailboxes.displayName,
			})
			.from(maskedAliases)
			.leftJoin(domains, eq(maskedAliases.domainId, domains.id))
			.leftJoin(mailboxes, eq(maskedAliases.mailboxId, mailboxes.id))
			.where(eq(maskedAliases.userId, user.id))
			.orderBy(desc(maskedAliases.createdAt));

		return NextResponse.json({ aliases: rows });
	} catch (err: any) {
		console.error("Failed to list masked aliases:", err);
		return NextResponse.json({ error: err.message || "Failed to list masked aliases" }, { status: 500 });
	}
}

export async function POST(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			label: string;
			mailboxId?: string;
			domainId?: string;
			customLocalPart?: string;
			duration?: "24h" | "7d" | "30d" | "permanent";
		};

		if (!body.label || typeof body.label !== "string") {
			return NextResponse.json({ error: "Label is required" }, { status: 400 });
		}

		const db = getDb(env);

		// Resolve domain
		let domainId = body.domainId;
		if (!domainId) {
			const [activeDomain] = await db
				.select({ id: domains.id })
				.from(domains)
				.where(eq(domains.status, "active"))
				.limit(1);
			if (!activeDomain) {
				return NextResponse.json({ error: "No active domain available" }, { status: 400 });
			}
			domainId = activeDomain.id;
		}

		// Resolve mailbox
		let mailboxId = body.mailboxId;
		if (!mailboxId) {
			const [primaryMailbox] = await db
				.select({ id: mailboxes.id })
				.from(mailboxes)
				.where(and(eq(mailboxes.userId, user.id), eq(mailboxes.type, "personal")))
				.limit(1);
			if (!primaryMailbox) {
				const [anyMailbox] = await db
					.select({ id: mailboxes.id })
					.from(mailboxes)
					.where(eq(mailboxes.userId, user.id))
					.limit(1);
				if (!anyMailbox) {
					return NextResponse.json({ error: "No mailbox found for user" }, { status: 400 });
				}
				mailboxId = anyMailbox.id;
			} else {
				mailboxId = primaryMailbox.id;
			}
		}

		const localPart = (body.customLocalPart?.trim() || generateSlug(body.label)).toLowerCase();

		// Calculate expiration date
		let expiresAt: Date | null = null;
		const now = Date.now();
		if (body.duration === "24h") {
			expiresAt = new Date(now + 24 * 60 * 60 * 1000);
		} else if (body.duration === "7d") {
			expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);
		} else if (body.duration === "30d") {
			expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000);
		}

		const aliasId = newId("msk");
		await db.insert(maskedAliases).values({
			id: aliasId,
			userId: user.id,
			mailboxId,
			domainId,
			localPart,
			label: body.label.trim(),
			status: "active",
			forwardCount: 0,
			blockedCount: 0,
			expiresAt,
			createdAt: new Date(),
		});

		const [created] = await db
			.select({
				id: maskedAliases.id,
				userId: maskedAliases.userId,
				mailboxId: maskedAliases.mailboxId,
				domainId: maskedAliases.domainId,
				localPart: maskedAliases.localPart,
				label: maskedAliases.label,
				status: maskedAliases.status,
				forwardCount: maskedAliases.forwardCount,
				blockedCount: maskedAliases.blockedCount,
				lastReceivedAt: maskedAliases.lastReceivedAt,
				expiresAt: maskedAliases.expiresAt,
				createdAt: maskedAliases.createdAt,
				domainHostname: domains.hostname,
			})
			.from(maskedAliases)
			.leftJoin(domains, eq(maskedAliases.domainId, domains.id))
			.where(eq(maskedAliases.id, aliasId))
			.limit(1);

		return NextResponse.json({ alias: created });
	} catch (err: any) {
		console.error("Failed to create masked alias:", err);
		return NextResponse.json({ error: err.message || "Failed to create masked alias" }, { status: 500 });
	}
}

export async function PATCH(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			aliasId: string;
			status?: "active" | "paused" | "killed";
			label?: string;
		};

		if (!body.aliasId) {
			return NextResponse.json({ error: "Alias ID is required" }, { status: 400 });
		}

		const db = getDb(env);
		const updates: any = {};
		if (body.status) updates.status = body.status;
		if (body.label) updates.label = body.label.trim();

		if (Object.keys(updates).length === 0) {
			return NextResponse.json({ error: "No changes requested" }, { status: 400 });
		}

		await db
			.update(maskedAliases)
			.set(updates)
			.where(and(eq(maskedAliases.id, body.aliasId), eq(maskedAliases.userId, user.id)));

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error("Failed to update masked alias:", err);
		return NextResponse.json({ error: err.message || "Failed to update alias" }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const url = new URL(request.url);
		let aliasId = url.searchParams.get("aliasId");
		if (!aliasId) {
			const body = (await request.json().catch(() => ({}))) as { aliasId?: string };
			aliasId = body.aliasId ?? null;
		}

		if (!aliasId) {
			return NextResponse.json({ error: "Alias ID is required" }, { status: 400 });
		}

		const db = getDb(env);
		await db
			.delete(maskedAliases)
			.where(and(eq(maskedAliases.id, aliasId), eq(maskedAliases.userId, user.id)));

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error("Failed to delete masked alias:", err);
		return NextResponse.json({ error: err.message || "Failed to delete alias" }, { status: 500 });
	}
}
