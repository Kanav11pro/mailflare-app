"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth/client";
import { buildSendFormData } from "./utils";
import type { ComposeAttachment } from "./types";

export interface QueuedSendPayload {
	id: string;
	from: string;
	to: string;
	subject: string;
	text: string;
	html?: string;
	mailboxId?: string;
	attachments: ComposeAttachment[];
	draftId?: string | null;
	recipientPreview: string;
	subjectPreview: string;
	createdAt: number;
	durationMs: number;
}

interface UndoSendContextType {
	activeSends: QueuedSendPayload[];
	queueSend: (
		payload: Omit<QueuedSendPayload, "id" | "createdAt" | "durationMs" | "recipientPreview" | "subjectPreview">,
		onUndo?: (payload: QueuedSendPayload) => void,
	) => string;
	undoSend: (id: string) => void;
	sendNow: (id: string) => Promise<void>;
}

const UndoSendContext = createContext<UndoSendContextType | null>(null);

export function UndoSendProvider({ children }: { children: React.ReactNode }) {
	const [activeSends, setActiveSends] = useState<QueuedSendPayload[]>([]);
	const undoCallbacks = useRef<Map<string, (payload: QueuedSendPayload) => void>>(new Map());
	const timers = useRef<Map<string, NodeJS.Timeout>>(new Map());

	async function executeSend(payload: QueuedSendPayload) {
		try {
			const res = await authFetch("/api/send", {
				method: "POST",
				body: buildSendFormData({
					attachments: payload.attachments,
					from: payload.from,
					to: payload.to,
					subject: payload.subject,
					text: payload.text,
					mailboxId: payload.mailboxId,
				}),
			});

			if (payload.draftId) {
				void authFetch(`/api/drafts/${payload.draftId}`, { method: "DELETE" });
			}
			window.dispatchEvent(new Event("mailflare:messages-changed"));
		} catch (error) {
			console.error("Failed to send buffered message:", error);
		} finally {
			timers.current.delete(payload.id);
			undoCallbacks.current.delete(payload.id);
			setActiveSends((current) => current.filter((item) => item.id !== payload.id));
		}
	}

	function queueSend(
		payload: Omit<QueuedSendPayload, "id" | "createdAt" | "durationMs" | "recipientPreview" | "subjectPreview">,
		onUndo?: (payload: QueuedSendPayload) => void,
	): string {
		const id = `send_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
		const durationMs = 5000;
		const fullPayload: QueuedSendPayload = {
			...payload,
			id,
			createdAt: Date.now(),
			durationMs,
			recipientPreview: payload.to.split(",")[0]?.trim() || "Recipient",
			subjectPreview: payload.subject.trim() || "(no subject)",
		};

		if (onUndo) {
			undoCallbacks.current.set(id, onUndo);
		}

		setActiveSends((current) => [...current, fullPayload]);

		const timer = setTimeout(() => {
			void executeSend(fullPayload);
		}, durationMs);

		timers.current.set(id, timer);
		return id;
	}

	function undoSend(id: string) {
		const timer = timers.current.get(id);
		if (timer) {
			clearTimeout(timer);
			timers.current.delete(id);
		}

		const item = activeSends.find((s) => s.id === id);
		if (item) {
			const callback = undoCallbacks.current.get(id);
			if (callback) {
				callback(item);
			}
		}

		undoCallbacks.current.delete(id);
		setActiveSends((current) => current.filter((s) => s.id !== id));
	}

	async function sendNow(id: string) {
		const timer = timers.current.get(id);
		if (timer) {
			clearTimeout(timer);
			timers.current.delete(id);
		}
		const item = activeSends.find((s) => s.id === id);
		if (item) {
			await executeSend(item);
		}
	}

	useEffect(() => {
		return () => {
			timers.current.forEach((t) => clearTimeout(t));
		};
	}, []);

	return (
		<UndoSendContext.Provider value={{ activeSends, queueSend, undoSend, sendNow }}>
			{children}
		</UndoSendContext.Provider>
	);
}

export function useUndoSend() {
	const context = useContext(UndoSendContext);
	if (!context) {
		throw new Error("useUndoSend must be used within an UndoSendProvider");
	}
	return context;
}
