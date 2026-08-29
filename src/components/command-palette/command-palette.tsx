"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
	Search,
	Mail,
	Star,
	Clock,
	Send,
	FileText,
	Archive,
	ShieldAlert,
	Trash2,
	Settings,
	Globe2,
	Users,
	CalendarDays,
	Plus,
	Moon,
	Sun,
	Keyboard,
	ArrowRight,
	X,
} from "lucide-react";
import { useOptionalCompose } from "@/components/compose/compose-context";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface CommandItem {
	id: string;
	title: string;
	subtitle?: string;
	category: "Navigation" | "Actions" | "Settings";
	icon: React.ComponentType<{ className?: string }>;
	shortcut?: string;
	action: () => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
	const router = useRouter();
	const compose = useOptionalCompose();
	const { resolvedTheme, setTheme } = useTheme();
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (open) {
			setQuery("");
			setSelectedIndex(0);
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [open]);

	const items: CommandItem[] = useMemo(
		() => [
			// Actions
			{
				id: "compose",
				title: "Compose New Email",
				subtitle: "Draft a new message",
				category: "Actions",
				icon: Plus,
				shortcut: "C",
				action: () => {
					onOpenChange(false);
					if (compose?.openComposer) {
						compose.openComposer();
					} else {
						router.push("/compose");
					}
				},
			},
			{
				id: "theme",
				title: resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
				subtitle: "Toggle color theme",
				category: "Actions",
				icon: resolvedTheme === "dark" ? Sun : Moon,
				shortcut: "T",
				action: () => {
					setTheme(resolvedTheme === "dark" ? "light" : "dark");
					onOpenChange(false);
				},
			},
			// Navigation
			{
				id: "inbox",
				title: "Inbox",
				category: "Navigation",
				icon: Mail,
				shortcut: "G I",
				action: () => {
					onOpenChange(false);
					router.push("/inbox");
				},
			},
			{
				id: "starred",
				title: "Starred Messages",
				category: "Navigation",
				icon: Star,
				action: () => {
					onOpenChange(false);
					router.push("/starred");
				},
			},
			{
				id: "sent",
				title: "Sent Messages",
				category: "Navigation",
				icon: Send,
				action: () => {
					onOpenChange(false);
					router.push("/sent");
				},
			},
			{
				id: "drafts",
				title: "Drafts",
				category: "Navigation",
				icon: FileText,
				action: () => {
					onOpenChange(false);
					router.push("/drafts");
				},
			},
			{
				id: "archive",
				title: "Archived",
				category: "Navigation",
				icon: Archive,
				action: () => {
					onOpenChange(false);
					router.push("/archived");
				},
			},
			{
				id: "calendar",
				title: "Calendar",
				category: "Navigation",
				icon: CalendarDays,
				action: () => {
					onOpenChange(false);
					router.push("/calendar");
				},
			},
			{
				id: "domains",
				title: "Domains & DNS",
				subtitle: "Manage email routing & DNS health",
				category: "Navigation",
				icon: Globe2,
				action: () => {
					onOpenChange(false);
					router.push("/domains");
				},
			},
			{
				id: "accounts",
				title: "Accounts & Mailboxes",
				category: "Navigation",
				icon: Users,
				action: () => {
					onOpenChange(false);
					router.push("/accounts");
				},
			},
			{
				id: "settings",
				title: "Settings",
				subtitle: "Account, signatures & preferences",
				category: "Settings",
				icon: Settings,
				action: () => {
					onOpenChange(false);
					router.push("/settings");
				},
			},
		],
		[compose, onOpenChange, resolvedTheme, router, setTheme],
	);

	const filteredItems = useMemo(() => {
		if (!query.trim()) return items;
		const q = query.toLowerCase().trim();
		return items.filter(
			(item) =>
				item.title.toLowerCase().includes(q) ||
				item.category.toLowerCase().includes(q) ||
				(item.subtitle && item.subtitle.toLowerCase().includes(q)),
		);
	}, [items, query]);

	useEffect(() => {
		setSelectedIndex(0);
	}, [filteredItems.length]);

	function handleKeyDown(event: React.KeyboardEvent) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
		} else if (event.key === "Enter") {
			event.preventDefault();
			const selected = filteredItems[selectedIndex];
			if (selected) {
				selected.action();
			}
		} else if (event.key === "Escape") {
			event.preventDefault();
			onOpenChange(false);
		}
	}

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/60 pt-[12vh] px-4 backdrop-blur-sm animate-in fade-in duration-150">
			<div
				className="fixed inset-0"
				onClick={() => onOpenChange(false)}
				aria-hidden="true"
			/>
			<div
				className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#18191e] animate-in zoom-in-95 duration-150"
				onKeyDown={handleKeyDown}
			>
				{/* Search Input Bar */}
				<div className="flex h-14 items-center gap-3 border-b border-neutral-100 px-4 dark:border-neutral-800">
					<Search className="h-5 w-5 shrink-0 text-neutral-400" />
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Type a command or search..."
						className="h-full flex-1 bg-transparent text-base text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
					/>
					{query && (
						<button
							type="button"
							onClick={() => setQuery("")}
							className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
						>
							<X className="h-4 w-4" />
						</button>
					)}
					<kbd className="hidden sm:inline-block rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
						ESC
					</kbd>
				</div>

				{/* Results List */}
				<div className="max-h-[360px] overflow-y-auto p-2 scrollbar-gutter-stable">
					{filteredItems.length === 0 ? (
						<div className="py-10 text-center text-sm text-neutral-400">
							No commands found matching &quot;{query}&quot;
						</div>
					) : (
						filteredItems.map((item, idx) => {
							const Icon = item.icon;
							const isSelected = idx === selectedIndex;
							return (
								<button
									key={item.id}
									type="button"
									onClick={() => item.action()}
									onMouseEnter={() => setSelectedIndex(idx)}
									className={cn(
										"flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors",
										isSelected
											? "bg-blue-600 text-white shadow-sm"
											: "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800/60",
									)}
								>
									<div
										className={cn(
											"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
											isSelected
												? "bg-white/20 text-white"
												: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
										)}
									>
										<Icon className="h-4 w-4" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">{item.title}</p>
										{item.subtitle && (
											<p
												className={cn(
													"truncate text-xs",
													isSelected ? "text-blue-100" : "text-neutral-400",
												)}
											>
												{item.subtitle}
											</p>
										)}
									</div>
									{item.shortcut && (
										<kbd
											className={cn(
												"rounded border px-1.5 py-0.5 text-[11px] font-semibold",
												isSelected
													? "border-white/30 bg-white/20 text-white"
													: "border-neutral-200 bg-neutral-100 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
											)}
										>
											{item.shortcut}
										</kbd>
									)}
									<ArrowRight
										className={cn(
											"h-4 w-4 shrink-0 transition-opacity",
											isSelected ? "opacity-100" : "opacity-0",
										)}
									/>
								</button>
							);
						})
					)}
				</div>

				{/* Footer Shortcuts hint */}
				<div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-4 py-2 text-[11px] text-neutral-500 dark:border-neutral-800 dark:bg-[#141519] dark:text-neutral-400">
					<div className="flex items-center gap-3">
						<span className="flex items-center gap-1">
							<kbd className="rounded border bg-white px-1 dark:border-neutral-700 dark:bg-neutral-800">↑</kbd>
							<kbd className="rounded border bg-white px-1 dark:border-neutral-700 dark:bg-neutral-800">↓</kbd> Navigate
						</span>
						<span className="flex items-center gap-1">
							<kbd className="rounded border bg-white px-1 dark:border-neutral-700 dark:bg-neutral-800">↵</kbd> Select
						</span>
					</div>
					<div className="flex items-center gap-1">
						<Keyboard className="h-3.5 w-3.5" />
						<span>Press <kbd className="rounded border bg-white px-1 dark:border-neutral-700 dark:bg-neutral-800">C</kbd> to Compose</span>
					</div>
				</div>
			</div>
		</div>
	);
}
