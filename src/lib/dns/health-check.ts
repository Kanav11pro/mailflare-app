export interface DnsRecordCheck {
	type: "MX" | "SPF" | "DKIM" | "DMARC";
	name: string;
	status: "pass" | "warn" | "fail";
	foundValues: string[];
	expectedValue: string;
	recommendation: string;
	copyValue: string;
	copyName: string;
}

export interface DomainHealthScore {
	hostname: string;
	score: number;
	status: "excellent" | "good" | "fair" | "action_needed";
	checks: DnsRecordCheck[];
	checkedAt: string;
}

async function queryDns(name: string, type: "MX" | "TXT"): Promise<string[]> {
	try {
		const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
			headers: { Accept: "application/dns-json" },
		});
		if (!res.ok) return [];
		const data = (await res.json()) as { Answer?: Array<{ data: string }> };
		return (data.Answer ?? []).map((ans) => ans.data.replace(/^"|"$/g, "").trim());
	} catch {
		return [];
	}
}

export async function checkDomainDnsHealth(hostname: string): Promise<DomainHealthScore> {
	const normalized = hostname.toLowerCase().trim();

	// Parallel DoH queries
	const [mxAnswers, txtAnswers, dkimAnswers, dmarcAnswers] = await Promise.all([
		queryDns(normalized, "MX"),
		queryDns(normalized, "TXT"),
		queryDns(`resend._domainkey.${normalized}`, "TXT"),
		queryDns(`_dmarc.${normalized}`, "TXT"),
	]);

	const spfAnswers = txtAnswers.filter((txt) => txt.toLowerCase().includes("v=spf1"));
	const dkimFound = dkimAnswers.filter((txt) => txt.toLowerCase().includes("k=rsa") || txt.toLowerCase().includes("p="));
	const dmarcFound = dmarcAnswers.filter((txt) => txt.toLowerCase().includes("v=dmarc1"));

	const checks: DnsRecordCheck[] = [];
	let score = 0;

	// 1. MX Record Check
	const hasMx = mxAnswers.length > 0;
	if (hasMx) {
		score += 25;
		checks.push({
			type: "MX",
			name: normalized,
			status: "pass",
			foundValues: mxAnswers,
			expectedValue: "feedback-smtp.us-east-1.amazonses.com or cloudflare.net",
			recommendation: "Incoming mail servers are properly routed.",
			copyName: normalized,
			copyValue: "feedback-smtp.us-east-1.amazonses.com",
		});
	} else {
		checks.push({
			type: "MX",
			name: normalized,
			status: "warn",
			foundValues: [],
			expectedValue: "feedback-smtp.us-east-1.amazonses.com (Priority 10)",
			recommendation: "Add an MX record pointing to feedback-smtp.us-east-1.amazonses.com so incoming emails route properly.",
			copyName: normalized,
			copyValue: "feedback-smtp.us-east-1.amazonses.com",
		});
	}

	// 2. SPF Record Check
	const hasSpf = spfAnswers.length > 0;
	if (hasSpf) {
		score += 25;
		checks.push({
			type: "SPF",
			name: normalized,
			status: "pass",
			foundValues: spfAnswers,
			expectedValue: "v=spf1 include:resend.com ~all",
			recommendation: "SPF sender authentication is active.",
			copyName: normalized,
			copyValue: "v=spf1 include:resend.com ~all",
		});
	} else {
		checks.push({
			type: "SPF",
			name: normalized,
			status: "fail",
			foundValues: [],
			expectedValue: "v=spf1 include:resend.com ~all",
			recommendation: "Add a TXT record with 'v=spf1 include:resend.com ~all' to prevent your emails landing in spam.",
			copyName: normalized,
			copyValue: "v=spf1 include:resend.com ~all",
		});
	}

	// 3. DKIM Record Check
	const hasDkim = dkimFound.length > 0 || dkimAnswers.length > 0;
	if (hasDkim) {
		score += 25;
		checks.push({
			type: "DKIM",
			name: `resend._domainkey.${normalized}`,
			status: "pass",
			foundValues: dkimAnswers,
			expectedValue: "DKIM public key verified",
			recommendation: "Cryptographic email signing is active.",
			copyName: `resend._domainkey.${normalized}`,
			copyValue: "k=rsa; p=...",
		});
	} else {
		checks.push({
			type: "DKIM",
			name: `resend._domainkey.${normalized}`,
			status: "warn",
			foundValues: [],
			expectedValue: "DKIM key from Resend Domain settings",
			recommendation: "Add the DKIM TXT record from your Resend domain settings to authenticate outbound mail signatures.",
			copyName: `resend._domainkey.${normalized}`,
			copyValue: "resend._domainkey",
		});
	}

	// 4. DMARC Record Check
	const hasDmarc = dmarcFound.length > 0;
	if (hasDmarc) {
		score += 25;
		checks.push({
			type: "DMARC",
			name: `_dmarc.${normalized}`,
			status: "pass",
			foundValues: dmarcFound,
			expectedValue: "v=DMARC1; p=none;",
			recommendation: "DMARC security policy is active.",
			copyName: `_dmarc.${normalized}`,
			copyValue: "v=DMARC1; p=none;",
		});
	} else {
		checks.push({
			type: "DMARC",
			name: `_dmarc.${normalized}`,
			status: "warn",
			foundValues: [],
			expectedValue: "v=DMARC1; p=none;",
			recommendation: "Add a TXT record at '_dmarc' with 'v=DMARC1; p=none;' for 100% inbox placement on Gmail & Yahoo.",
			copyName: `_dmarc.${normalized}`,
			copyValue: "v=DMARC1; p=none;",
		});
	}

	let status: DomainHealthScore["status"] = "excellent";
	if (score < 50) status = "action_needed";
	else if (score < 75) status = "fair";
	else if (score < 100) status = "good";

	return {
		hostname: normalized,
		score,
		status,
		checks,
		checkedAt: new Date().toISOString(),
	};
}
