import * as Haptics from "expo-haptics";
import {
  getOutboxItems,
  updateOutboxItem,
  removeOutboxItem,
  getPendingMutations,
  removePendingMutation,
  OutboxItem,
} from "./outbox";
import { api } from "../api/client";

type SyncListener = (items: OutboxItem[]) => void;
const listeners: Set<SyncListener> = new Set();

let isSyncing = false;

export const SyncManager = {
  subscribe(listener: SyncListener) {
    listeners.add(listener);
    getOutboxItems().then((items) => listener(items));
    return () => {
      listeners.delete(listener);
    };
  },

  async notifyListeners() {
    const items = await getOutboxItems();
    listeners.forEach((fn) => fn(items));
  },

  async getPendingCount(): Promise<number> {
    const items = await getOutboxItems();
    return items.filter((i) => i.status === "queued" || i.status === "failed").length;
  },

  async flushSyncQueue(forceRetry = false): Promise<{ sent: number; failed: number }> {
    if (isSyncing) return { sent: 0, failed: 0 };
    isSyncing = true;

    let sentCount = 0;
    let failedCount = 0;

    try {
      // 1. Flush offline mutations first (star, read, trash, snooze)
      const mutations = await getPendingMutations();
      for (const mut of mutations) {
        try {
          if (mut.type === "read" || mut.type === "unread") {
            await api.bulkAction(mut.type, mut.messageIds);
          } else if (mut.type === "trash") {
            await api.bulkAction("trash", mut.messageIds);
          } else if (mut.type === "spam") {
            await api.bulkAction("spam", mut.messageIds);
          } else if (mut.type === "star") {
            await Promise.all(mut.messageIds.map((id) => api.toggleStar(id)));
          } else if (mut.type === "snooze" && mut.payload?.until) {
            await Promise.all(
              mut.messageIds.map((id) => api.snoozeMessage(id, mut.payload.until))
            );
          }
          await removePendingMutation(mut.id);
        } catch (mErr) {
          console.warn("Failed to replay mutation:", mut.type, mErr);
        }
      }

      // 2. Process Outbox items
      const items = await getOutboxItems();
      for (const item of items) {
        if (item.status === "failed" && !forceRetry && item.attempts >= 5) {
          continue;
        }

        await updateOutboxItem(item.id, {
          status: "sending",
          lastAttemptAt: new Date().toISOString(),
        });
        await this.notifyListeners();

        try {
          await api.sendMessage({
            from: item.from,
            to: item.to,
            cc: item.cc,
            bcc: item.bcc,
            subject: item.subject,
            text: item.text,
            html: item.html,
            mailboxId: item.mailboxId,
            threadId: item.threadId,
            inReplyTo: item.inReplyTo,
            references: item.references,
          });

          await removeOutboxItem(item.id);
          sentCount++;
        } catch (err: any) {
          failedCount++;
          console.error(`Outbox send failed for ${item.id}:`, err);
          await updateOutboxItem(item.id, {
            status: "failed",
            attempts: item.attempts + 1,
            lastError: err?.message || "Failed to deliver message",
          });
        }
      }

      if (sentCount > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      isSyncing = false;
      await this.notifyListeners();
    }

    return { sent: sentCount, failed: failedCount };
  },
};
