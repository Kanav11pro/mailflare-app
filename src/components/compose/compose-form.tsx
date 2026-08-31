"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { authFetch } from "@/lib/auth/client";
import { formatEmailAddress, getEmailAddress } from "@/lib/email/address";
import { cn } from "@/lib/utils";
import { applyMailboxSignature, fetchDraft, formatAttachmentSize } from "./utils";
import type { ComposeAttachment } from "./types";
import { useUndoSend } from "./undo-send-context";
import { FormattingToolbar } from "./formatting-toolbar";

type Toast = { type: "success" | "error"; message: string } | null;

export function ComposeForm({
	mode = "page",
	draftIdToLoad,
	onClose,
}: {
	mode?: "page" | "popup";
	draftIdToLoad?: string | null;
	onClose?: () => void;
}) {
	const { selectedMailbox, setSelectedMailbox, mailboxes } = useSelectedMailbox();
	const { queueSend } = useUndoSend();
	const [draftId, setDraftId] = useState<string | null>(null);
	const [to, setTo] = useState("");
	const [subject, setSubject] = useState("");
	const [text, setText] = useState("");
	const [attachments, setAttachments] = useState<ComposeAttachment[]>([]);
	const [toast, setToast] = useState<Toast>(null);
	const [loading, setLoading] = useState(false);
	const [loadingDraft, setLoadingDraft] = useState(false);
	const [loadedDraftMailboxId, setLoadedDraftMailboxId] = useState<string | null>(null);
	const [loadedDraftFrom, setLoadedDraftFrom] = useState<string | null>(null);
	const [selectedFrom, setSelectedFrom] = useState("");
	const previousSignatureRef = useRef<string | null>(null);
	const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const attachmentInput = useRef<HTMLInputElement | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		if (loadingDraft || draftIdToLoad) return;
		const nextSignature = selectedMailbox?.signature ?? null;
		setText((prev) => applyMailboxSignature(prev, previousSignatureRef.current, nextSignature));
		previousSignatureRef.current = nextSignature;
	}, [draftIdToLoad, loadingDraft, selectedMailbox?.id, selectedMailbox?.signature]);

	useEffect(() => {
		if (!selectedMailbox && mailboxes.length === 1) setSelectedMailbox(mailboxes[0]);
	}, [mailboxes, selectedMailbox, setSelectedMailbox]);

	const senderAddresses = useMemo(() => {
		if (!selectedMailbox) return [];
		return selectedMailbox.senderAddresses?.length
			? selectedMailbox.senderAddresses
			: [`${selectedMailbox.localPart}@${selectedMailbox.hostname}`];
	}, [selectedMailbox]);

	const senderOptions = useMemo(
		() => mailboxes.flatMap((mailbox) => {
			const addresses = mailbox.senderAddresses?.length
				? mailbox.senderAddresses
				: [`${mailbox.localPart}@${mailbox.hostname}`];
			return addresses.map((address) => ({ mailbox, address }));
		}),
		[mailboxes],
	);

	const fromAddr = selectedMailbox && selectedFrom
		? formatEmailAddress(selectedFrom, selectedMailbox.displayName)
		: "";

	useEffect(() => {
		if (!senderAddresses.length) {
			setSelectedFrom("");
			return;
		}
		if (!senderAddresses.includes(selectedFrom)) setSelectedFrom(senderAddresses[0]);
	}, [selectedFrom, senderAddresses]);

	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => setToast(null), 3200);
		return () => clearTimeout(timer);
	}, [toast]);

	useEffect(() => {
		if (!draftIdToLoad) return;
		let active = true;
		setLoadingDraft(true);
		fetchDraft(draftIdToLoad)
			.then((draft) => {
				if (!active || !draft) return;
				setDraftId(draft.id);
				setTo(draft.toAddr);
				setSubject(draft.subject ?? "");
				setText(draft.textBody ?? "");
				setLoadedDraftMailboxId(draft.mailboxId ?? null);
				setLoadedDraftFrom(draft.fromAddr);
			})
			.finally(() => {
				if (active) setLoadingDraft(false);
			});
		return () => {
			active = false;
		};
	}, [draftIdToLoad]);

	useEffect(() => {
		if (!loadedDraftMailboxId) return;
		const targetMailbox = mailboxes.find((item) => item.id === loadedDraftMailboxId);
		if (targetMailbox) {
			setSelectedMailbox(targetMailbox);
			const exactAddress = loadedDraftFrom ? getEmailAddress(loadedDraftFrom) : null;
			if (exactAddress && targetMailbox.senderAddresses?.includes(exactAddress)) {
				setSelectedFrom(exactAddress);
			}
		}
		setLoadedDraftMailboxId(null);
		setLoadedDraftFrom(null);
	}, [loadedDraftFrom, loadedDraftMailboxId, mailboxes, setSelectedMailbox]);

	useEffect(() => {
		if (loadingDraft) return;
		if (saveTimer.current) clearTimeout(saveTimer.current);

		if (!to && !subject && !text) return;

		saveTimer.current = setTimeout(async () => {
			const res = await authFetch("/api/drafts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: draftId ?? undefined,
					from: fromAddr,
					to,
					subject,
					text,
					mailboxId: selectedMailbox?.id,
				}),
			});
			const data = (await res.json()) as { draft?: { id: string } };
			if (res.ok && data.draft?.id) setDraftId(data.draft.id);
		}, 900);

		return () => {
			if (saveTimer.current) clearTimeout(saveTimer.current);
		};
	}, [draftId, fromAddr, loadingDraft, selectedMailbox?.id, subject, text, to]);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!fromAddr || !to.trim()) return;

		const currentFrom = fromAddr;
		const currentTo = to;
		const currentSubject = subject;
		const currentText = text;
		const currentAttachments = [...attachments];
		const currentDraftId = draftId;
		const currentMailboxId = selectedMailbox?.id;

		// Queue with 5-second cancelable undo buffer
		queueSend(
			{
				from: currentFrom,
				to: currentTo,
				subject: currentSubject,
				text: currentText,
				attachments: currentAttachments,
				draftId: currentDraftId,
				mailboxId: currentMailboxId,
			},
			(payload) => {
				// On Undo clicked: restore state
				setTo(payload.to);
				setSubject(payload.subject);
				setText(payload.text);
				setAttachments(payload.attachments);
				setDraftId(payload.draftId ?? null);
				setToast({ type: "success", message: "Send undone! Draft restored." });
			},
		);

		setDraftId(null);
		setTo("");
		setSubject("");
		setText("");
		setAttachments([]);
		if (mode === "popup" && onClose) {
			onClose();
		}
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
		if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
			event.preventDefault();
			const form = event.currentTarget.form;
			if (form) {
				form.requestSubmit();
			}
		}
	}

	function addAttachments(files: FileList | null) {
		if (!files) return;
		const nextFiles = Array.from(files);
		const nextCount = attachments.length + nextFiles.length;
		const totalSize = [...attachments.map((attachment) => attachment.file), ...nextFiles].reduce(
			(total, file) => total + file.size,
			0,
		);

		if (nextCount > 10) {
			setToast({ type: "error", message: "A message can include at most 10 attachments" });
			return;
		}
		if (nextFiles.some((file) => file.size > 10 * 1024 * 1024)) {
			setToast({ type: "error", message: "Each attachment must be 10 MB or smaller" });
			return;
		}
		if (totalSize > 20 * 1024 * 1024) {
			setToast({ type: "error", message: "Attachments must total 20 MB or less" });
			return;
		}

		setAttachments((current) => [
			...current,
			...nextFiles.map((file) => ({ id: crypto.randomUUID(), file })),
		]);
		if (attachmentInput.current) attachmentInput.current.value = "";
	}

	function selectSender(value: string) {
		const option = senderOptions.find((item) => `${item.mailbox.id}|${item.address}` === value);
		if (!option) return;
		setSelectedFrom(option.address);
		if (selectedMailbox?.id !== option.mailbox.id) setSelectedMailbox(option.mailbox);
	}

	const frameClass =
		mode === "popup"
			? "fixed bottom-4 right-4 z-40 flex h-[min(540px,calc(100vh-88px))] w-[min(580px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#1a1b20]"
			: "flex h-full min-h-[720px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-[#1a1b20]";

	return (
		<>
			{toast && (
				<div
					className={cn(
						"fixed right-6 top-6 z-[200] rounded-xl px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-md",
						toast.type === "success" ? "bg-green-600/90 text-white" : "bg-red-600/90 text-white",
					)}
				>
					{toast.message}
				</div>
			)}
			<form onSubmit={onSubmit} className={frameClass}>
				<div className="flex h-10 items-center justify-between bg-neutral-900 px-4 text-sm font-medium text-white dark:bg-[#121316]">
					<span className="font-semibold text-xs tracking-wide uppercase text-neutral-300">
						{loadingDraft ? "Loading draft..." : draftId ? "Draft saved" : "New Message"}
					</span>
					{mode === "popup" && (
						<div className="flex items-center gap-3 text-neutral-300">
							<button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-neutral-800 hover:text-white">
								<X className="h-4 w-4" />
							</button>
						</div>
					)}
				</div>
				<div className="border-b border-neutral-100 px-4 py-1.5 dark:border-neutral-800">
					<Label htmlFor={`${mode}-from`} className="sr-only">From</Label>
					<Select
						id={`${mode}-from`}
						value={selectedMailbox && selectedFrom ? `${selectedMailbox.id}|${selectedFrom}` : ""}
						onChange={(event) => selectSender(event.target.value)}
						required
						disabled={loadingDraft || senderOptions.length === 0}
						className="h-8 border-0 px-0 py-1 text-sm shadow-none focus-visible:ring-0 text-neutral-700 dark:text-neutral-300"
					>
						{senderOptions.length === 0 && <option value="">Select a mailbox first</option>}
						{senderOptions.map(({ mailbox, address }) => (
							<option key={`${mailbox.id}|${address}`} value={`${mailbox.id}|${address}`}>{address}</option>
						))}
					</Select>
				</div>
				<div className="border-b border-neutral-100 px-4 py-1.5 dark:border-neutral-800">
					<Label htmlFor={`${mode}-to`} className="sr-only">To</Label>
					<Input
						id={`${mode}-to`}
						value={to}
						onChange={(event) => setTo(event.target.value)}
						type="text"
						placeholder='Recipients, or "Maya Chen" <maya@example.com>'
						required
						disabled={loadingDraft}
						className="h-8 border-0 px-0 py-1 shadow-none focus-visible:ring-0 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
					/>
				</div>
				<div className="border-b border-neutral-100 px-4 py-1.5 dark:border-neutral-800">
					<Label htmlFor={`${mode}-subject`} className="sr-only">Subject</Label>
					<Input
						id={`${mode}-subject`}
						value={subject}
						onChange={(event) => setSubject(event.target.value)}
						placeholder="Subject"
						required
						disabled={loadingDraft}
						className="h-8 border-0 px-0 py-1 shadow-none focus-visible:ring-0 font-medium text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
					/>
				</div>

				<FormattingToolbar textareaRef={textareaRef} text={text} setText={setText} />

				<div className="min-h-0 flex-1 px-4 py-2">
					<Label htmlFor={`${mode}-text`} className="sr-only">Body</Label>
					<Textarea
						id={`${mode}-text`}
						ref={textareaRef}
						value={text}
						onChange={(event) => setText(event.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Write your email here (supports Markdown, Ctrl+Enter to send)..."
						disabled={loadingDraft}
						className="h-full min-h-full resize-none border-0 px-0 text-sm leading-relaxed shadow-none focus-visible:ring-0 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400"
					/>
				</div>
				{attachments.length > 0 && (
					<div className="flex flex-wrap gap-2 border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
						{attachments.map((attachment) => (
							<div
								key={attachment.id}
								className="flex max-w-full items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800/60"
							>
								<FileText className="h-3.5 w-3.5 shrink-0 text-blue-500" />
								<span className="max-w-48 truncate font-medium text-neutral-700 dark:text-neutral-200">{attachment.file.name}</span>
								<span className="text-neutral-400">
									{formatAttachmentSize(attachment.file.size)}
								</span>
								<button
									type="button"
									onClick={() =>
										setAttachments((current) =>
											current.filter((item) => item.id !== attachment.id),
										)
									}
									className="rounded-full p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700"
								>
									<X className="h-3.5 w-3.5" />
									<span className="sr-only">Remove attachment</span>
								</button>
							</div>
						))}
					</div>
				)}
				<div className="flex items-center gap-3 border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
					<Input
						ref={attachmentInput}
						type="file"
						multiple
						className="hidden"
						onChange={(event) => addAttachments(event.target.files)}
					/>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => attachmentInput.current?.click()}
						disabled={loading || loadingDraft}
						className="rounded-xl gap-1.5 text-xs text-neutral-600 dark:text-neutral-300"
					>
						<Paperclip className="h-4 w-4" />
						Attach
					</Button>
					<span className="flex-1" />
					<p className="text-[11px] text-neutral-400">{draftId ? "Saved" : "Autosaving"} • Ctrl+Enter to send</p>
					<Button type="submit" disabled={loading || loadingDraft || !fromAddr} className="rounded-full px-5 gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-md">
						<Send className="h-3.5 w-3.5" />
						Send
					</Button>
				</div>
			</form>
		</>
	);
}
