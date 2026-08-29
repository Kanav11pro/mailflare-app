"use client";

import React from "react";
import {
	Bold,
	Italic,
	Strikethrough,
	Heading1,
	Heading2,
	List,
	ListOrdered,
	Quote,
	Code,
	Link2,
	RemoveFormatting,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FormattingToolbarProps {
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	text: string;
	setText: (value: string) => void;
	className?: string;
}

export function FormattingToolbar({
	textareaRef,
	text,
	setText,
	className,
}: FormattingToolbarProps) {
	function applyWrap(prefix: string, suffix: string = prefix, defaultPlaceholder = "text") {
		const el = textareaRef.current;
		if (!el) return;

		const start = el.selectionStart;
		const end = el.selectionEnd;
		const selection = text.slice(start, end) || defaultPlaceholder;
		const replacement = `${prefix}${selection}${suffix}`;
		const nextText = text.slice(0, start) + replacement + text.slice(end);

		setText(nextText);

		// Restore cursor position inside the wrapped text
		setTimeout(() => {
			el.focus();
			el.setSelectionRange(start + prefix.length, start + prefix.length + selection.length);
		}, 0);
	}

	function applyLinePrefix(prefix: string) {
		const el = textareaRef.current;
		if (!el) return;

		const start = el.selectionStart;
		const end = el.selectionEnd;

		// Find line boundaries
		const beforeStart = text.lastIndexOf("\n", start - 1) + 1;
		const line = text.slice(beforeStart, end);
		const replacement = `${prefix} ${line}`;
		const nextText = text.slice(0, beforeStart) + replacement + text.slice(end);

		setText(nextText);

		setTimeout(() => {
			el.focus();
			el.setSelectionRange(start + prefix.length + 1, end + prefix.length + 1);
		}, 0);
	}

	function insertLink() {
		const url = prompt("Enter link URL (e.g. https://example.com):");
		if (!url) return;
		applyWrap("[", `](${url.trim()})`, "link text");
	}

	const tools = [
		{ icon: Bold, title: "Bold (Ctrl+B)", action: () => applyWrap("**", "**", "bold text") },
		{ icon: Italic, title: "Italic (Ctrl+I)", action: () => applyWrap("*", "*", "italic text") },
		{ icon: Strikethrough, title: "Strikethrough", action: () => applyWrap("~~", "~~", "strikethrough text") },
		{ divider: true },
		{ icon: Heading1, title: "Heading 1", action: () => applyLinePrefix("#") },
		{ icon: Heading2, title: "Heading 2", action: () => applyLinePrefix("##") },
		{ divider: true },
		{ icon: List, title: "Bullet List", action: () => applyLinePrefix("-") },
		{ icon: ListOrdered, title: "Numbered List", action: () => applyLinePrefix("1.") },
		{ icon: Quote, title: "Quote", action: () => applyLinePrefix(">") },
		{ icon: Code, title: "Code Block", action: () => applyWrap("```\n", "\n```", "code") },
		{ divider: true },
		{ icon: Link2, title: "Insert Link", action: insertLink },
	];

	return (
		<div
			className={cn(
				"flex items-center gap-1 border-b border-neutral-100 bg-neutral-50/70 px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900/50",
				className,
			)}
		>
			{tools.map((tool, idx) => {
				if ("divider" in tool) {
					return (
						<div
							key={`div-${idx}`}
							className="mx-1 h-4 w-[1px] bg-neutral-200 dark:bg-neutral-700"
						/>
					);
				}
				const Icon = tool.icon;
				return (
					<button
						key={tool.title}
						type="button"
						onClick={tool.action}
						title={tool.title}
						className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
					>
						<Icon className="h-3.5 w-3.5" />
					</button>
				);
			})}
		</div>
	);
}
