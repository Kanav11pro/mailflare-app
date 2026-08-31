import { authFetch, getClientSessionToken } from "@/lib/auth/client";
import type { MailboxOption } from "./mailbox-provider";

let mailboxesCache: MailboxOption[] | null = null;
let mailboxesCacheSessionToken: string | null = null;
let mailboxesRequest: Promise<MailboxOption[]> | null = null;
let mailboxesRequestSessionToken: string | null = null;
let cacheGeneration = 0;
export const SELECTED_MAILBOX_STORAGE_KEY = "selected-mailbox-id";

export function clearMailboxesCache() {
	cacheGeneration += 1;
	mailboxesCache = null;
	mailboxesCacheSessionToken = null;
	mailboxesRequest = null;
	mailboxesRequestSessionToken = null;
}

export function clearMailboxClientState() {
	clearMailboxesCache();
	if (typeof window !== "undefined") {
		localStorage.removeItem(SELECTED_MAILBOX_STORAGE_KEY);
	}
}

export async function fetchMailboxOptions(force = false): Promise<MailboxOption[]> {
	const sessionToken = getClientSessionToken();
	if (!force && mailboxesCache && mailboxesCacheSessionToken === sessionToken) return mailboxesCache;
	if (!force && mailboxesRequest && mailboxesRequestSessionToken === sessionToken) return mailboxesRequest;

	const requestGeneration = cacheGeneration;
	mailboxesRequestSessionToken = sessionToken;
	mailboxesRequest = authFetch("/api/mailboxes")
		.then(async (res) => {
			if (!res.ok) return { mailboxes: [] };
			const text = await res.text();
			if (!text) return { mailboxes: [] };
			try {
				return JSON.parse(text) as { mailboxes?: MailboxOption[] };
			} catch {
				return { mailboxes: [] };
			}
		})
		.then((data) => {
			const items = (data.mailboxes ?? []).map((m) => ({
				id: m.id,
				localPart: m.localPart,
				hostname: m.hostname,
				displayName: m.displayName,
				signature: m.signature,
				autoReplyEnabled: m.autoReplyEnabled,
				autoReplySubject: m.autoReplySubject,
				autoReplyBody: m.autoReplyBody,
				hasAvatar: m.hasAvatar,
				type: m.type,
				permission: m.permission,
				isPrimary: m.isPrimary,
				senderAddresses: m.senderAddresses,
			}));
			if (requestGeneration === cacheGeneration) {
				mailboxesCache = items;
				mailboxesCacheSessionToken = sessionToken;
			}
			return items;
		})
		.catch(() => [] as MailboxOption[])
		.finally(() => {
			if (requestGeneration === cacheGeneration) {
				mailboxesRequest = null;
				mailboxesRequestSessionToken = null;
			}
		});

	return mailboxesRequest;
}
