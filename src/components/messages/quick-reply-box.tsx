"use client";

import React, { useRef, useState } from "react";
import { Reply, ReplyAll, Send, Paperclip, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUndoSend } from "@/components/compose/undo-send-context";
import { FormattingToolbar } from "@/components/compose/formatting-toolbar";
import { formatAttachmentSize } from "@/components/compose/utils";
import type { ComposeAttachment } from "@/components/compose/types";
import { cn } from "@/lib/utils";

interface QuickReplyBoxProps {
	messageId: string;
	mailboxId?: string | null;
	fromAddress: string;
	toAddress: string;
	subject: string | null;
	ownAddress: string;
	onSent?: () => void;
}

export function QuickReplyBox({
	messageId,
	mailboxId,
	fromAddress,
	toAddress,
	subject,
	ownAddress,
	onSent,
}: QuickReplyBoxProps) {
	const { queueSend } = useUndoSend();
	const [replyMode, setReplyMode] = useState<"reply" | "replyAll">("reply");
	const [replyTo, setReplyTo] = useState(fromAddress);
	const [text, setText] = useState("");
	const [attachments, setAttachments] = useState<ComposeAttachment[]>([]);
	const [expanded, setExpanded] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const attachmentInput = useRef<HTMLInputElement | null>(null);

	const replySubject = subject
		? subject.toLowerCase().startsWith("re:")
			? subject
			: `Re: ${subject}`
		: "Re: (no subject)";

	function handleReplyMode(mode: "reply" | "replyAll") {
		setReplyMode(mode);
		setReplyTo(mode === "replyAll" ? `${fromAddress}, ${toAddress}` : fromAddress);
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
		if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
			event.preventDefault();
			sendReply();
		}
	}

	function sendReply() {
		if (!text.trim() || !ownAddress) return;

		const sendPayload = {
			from: ownAddress,
			to: replyTo,
			subject: replySubject,
			text: text.trim(),
			attachments,
			mailboxId: mailboxId ?? undefined,
		};

		queueSend(sendPayload, (restored) => {
			setText(restored.text);
			setAttachments(restored.attachments);
			setExpanded(true);
		});

		setText("");
		setAttachments([]);
		setExpanded(false);
		onSent?.();
	}

	function addAttachments(files: FileList | null) {
		if (!files) return;
		const next = Array.from(files).map((f) => ({ id: crypto.randomUUID(), file: f }));
		setAttachments((prev) => [...prev, ...next]);
		if (attachmentInput.current) attachmentInput.current.value = "";
	}

	if (!expanded) {
		return (
			<div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-[#18191e]">
				<button
					type="button"
					onClick={() => {
						setExpanded(true);
						setTimeout(() => textareaRef.current?.focus(), 50);
					}}
					className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm text-neutral-500 hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-400 dark:hover:bg-neutral-800"
				>
					<Reply className="h-4 w-4 text-neutral-400" />
					<span>Reply to {fromAddress}... (or press R)</span>
				</button>
			</div>
		);
	}

	return (
		<div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-md dark:border-neutral-800 dark:bg-[#18191e] animate-in fade-in duration-150">
			{/* Top Bar */}
			<div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/70 px-4 py-2.5 dark:border-neutral-800 dark:bg-[#141519]">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => handleReplyMode("reply")}
						className={cn(
							"flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
							replyMode === "reply"
								? "bg-blue-600 text-white"
								: "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800",
						)}
					>
						<Reply className="h-3.5 w-3.5" />
						Reply
					</button>
					<button
						type="button"
						onClick={() => handleReplyMode("replyAll")}
						className={cn(
							"flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
							replyMode === "replyAll"
								? "bg-blue-600 text-white"
								: "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800",
						)}
					>
						<ReplyAll className="h-3.5 w-3.5" />
						Reply All
					</button>
					<span className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-xs">
						to {replyTo}
					</span>
				</div>
				<button
					type="button"
					onClick={() => setExpanded(false)}
					className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-800"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			{/* Formatting Toolbar */}
			<FormattingToolbar textareaRef={textareaRef} text={text} setText={setText} />

			{/* Editor Area */}
			<div className="p-4">
				<Textarea
					ref={textareaRef}
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Write your reply here (Ctrl+Enter to send)..."
					className="min-h-[120px] w-full resize-none border-0 p-0 text-sm leading-relaxed outline-none shadow-none focus-visible:ring-0 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400"
				/>

				{attachments.length > 0 && (
					<div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
						{attachments.map((att) => (
							<div
								key={att.id}
								className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
							>
								<FileText className="h-3.5 w-3.5 text-blue-500" />
								<span className="max-w-40 truncate text-neutral-700 dark:text-neutral-200">{att.file.name}</span>
								<button
									type="button"
									onClick={() => setAttachments((p) => p.filter((x) => x.id !== att.id))}
									className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
								>
									<X className="h-3 w-3" />
								</button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Footer Actions */}
			<div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
				<div className="flex items-center gap-2">
					<input
						ref={attachmentInput}
						type="file"
						multiple
						className="hidden"
						onChange={(e) => addAttachments(e.target.files)}
					/>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => attachmentInput.current?.click()}
						className="gap-1.5 text-xs text-neutral-600 dark:text-neutral-400"
					>
						<Paperclip className="h-3.5 w-3.5" />
						Attach
					</Button>
				</div>
				<div className="flex items-center gap-3">
					<span className="text-[11px] text-neutral-400">Ctrl+Enter to send</span>
					<Button
						type="button"
						onClick={sendReply}
						disabled={!text.trim()}
						className="gap-1.5 rounded-full bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-500"
					>
						<Send className="h-3.5 w-3.5" />
						Send Reply
					</Button>
				</div>
			</div>
		</div>
	);
}
