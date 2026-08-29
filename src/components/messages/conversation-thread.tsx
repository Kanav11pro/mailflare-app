"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Clock, CornerDownRight, MessageSquare } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { SmartAvatar } from "@/components/smart-avatar";
import { QuickReplyBox } from "./quick-reply-box";
import { formatMessageListTimestamp } from "./utils";
import { cn } from "@/lib/utils";

interface ThreadMessage {
	id: string;
	fromAddr: string;
	toAddr: string;
	subject: string | null;
	snippet: string | null;
	textBody: string | null;
	htmlBody: string | null;
	direction: "inbound" | "outbound";
	createdAt: string;
}

interface ConversationThreadProps {
	currentMessageId: string;
	mailboxId?: string | null;
	fromAddress: string;
	toAddress: string;
	subject: string | null;
	ownAddress: string;
}

export function ConversationThread({
	currentMessageId,
	mailboxId,
	fromAddress,
	toAddress,
	subject,
	ownAddress,
}: ConversationThreadProps) {
	const [messages, setMessages] = useState<ThreadMessage[]>([]);
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([currentMessageId]));
	const [loading, setLoading] = useState(false);

	async function loadThread() {
		setLoading(true);
		try {
			const res = await authFetch(`/api/messages/${currentMessageId}/thread`);
			if (res.ok) {
				const data = (await res.json()) as { messages: ThreadMessage[] };
				setMessages(data.messages);
				// Keep current message expanded
				setExpandedIds(new Set([currentMessageId]));
			}
		} catch (err) {
			console.error("Failed to load thread:", err);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		void loadThread();
	}, [currentMessageId]);

	function toggleExpand(id: string) {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	const earlierMessages = messages.filter((m) => m.id !== currentMessageId);

	return (
		<div className="mt-8 space-y-4">
			{earlierMessages.length > 0 && (
				<div className="space-y-3">
					<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
						<MessageSquare className="h-3.5 w-3.5" />
						<span>Thread History ({messages.length} messages)</span>
					</div>

					{earlierMessages.map((msg) => {
						const isExpanded = expandedIds.has(msg.id);
						const isOutbound = msg.direction === "outbound";

						return (
							<div
								key={msg.id}
								className="overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-shadow dark:border-neutral-800 dark:bg-[#18191e]"
							>
								{/* Clickable Header */}
								<button
									type="button"
									onClick={() => toggleExpand(msg.id)}
									className="flex w-full items-center justify-between gap-3 p-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
								>
									<div className="flex items-center gap-3 min-w-0 flex-1">
										<SmartAvatar
											name={isOutbound ? "You" : msg.fromAddr}
											address={msg.fromAddr}
											size="sm"
										/>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
													{isOutbound ? "You" : msg.fromAddr}
												</span>
												<span className="text-[11px] text-neutral-400">
													to {isOutbound ? msg.toAddr : "You"}
												</span>
											</div>
											{!isExpanded && (
												<p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
													{msg.snippet || msg.textBody || "(no content)"}
												</p>
											)}
										</div>
									</div>

									<div className="flex items-center gap-2 shrink-0">
										<span className="text-[11px] text-neutral-400">
											{formatMessageListTimestamp(msg.createdAt)}
										</span>
										{isExpanded ? (
											<ChevronUp className="h-4 w-4 text-neutral-400" />
										) : (
											<ChevronDown className="h-4 w-4 text-neutral-400" />
										)}
									</div>
								</button>

								{/* Expanded Body */}
								{isExpanded && (
									<div className="border-t border-neutral-100 p-4 text-sm leading-relaxed text-neutral-800 dark:border-neutral-800 dark:text-neutral-200">
										{msg.htmlBody ? (
											<div
												dangerouslySetInnerHTML={{ __html: msg.htmlBody }}
												className="prose dark:prose-invert max-w-none text-sm"
											/>
										) : (
											<p className="whitespace-pre-wrap">{msg.textBody}</p>
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* Inline Quick Reply Box */}
			<QuickReplyBox
				messageId={currentMessageId}
				mailboxId={mailboxId}
				fromAddress={fromAddress}
				toAddress={toAddress}
				subject={subject}
				ownAddress={ownAddress}
				onSent={loadThread}
			/>
		</div>
	);
}
