"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ThemeSettings() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	const options = [
		{ id: "light", label: "Light", icon: Sun, desc: "Clean and bright interface" },
		{ id: "dark", label: "Dark", icon: Moon, desc: "Sleek obsidian night mode" },
		{ id: "system", label: "System", icon: Monitor, desc: "Sync with your OS preference" },
	];

	return (
		<Card className="rounded-3xl border-0 bg-white px-6">
			<CardHeader>
				<CardTitle>Appearance</CardTitle>
				<CardDescription>Choose how Mailflare looks to you on this device.</CardDescription>
			</CardHeader>
			<CardContent className="pb-6">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					{options.map(({ id, label, icon: Icon, desc }) => {
						const active = theme === id;
						return (
							<button
								key={id}
								type="button"
								onClick={() => setTheme(id)}
								className={cn(
									"flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all",
									active
										? "border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600 dark:bg-blue-950/30"
										: "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800",
								)}
							>
								<div className="flex w-full items-center justify-between">
									<div
										className={cn(
											"flex h-9 w-9 items-center justify-center rounded-xl",
											active
												? "bg-blue-600 text-white"
												: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
										)}
									>
										<Icon className="h-5 w-5" />
									</div>
									{active && (
										<span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
											Active
										</span>
									)}
								</div>
								<div>
									<p className="font-semibold text-sm text-neutral-900">{label}</p>
									<p className="text-xs text-neutral-500">{desc}</p>
								</div>
							</button>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
