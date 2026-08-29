"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Cloud, ExternalLink } from "lucide-react";
import dayjs from "dayjs";
import { MarkAsRead } from "@/components/mark-read";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { ContactDetailsTrigger } from "@/components/contacts/contact-details";
import { MessageActions } from "@/components/message-actions/message-actions";
import { MessageAttachmentViewer } from "@/components/message-attachment-viewer";
import { MessageAttachmentCard } from "@/components/message-attachment-card";
import { MessageDetailSkeleton } from "@/components/page-skeletons";
import { usePageLoading } from "@/components/page-loading";
import { PreviousMessage } from "@/components/previous-message";
import { getMessageBackHref } from "@/components/message-actions/utils";
import type { MessageAttachment, MessageDetailResponse } from "./types";
import {
  fetchMessageDetail,
  fetchMessageMetadata,
  getCachedMessageDetailForDisplay,
  getMessageBodyDisplay,
  getMessageHeaderParties,
  resolveInlineAttachmentUrls,
} from "./utils";
import { extractCloudAttachments } from "./cloud-attachment-utils";
import { sanitizeEmailHtml } from "./email-html-sanitizer";
import { SmartAvatar } from "@/components/smart-avatar";
import { ConversationThread } from "@/components/messages/conversation-thread";

export default function MessageDetailPage() {
  const params = useParams<{ messageId: string }>();
  const { selectedMailbox } = useSelectedMailbox();
  const messageId = params.messageId;
  const [data, setData] = useState<MessageDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewAttachment, setPreviewAttachment] =
    useState<MessageAttachment | null>(null);
  usePageLoading(loading);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedMessageDetailForDisplay(messageId);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    Promise.all([
      fetchMessageMetadata(messageId),
      fetchMessageDetail(messageId),
    ])
      .then(([metadata, detail]) => {
        if (cancelled) return;
        setData({ ...metadata, ...detail });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load message:", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [messageId]);

  if (loading || !data?.message) {
    return <MessageDetailSkeleton />;
  }

  const { message, body, attachments = [] } = data;
  if (!message) {
    return (
      <div className="p-8 text-center text-sm text-neutral-500">
        Message not found
      </div>
    );
  }

  const currentAccountName =
    selectedMailbox?.displayName ?? selectedMailbox?.localPart;
  const { fromName, fromAddress, toName } = getMessageHeaderParties(
    message,
    currentAccountName,
  );
  const toAddress = message.toAddr;
  const ownAddress = selectedMailbox
    ? `${selectedMailbox.localPart}@${selectedMailbox.hostname}`
    : "";

  const htmlBody = sanitizeEmailHtml(
    resolveInlineAttachmentUrls(body?.htmlBody ?? null, message.id, attachments),
  );

  const bodyDisplay = getMessageBodyDisplay(
    body?.textBody,
    body?.htmlBody,
    message.snippet,
    ownAddress,
  );
  const cloudAttachmentResult = extractCloudAttachments(
    bodyDisplay.latestContent,
  );

  return (
    <div className="h-full overflow-y-auto overscroll-contain scrollbar-gutter-stable dark:bg-[#15161b]">
      {message.direction === "inbound" && !message.read && (
        <MarkAsRead messageId={message.id} />
      )}
      <div className="flex pt-3 pb-2.75 items-center justify-between px-4 border-b border-neutral-200 sticky top-0 bg-white dark:bg-[#18191e] dark:border-neutral-800 z-10">
        <Link
          href={getMessageBackHref(message.direction, message.status)}
          className="rounded-full p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          title="Back to inbox"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1" />
        <MessageActions
          messageId={message.id}
          mailboxId={message.mailboxId}
          senderAddress={message.fromAddr}
          direction={message.direction}
          status={message.status}
          read={message.read}
          unsubscribeUrl={data.unsubscribeUrl}
          subject={message.subject}
          bodyText={body?.textBody}
          ownAddress={ownAddress}
        />
      </div>
      <article className="px-6 py-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
          {message.subject ?? "(no subject)"}
        </h1>

        <div className="mb-6 flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-5">
          <div className="flex items-center gap-3.5">
            <SmartAvatar
              name={fromName}
              address={message.fromAddr}
              size="lg"
            />
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {message.direction === "inbound" ? (
                  <ContactDetailsTrigger
                    mailboxId={message.mailboxId}
                    address={message.fromAddr}
                    name={fromName}
                  />
                ) : (
                  fromName
                )}{" "}
                <span className="text-xs font-normal text-neutral-400">&lt;{fromAddress}&gt;</span>
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                to{" "}
                {message.direction === "outbound" ? (
                  <ContactDetailsTrigger
                    mailboxId={message.mailboxId}
                    address={message.toAddr}
                    name={toName}
                  />
                ) : (
                  toName
                )}
              </p>
            </div>
          </div>
          <p className="text-xs text-neutral-400">
            {dayjs(message.createdAt).format("MMM DD, YYYY, hh:mmA")}
          </p>
        </div>

        <div className="prose max-w-none text-neutral-900 dark:text-neutral-100 dark:prose-invert">
          {htmlBody ? (
            <div className="mx-auto" dangerouslySetInnerHTML={{ __html: htmlBody }} />
          ) : (
            <pre className="whitespace-pre-wrap text-sm text mx-auto font-sans">
              {cloudAttachmentResult.content}
            </pre>
          )}
          {bodyDisplay.quotedContent.map((quotedContent) => (
            <PreviousMessage
              key={`${quotedContent.dateLine}-${quotedContent.content.slice(0, 24)}`}
              message={quotedContent}
            />
          ))}
        </div>

        {cloudAttachmentResult.attachments.length > 0 && (
          <section className="mt-8 border-t border-neutral-100 dark:border-neutral-800 py-6">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Cloud files ({cloudAttachmentResult.attachments.length})
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {cloudAttachmentResult.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 text-left hover:border-blue-200 hover:bg-blue-50/40 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  <Cloud className="h-5 w-5 shrink-0 text-blue-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {attachment.filename}
                    </span>
                    <span className="block text-xs text-neutral-500">
                      Open from {attachment.provider}
                    </span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-neutral-400" />
                </a>
              ))}
            </div>
          </section>
        )}

        {attachments.length > 0 && (
          <section className="mt-8 border-t border-neutral-100 dark:border-neutral-800 py-6">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Attachments ({attachments.length})
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {attachments.map((attachment) => (
                <MessageAttachmentCard
                  key={attachment.id}
                  attachment={attachment}
                  messageId={message.id}
                  onPreview={setPreviewAttachment}
                />
              ))}
            </div>
          </section>
        )}

        {/* Thread History & Quick Reply */}
        <ConversationThread
          currentMessageId={message.id}
          mailboxId={message.mailboxId}
          fromAddress={message.fromAddr}
          toAddress={message.toAddr}
          subject={message.subject}
          ownAddress={ownAddress}
        />
      </article>
      <MessageAttachmentViewer
        attachment={previewAttachment}
        messageId={message.id}
        open={previewAttachment !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewAttachment(null);
        }}
      />
    </div>
  );
}
