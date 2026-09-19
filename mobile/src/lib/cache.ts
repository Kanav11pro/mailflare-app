import AsyncStorage from "@react-native-async-storage/async-storage";
import { Message } from "../types";

const CACHE_PREFIX = "mailflare_cache_messages_";

function getCacheKey(folder: string, mailboxId?: string): string {
  return `${CACHE_PREFIX}${mailboxId || "all"}_${folder}`;
}

export async function getCachedMessages(
  folder: string,
  mailboxId?: string
): Promise<Message[] | null> {
  try {
    const key = getCacheKey(folder, mailboxId);
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as Message[];
  } catch (err) {
    console.warn("Failed to load cached messages:", err);
    return null;
  }
}

export async function setCachedMessages(
  folder: string,
  mailboxId: string | undefined,
  messages: Message[]
): Promise<void> {
  try {
    const key = getCacheKey(folder, mailboxId);
    // Limit cache to top 50 messages per folder to preserve storage
    const trimmed = messages.slice(0, 50);
    await AsyncStorage.setItem(key, JSON.stringify(trimmed));
  } catch (err) {
    console.warn("Failed to set cached messages:", err);
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (err) {
    console.warn("Failed to clear cache:", err);
  }
}

export async function getCacheSizeFormatted(): Promise<string> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length === 0) return "0 KB";

    const items = await AsyncStorage.multiGet(cacheKeys);
    let totalBytes = 0;
    items.forEach(([_, val]) => {
      if (val) totalBytes += val.length;
    });

    if (totalBytes < 1024) return `${totalBytes} B`;
    if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
    return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
  } catch {
    return "Unknown";
  }
}
