import { NextResponse } from "next/server";
import { and, or, eq, like, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { contacts } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { normalizeEmailAddress } from "@/lib/email/address";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";
import { getPersonalIdentityForAddress, syncPersonalIdentity } from "@/lib/profile/sync";
import { getContactId } from "@/lib/contacts/utils";
import type { ContactRequestInput } from "./types";
import { getContactByEmail, saveManualContactName, toContactDetails } from "./utils";

export async function GET(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	const url = new URL(request.url);
	const addressParam = url.searchParams.get("address");

	// 1. Single Contact Lookup
	if (addressParam) {
		const email = normalizeEmailAddress(addressParam);
		const mailboxId = url.searchParams.get("mailboxId");

		const db = getDb(env);
		let targetUserId = user.id;

		if (mailboxId) {
			const access = await getMailboxAccessLevel(db, user, mailboxId);
			if (!access?.canRead) {
				return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
			}
			targetUserId = access.mailbox.userId;
		}

		const storedContact = toContactDetails(await getContactByEmail(db, targetUserId, email));
		const account = await getPersonalIdentityForAddress(db, targetUserId, email);
		const contact = account
			? {
					...(storedContact ?? {}),
					email,
					displayName: account.name,
					hasAvatar: !!account.avatarKey,
					source: "manual" as const,
					blocked: storedContact?.blocked ?? false,
					lastSeenAt: storedContact?.lastSeenAt ?? null,
				}
			: storedContact;

		return NextResponse.json({
			contact: contact ?? {
				email,
				displayName: null,
				hasAvatar: false,
				source: null,
				blocked: false,
				lastSeenAt: null,
			},
		});
	}

	// 2. Directory Listing: GET /api/contacts?q=...
	const db = getDb(env);
	const query = url.searchParams.get("q")?.trim();

	let conditions = eq(contacts.userId, user.id);

	if (query) {
		const searchPattern = `%${query}%`;
		conditions = and(
			eq(contacts.userId, user.id),
			or(
				like(contacts.displayName, searchPattern),
				like(contacts.email, searchPattern),
			),
		)!;
	}

	const rows = await db
		.select()
		.from(contacts)
		.where(conditions)
		.orderBy(desc(contacts.lastSeenAt), desc(contacts.createdAt))
		.limit(100);

	return NextResponse.json({
		contacts: rows.map((r) => ({
			id: r.id,
			userId: r.userId,
			email: r.email,
			displayName: r.displayName,
			avatarKey: r.avatarKey,
			source: r.source,
			blocked: r.blocked,
			lastSeenAt: r.lastSeenAt ? r.lastSeenAt.toISOString() : null,
			createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
		})),
	});
}

export async function POST(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	const body = (await request.json()) as { email: string; displayName?: string };

	const email = normalizeEmailAddress(body.email ?? "");
	if (!email || !email.includes("@")) {
		return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
	}

	const displayName = body.displayName?.trim() || null;
	const db = getDb(env);

	const existing = await getContactByEmail(db, user.id, email);
	if (existing) {
		await db
			.update(contacts)
			.set({
				displayName: displayName || existing.displayName,
				source: "manual",
			})
			.where(eq(contacts.id, existing.id));

		return NextResponse.json({
			contact: {
				...existing,
				displayName: displayName || existing.displayName,
				source: "manual",
			},
		});
	}

	const id = getContactId(user.id, email);
	const newContact = {
		id,
		userId: user.id,
		email,
		displayName,
		source: "manual" as const,
		blocked: false,
		lastSeenAt: new Date(),
		createdAt: new Date(),
	};

	await db.insert(contacts).values(newContact);

	return NextResponse.json({
		contact: {
			...newContact,
			lastSeenAt: newContact.lastSeenAt.toISOString(),
			createdAt: newContact.createdAt.toISOString(),
		},
	});
}

export async function DELETE(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	const url = new URL(request.url);
	const emailParam = url.searchParams.get("email");
	const idParam = url.searchParams.get("id");

	if (!emailParam && !idParam) {
		return NextResponse.json({ error: "Contact email or ID is required" }, { status: 400 });
	}

	const db = getDb(env);

	if (emailParam) {
		const normalized = normalizeEmailAddress(emailParam);
		await db
			.delete(contacts)
			.where(and(eq(contacts.userId, user.id), eq(contacts.email, normalized)));
	} else if (idParam) {
		await db
			.delete(contacts)
			.where(and(eq(contacts.userId, user.id), eq(contacts.id, idParam)));
	}

	return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	const body = (await request.json()) as ContactRequestInput;
	const email = normalizeEmailAddress(body.address ?? "");
	const displayName = body.displayName?.trim() ?? "";

	if (!email || !displayName || displayName.length > 100) {
		return NextResponse.json({ error: "A valid contact name is required" }, { status: 400 });
	}

	const db = getDb(env);

	if (body.mailboxId) {
		const access = await getMailboxAccessLevel(db, user, body.mailboxId);
		if (!access?.canManage) {
			return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
		}
	}

	const account = await getPersonalIdentityForAddress(db, user.id, email);
	if (account) {
		if (account.userId !== user.id) {
			return NextResponse.json({ error: "Only the account owner can change this contact" }, { status: 403 });
		}
		await syncPersonalIdentity(db, {
			userId: account.userId,
			name: displayName,
			avatarKey: account.avatarKey,
		});
	}

	const contact = toContactDetails(await saveManualContactName(db, {
		userId: user.id,
		email,
		displayName,
	}));

	return NextResponse.json({ contact });
}
