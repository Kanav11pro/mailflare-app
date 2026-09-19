import AsyncStorage from "@react-native-async-storage/async-storage";
import { Message } from "../types";

export interface WidgetEmailItem {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  createdAt: string;
  isStarred: boolean;
}

export interface WidgetSnapshotData {
  unreadCount: number;
  starredCount: number;
  outboxCount: number;
  recentEmails: WidgetEmailItem[];
  lastSyncedAt: string;
  accountEmail?: string;
}

const WIDGET_DATA_KEY = "mailflare_widget_snapshot_data_v1";

/**
 * Updates the shared widget data store with the latest inbox and outbox metrics.
 */
export async function exportWidgetSnapshot(options: {
  messages: Message[];
  outboxCount?: number;
  accountEmail?: string;
}): Promise<void> {
  try {
    const { messages, outboxCount = 0, accountEmail } = options;

    const unread = messages.filter((m) => !m.read);
    const starred = messages.filter((m) => m.starred);

    // Take top 4 priority/unread messages for widget previews
    const topEmails: WidgetEmailItem[] = (unread.length > 0 ? unread : messages)
      .slice(0, 4)
      .map((m) => ({
        id: m.id,
        senderName:
          m.fromContactName ||
          m.fromAddr.split("<")[0].trim() ||
          m.fromAddr,
        senderEmail: m.fromAddr.includes("<")
          ? m.fromAddr.match(/<([^>]+)>/)?.[1] || m.fromAddr
          : m.fromAddr,
        subject: m.subject || "(No Subject)",
        snippet: m.snippet || "",
        createdAt: new Date(m.createdAt).toISOString(),
        isStarred: m.starred,
      }));

    const snapshot: WidgetSnapshotData = {
      unreadCount: unread.length,
      starredCount: starred.length,
      outboxCount,
      recentEmails: topEmails,
      lastSyncedAt: new Date().toISOString(),
      accountEmail,
    };

    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn("Failed to export widget snapshot:", err);
  }
}

/**
 * Reads the latest widget snapshot from local storage.
 */
export async function getWidgetSnapshot(): Promise<WidgetSnapshotData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WidgetSnapshotData;
  } catch {
    return null;
  }
}
