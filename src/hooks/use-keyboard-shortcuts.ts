"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useOptionalCompose } from "@/components/compose/compose-context";

interface ShortcutOptions {
	onOpenCommandPalette?: () => void;
}

export function useKeyboardShortcuts(options?: ShortcutOptions) {
	const router = useRouter();
	const compose = useOptionalCompose();
	const { resolvedTheme, setTheme } = useTheme();

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			const target = event.target as HTMLElement | null;
			const isInputActive =
				target?.tagName === "INPUT" ||
				target?.tagName === "TEXTAREA" ||
				target?.tagName === "SELECT" ||
				target?.isContentEditable;

			// Global Command Palette Shortcut: Cmd+K or Ctrl+K (works anywhere)
			if ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K")) {
				event.preventDefault();
				options?.onOpenCommandPalette?.();
				return;
			}

			// If user is currently typing in an input/textarea, do not trigger single-letter hotkeys
			if (isInputActive) {
				return;
			}

			// Ignore if modifier keys are pressed
			if (event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}

			switch (event.key.toLowerCase()) {
				case "c":
					event.preventDefault();
					if (compose?.openComposer) {
						compose.openComposer();
					} else {
						router.push("/compose");
					}
					break;
				case "t":
					event.preventDefault();
					setTheme(resolvedTheme === "dark" ? "light" : "dark");
					break;
				case "g":
					// Go to shortcuts prefix
					break;
				case "/":
					event.preventDefault();
					options?.onOpenCommandPalette?.();
					break;
				default:
					break;
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [compose, options, resolvedTheme, router, setTheme]);
}
