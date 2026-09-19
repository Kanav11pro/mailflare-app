import AsyncStorage from "@react-native-async-storage/async-storage";

export interface OutboxItem {
  id: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text?: string;
  html?: string;
  mailboxId: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  status: "queued" | "sending" | "failed";
}

export interface PendingMutation {
  id: string;
  type: "read" | "unread" | "star" | "unstar" | "trash" | "spam" | "snooze";
  messageIds: string[];
  payload?: any;
  createdAt: string;
}

const OUTBOX_STORAGE_KEY = "mailflare_outbox_queue_v2";
const MUTATIONS_STORAGE_KEY = "mailflare_pending_mutations_v2";

/**
 * Retrieves all items currently stored in the local Outbox.
 */
export async function getOutboxItems(): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OutboxItem[];
  } catch (err) {
    console.error("Failed to load outbox items:", err);
    return [];
  }
}

/**
 * Saves a new email to the Outbox queue.
 */
export async function addOutboxItem(
  item: Omit<OutboxItem, "id" | "createdAt" | "attempts" | "status">
): Promise<OutboxItem> {
  const current = await getOutboxItems();
  const newItem: OutboxItem = {
    ...item,
    id: `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: "queued",
  };

  const updated = [newItem, ...current];
  await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(updated));
  return newItem;
}

/**
 * Updates an existing outbox item's status or retry metadata.
 */
export async function updateOutboxItem(
  id: string,
  updates: Partial<OutboxItem>
): Promise<void> {
  const current = await getOutboxItems();
  const updated = current.map((item) =>
    item.id === id ? { ...item, ...updates } : item
  );
  await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Removes an item from the Outbox queue upon successful send or user cancellation.
 */
export async function removeOutboxItem(id: string): Promise<void> {
  const current = await getOutboxItems();
  const filtered = current.filter((item) => item.id !== id);
  await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Clears all failed or queued items in outbox.
 */
export async function clearAllOutbox(): Promise<void> {
  await AsyncStorage.removeItem(OUTBOX_STORAGE_KEY);
}

/**
 * Pending offline mutations queue (stars, reads, trash, snooze).
 */
export async function getPendingMutations(): Promise<PendingMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(MUTATIONS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingMutation[];
  } catch {
    return [];
  }
}

export async function addPendingMutation(
  mutation: Omit<PendingMutation, "id" | "createdAt">
): Promise<void> {
  const current = await getPendingMutations();
  const newMut: PendingMutation = {
    ...mutation,
    id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(
    MUTATIONS_STORAGE_KEY,
    JSON.stringify([...current, newMut])
  );
}

export async function removePendingMutation(id: string): Promise<void> {
  const current = await getPendingMutations();
  const filtered = current.filter((m) => m.id !== id);
  await AsyncStorage.setItem(MUTATIONS_STORAGE_KEY, JSON.stringify(filtered));
}
