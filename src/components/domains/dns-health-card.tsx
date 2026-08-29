"use client";

import React, { useEffect, useState } from "react";
import {
	ShieldCheck,
	AlertTriangle,
	XCircle,
	CheckCircle2,
	RefreshCw,
	Copy,
	Check,
	Activity,
} from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import type { DomainHealthScore, DnsRecordCheck } from "@/lib/dns/health-check";
import { cn } from "@/lib/utils";

export function DnsHealthCard({ domainId, hostname }: { domainId: string; hostname: string }) {
	const [health, setHealth] = useState<DomainHealthScore | null>(null);
	const [loading, setLoading] = useState(true);
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	async function loadHealth() {
		setLoading(true);
		try {
			const res = await authFetch(`/api/domains/${domainId}/health`);
			if (res.ok) {
				const data = (await res.json()) as { health: DomainHealthScore };
				setHealth(data.health);
			}
		} catch (err) {
			console.error("Failed to load DNS health:", err);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		void loadHealth();
	}, [domainId]);

	function copyToClipboard(key: string, text: string) {
		navigator.clipboard.writeText(text);
		setCopiedKey(key);
		setTimeout(() => setCopiedKey(null), 2000);
	}

	if (loading && !health) {
		return (
			<div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/30">
				<RefreshCw className="h-4 w-4 animate-spin text-neutral-400" />
				<span className="text-xs text-neutral-500">Checking SPF, DKIM, DMARC, and MX records...</span>
			</div>
		);
	}

	if (!health) return null;

	const scoreColor =
		health.score >= 100
			? "text-emerald-600 dark:text-emerald-400"
			: health.score >= 75
				? "text-blue-600 dark:text-blue-400"
				: health.score >= 50
					? "text-amber-500 dark:text-amber-400"
					: "text-rose-500 dark:text-rose-400";

	const badgeBg =
		health.score >= 100
			? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
			: health.score >= 75
				? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
				: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";

	return (
		<div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-[#18191e]">
			{/* Top Summary Banner */}
			<div className="flex items-center justify-between border-b border-neutral-100 p-4 dark:border-neutral-800">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
						<Activity className="h-5 w-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
								Deliverability Health
							</h3>
							<span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", badgeBg)}>
								{health.score}%
							</span>
						</div>
						<p className="text-xs text-neutral-500 dark:text-neutral-400">
							{health.score === 100
								? "All DNS authentication checks passed! Maximum inbox delivery."
								: "Some authentication records need attention for 100% inbox placement."}
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={loadHealth}
					disabled={loading}
					className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
				>
					<RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
					Check DNS
				</button>
			</div>

			{/* Health Checks Breakdown */}
			<div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
				{health.checks.map((check) => {
					const isPass = check.status === "pass";
					return (
						<div key={check.type} className="flex flex-col gap-2 p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-start gap-2.5 min-w-0">
								{isPass ? (
									<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
								) : (
									<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
								)}
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span className="font-bold text-neutral-900 dark:text-neutral-100">{check.type}</span>
										<span
											className={cn(
												"rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
												isPass
													? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
													: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
											)}
										>
											{isPass ? "Verified" : "Missing / Needs Setup"}
										</span>
									</div>
									<p className="mt-0.5 text-neutral-500 dark:text-neutral-400">{check.recommendation}</p>
								</div>
							</div>

							{!isPass && (
								<button
									type="button"
									onClick={() => copyToClipboard(check.type, check.copyValue)}
									className="mt-1 flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-neutral-100 px-2.5 py-1 font-mono text-[11px] text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 sm:mt-0 sm:self-auto"
									title="Copy recommended DNS value"
								>
									{copiedKey === check.type ? (
										<>
											<Check className="h-3 w-3 text-emerald-500" />
											<span>Copied!</span>
										</>
									) : (
										<>
											<Copy className="h-3 w-3" />
											<span>Copy Value</span>
										</>
									)}
								</button>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
