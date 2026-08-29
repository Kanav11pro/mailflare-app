"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<button
				type="button"
				className={cn(
					"flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800",
					className,
				)}
				aria-label="Toggle theme"
			>
				<span className="h-5 w-5" />
			</button>
		);
	}

	const isDark = resolvedTheme === "dark";

	return (
		<button
			type="button"
			onClick={() => setTheme(isDark ? "light" : "dark")}
			className={cn(
				"flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800",
				className,
			)}
			title={isDark ? "Switch to light mode" : "Switch to dark mode"}
			aria-label="Toggle theme"
		>
			{isDark ? (
				<Sun className="h-5 w-5 text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
			) : (
				<Moon className="h-5 w-5 text-neutral-600 transition-transform duration-200 hover:-rotate-12" />
			)}
		</button>
	);
}
