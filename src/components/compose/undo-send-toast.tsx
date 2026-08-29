"use client";

import React, { useEffect, useState } from "react";
import { Send, Undo2 } from "lucide-react";
import { useUndoSend } from "./undo-send-context";

export function UndoSendToast() {
	const { activeSends, undoSend, sendNow } = useUndoSend();

	if (activeSends.length === 0) return null;

	return (
		<div className="fixed bottom-6 left-6 z-[150] flex flex-col gap-2">
			{activeSends.map((send) => (
				<UndoSendToastItem
					key={send.id}
					id={send.id}
					recipient={send.recipientPreview}
					subject={send.subjectPreview}
					createdAt={send.createdAt}
					durationMs={send.durationMs}
					onUndo={() => undoSend(send.id)}
					onSendNow={() => void sendNow(send.id)}
				/>
			))}
		</div>
	);
}

function UndoSendToastItem({
	id,
	recipient,
	subject,
	createdAt,
	durationMs,
	onUndo,
	onSendNow,
}: {
	id: string;
	recipient: string;
	subject: string;
	createdAt: number;
	durationMs: number;
	onUndo: () => void;
	onSendNow: () => void;
}) {
	const [progress, setProgress] = useState(100);

	useEffect(() => {
		const interval = setInterval(() => {
			const elapsed = Date.now() - createdAt;
			const remaining = Math.max(0, durationMs - elapsed);
			const pct = (remaining / durationMs) * 100;
			setProgress(pct);
			if (remaining <= 0) {
				clearInterval(interval);
			}
		}, 40);

		return () => clearInterval(interval);
	}, [createdAt, durationMs]);

	const secondsLeft = Math.max(1, Math.ceil((progress / 100) * (durationMs / 1000)));

	return (
		<div className="flex w-[380px] flex-col overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
			<div className="flex items-center justify-between gap-3">
				<div className="flex min-w-0 flex-1 items-center gap-2.5">
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600/30 text-blue-400 ring-1 ring-blue-500/40">
						<Send className="h-4 w-4" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-xs font-semibold text-neutral-100">
							Sending to {recipient} ({secondsLeft}s)
						</p>
						<p className="truncate text-[11px] text-neutral-400">{subject}</p>
					</div>
				</div>
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={onUndo}
						className="flex items-center gap-1.5 rounded-xl bg-neutral-800 px-3 py-1.5 text-xs font-bold text-amber-400 transition-colors hover:bg-neutral-700 active:scale-95"
					>
						<Undo2 className="h-3.5 w-3.5" />
						Undo
					</button>
					<button
						type="button"
						onClick={onSendNow}
						className="rounded-xl px-2 py-1.5 text-[11px] text-neutral-400 transition-colors hover:text-white"
						title="Send immediately"
					>
						Now
					</button>
				</div>
			</div>
			{/* Animated Progress Bar */}
			<div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-neutral-800">
				<div
					className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-green-400 transition-all duration-75 ease-linear"
					style={{ width: `${progress}%` }}
				/>
			</div>
		</div>
	);
}
