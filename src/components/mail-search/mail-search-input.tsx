"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMailSearch } from "./mail-search-context";
import { useShortcuts } from "@/components/shortcuts";

export function MailSearchInput() {
	const { input: query, setQuery } = useMailSearch();
	const { openCommandPalette, shortcutsEnabled, shortcutsPreferenceLoading } = useShortcuts();
	const showShortcutHints = shortcutsEnabled && !shortcutsPreferenceLoading;

	return (
		<div className="flex h-12 flex-1 items-center gap-2.5 rounded-full bg-[#eaf1fb] dark:bg-[#18191e] dark:border dark:border-neutral-800 px-4 text-neutral-600 dark:text-neutral-300 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
			<Search className="h-5 w-5 shrink-0" />
			<Input
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				placeholder={showShortcutHints ? "Search mail (press / to focus)" : "Search mail"}
				className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-neutral-800 dark:text-neutral-100 outline-none! shadow-none! border-none! placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
			/>
			{query ? (
				<button
					type="button"
					onClick={() => setQuery("")}
					className="rounded-full p-1 text-neutral-500 dark:text-neutral-400 hover:bg-blue-100 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-200"
					aria-label="Clear search"
				>
					<X className="h-4 w-4" />
				</button>
			) : showShortcutHints ? (
				<button
					type="button"
					onClick={openCommandPalette}
					className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-white/70 dark:bg-neutral-800/80 hover:bg-white dark:hover:bg-neutral-700 border border-neutral-200/80 dark:border-neutral-700 rounded-md shadow-2xs transition-colors"
					title="Open Command Palette (⌘K)"
				>
					<span className="text-[11px] font-mono">⌘K</span>
				</button>
			) : null}
		</div>
	);
}
