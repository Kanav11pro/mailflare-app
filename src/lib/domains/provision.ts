import {
	createSendingSubdomain,
	enableEmailRouting,
	findZoneByHostname,
	listSendingSubdomains,
} from "@/lib/cloudflare-api";
import { isZoneApex } from "@/lib/domains/utils";
import type { DomainProvisioningResult } from "@/lib/domains/types";

export async function provisionDomainOnCloudflare(
	env: CloudflareEnv,
	hostname: string,
	options?: { enableRouting?: boolean; enableSending?: boolean },
): Promise<DomainProvisioningResult> {
	const normalized = hostname.toLowerCase().trim();
	let zone: { id: string; name: string } | null = null;
	try {
		zone = await findZoneByHostname(env, normalized);
	} catch {
		zone = null;
	}

	if (!zone) {
		// External domain (e.g. managed on Vercel / Resend)
		return {
			hostname: normalized,
			zone: { id: `ext_${normalized.replace(/[^a-z0-9]/g, "_")}`, name: normalized },
			routingEnabled: true,
			sendingEnabled: true,
			sendingSubdomainTag: null,
			routingStatus: "external",
		};
	}

	const enableRouting = options?.enableRouting ?? true;
	const enableSending = options?.enableSending ?? true;

	let routingEnabled = false;
	let sendingEnabled = false;
	let sendingSubdomainTag: string | null = null;
	let routingStatus: string | undefined;

	if (enableRouting) {
		const routingName = isZoneApex(normalized, zone.name) ? undefined : normalized;
		const routing = await enableEmailRouting(env, zone.id, routingName);
		routingEnabled = routing.enabled ?? true;
		routingStatus = routing.status;
	}

	if (enableSending) {
		if (isZoneApex(normalized, zone.name)) {
			sendingEnabled = false;
		} else {
			const subs = await listSendingSubdomains(env, zone.id);
			const existingSub = subs.find((s) => s.name === normalized);
			if (existingSub) {
				sendingSubdomainTag = existingSub.tag;
				sendingEnabled = existingSub.enabled;
			} else {
				const created = await createSendingSubdomain(env, zone.id, normalized);
				sendingSubdomainTag = created.tag;
				sendingEnabled = created.enabled;
			}
		}
	}

	return {
		hostname: normalized,
		zone,
		routingEnabled,
		sendingEnabled,
		sendingSubdomainTag,
		routingStatus,
	};
}
