/**
 * Where the app is running. On Cloudflare Workers the bindings come from
 * OpenNext; the self-hosted Node server builds an equivalent env object and
 * publishes it on globalThis before Next starts, so route handlers reach it
 * the same way.
 */
declare global {
	var __mailflareNodeEnv: CloudflareEnv | undefined;
}

export function getNodeEnv(): CloudflareEnv | undefined {
	return globalThis.__mailflareNodeEnv;
}

export function isNodeRuntime(env?: CloudflareEnv | { MAILFLARE_RUNTIME?: string }): boolean {
	return (env ?? getNodeEnv())?.MAILFLARE_RUNTIME === "node";
}

/** True when the app can talk to the Cloudflare API to manage zones and routing. */
export function hasCloudflareCredentials(env: { CF_TOKEN?: string; CF_API_KEY?: string; CF_EMAIL?: string }): boolean {
	return !!env.CF_TOKEN?.trim() || (!!env.CF_API_KEY?.trim() && !!env.CF_EMAIL?.trim());
}
