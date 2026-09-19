/**
 * Privacy Shield: Advanced Spy Pixel & Email Tracker Neutralizer
 * Detects and strips invisible tracking pixels and spy beacons before emails reach the user.
 */

interface TrackerSignature {
	name: string;
	pattern: RegExp;
}

const TRACKER_SIGNATURES: TrackerSignature[] = [
	{ name: "Mailtrack", pattern: /mailtrack\.io|mlt01\.com/i },
	{ name: "Mixmax", pattern: /mixmax\.com|email\.mixmax\.com/i },
	{ name: "Superhuman", pattern: /superhuman\.com\/tracker/i },
	{ name: "Yesware", pattern: /yesware\.com|t\.yesware\.com/i },
	{ name: "SendGrid", pattern: /sendgrid\.net\/wf\/open|ct\.sendgrid\.net/i },
	{ name: "Mailchimp", pattern: /list-manage\.com\/track\/open|mandrillapp\.com\/track\/open/i },
	{ name: "HubSpot", pattern: /hubspotlinks\.com|hs-analytics\.net|track\.hubspot\.com/i },
	{ name: "Streak", pattern: /streak\.com\/api\/v1\/tracking/i },
	{ name: "Klaviyo", pattern: /klaviyo\.com\/open|trk\.klaviyo\.com/i },
	{ name: "ActiveCampaign", pattern: /activecampaign\.com\/track|lt\.activehosted\.com/i },
	{ name: "SalesLoft", pattern: /salesloft\.com\/email_track/i },
	{ name: "Outreach", pattern: /outreach\.io\/api\/v1\/email_track/i },
	{ name: "Mailgun", pattern: /mailgun\.org\/o\/|email\.mailgun\.net/i },
	{ name: "Sidekick", pattern: /getsidekick\.com|t\.sidekickopen\.com/i },
	{ name: "Customer.io", pattern: /track\.customer\.io/i },
	{ name: "ConvertKit", pattern: /app\.convertkit\.com\/open/i },
	{ name: "Constant Contact", pattern: /rs6\.net\/on\.jsp|constantcontact\.com/i },
	{ name: "Campaign Monitor", pattern: /cmail19\.com\/t\/|createsend1\.com/i },
	{ name: "Bananatag", pattern: /bananatag\.com/i },
	{ name: "Cirrus Insight", pattern: /cirrusinsight\.com/i },
	{ name: "OpenSpy", pattern: /emltrk\.com|pixel\.app|beacon\.kr/i },
];

export interface PrivacyShieldResult {
	cleanHtml: string;
	trackersBlockedCount: number;
	trackersBlockedDomains: string[];
}

const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function sanitizeAndNeutralizeTrackers(html: string | null | undefined): PrivacyShieldResult {
	if (!html || typeof html !== "string") {
		return {
			cleanHtml: "",
			trackersBlockedCount: 0,
			trackersBlockedDomains: [],
		};
	}

	let cleanHtml = html;
	const detectedDomains = new Set<string>();
	let trackerCount = 0;

	// 1. Scan for known tracker domain URLs in img src
	cleanHtml = cleanHtml.replace(/<img[^>]+src=["']([^"']+)["'][^>]*\/?>/gi, (match, src) => {
		for (const sig of TRACKER_SIGNATURES) {
			if (sig.pattern.test(src)) {
				detectedDomains.add(sig.name);
				trackerCount++;
				return `<!-- [Privacy Shield: Blocked ${sig.name} spy pixel] --><img src="${TRANSPARENT_PIXEL}" width="0" height="0" alt="" style="display:none;" />`;
			}
		}

		// 2. Detect 0x0 or 1x1 invisible pixel dimensions
		const hasZeroOrOneWidth = /width=["']?(0|1)(px)?["']?/i.test(match);
		const hasZeroOrOneHeight = /height=["']?(0|1)(px)?["']?/i.test(match);
		const isZeroOrOneDim = hasZeroOrOneWidth && hasZeroOrOneHeight;
		const isHiddenStyle = /style=["'][^"']*(display:\s*none|opacity:\s*0|width:\s*(0|1)px|height:\s*(0|1)px)/i.test(match);

		if (isZeroOrOneDim || isHiddenStyle) {
			detectedDomains.add("1x1 Spy Pixel");
			trackerCount++;
			return `<!-- [Privacy Shield: Blocked invisible web beacon] --><img src="${TRANSPARENT_PIXEL}" width="0" height="0" alt="" style="display:none;" />`;
		}

		return match;
	});

	return {
		cleanHtml,
		trackersBlockedCount: trackerCount,
		trackersBlockedDomains: Array.from(detectedDomains),
	};
}
