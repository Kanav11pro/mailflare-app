import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { requireUser } from "@/lib/auth/cookies";
import { getDomainForUser } from "@/lib/domains/service";
import { checkDomainDnsHealth } from "@/lib/dns/health-check";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);

	const domain = await getDomainForUser(env, user.id, id);
	if (!domain) {
		return NextResponse.json({ error: "Domain not found" }, { status: 404 });
	}

	const health = await checkDomainDnsHealth(domain.hostname);
	return NextResponse.json({ health });
}
