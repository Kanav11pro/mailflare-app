import type { SetupRequirementCheck } from "./types";

export function getSetupRequirementChecks(env: CloudflareEnv): SetupRequirementCheck[] {
	const hasResend = !!env.RESEND_API_KEY?.trim();
	const hasApiToken = !!env.CF_TOKEN?.trim();
	const hasGlobalKey = !!env.CF_API_KEY?.trim() && !!env.CF_EMAIL?.trim();

	return [
		{
			key: "Email provider credentials",
			configured: hasResend || hasApiToken || hasGlobalKey,
			message: "Set RESEND_API_KEY or CF_TOKEN.",
		},
		{
			key: "Email Worker configuration",
			configured: hasResend || !!env.CF_EMAIL_WORKER_NAME?.trim(),
			message: hasResend ? "Resend provider enabled" : "Set CF_EMAIL_WORKER_NAME to the deployed Worker name.",
		},
		{
			key: "D1 database",
			configured: !!env.DB,
			message: "Deploy the Worker with the DB binding from wrangler.jsonc.",
		},
	];
}
