import { Platform } from "react-native";

export interface QuickActionItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  params?: Record<string, any>;
}

export const STATIC_QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: "action_compose",
    title: "Compose",
    subtitle: "New Email",
    icon: "compose",
  },
  {
    id: "action_masked",
    title: "New Masked Alias",
    subtitle: "1-Tap Burner Address",
    icon: "shield",
  },
  {
    id: "action_search",
    title: "Search Mail",
    subtitle: "Find messages",
    icon: "search",
  },
];

type QuickActionHandler = (action: QuickActionItem) => void;
let globalHandler: QuickActionHandler | null = null;

/**
 * Registers the global handler for app icon quick actions (3D Touch / Long Press).
 */
export function registerQuickActionHandler(handler: QuickActionHandler): () => void {
  globalHandler = handler;
  return () => {
    globalHandler = null;
  };
}

/**
 * Dispatches an action when launched via 3D touch or shortcut intent.
 */
export function handleQuickAction(action: QuickActionItem): void {
  if (globalHandler) {
    globalHandler(action);
  }
}

/**
 * Dynamically updates quick actions (e.g. adding Outbox count if pending).
 */
export async function updateDynamicQuickActions(options: {
  outboxCount: number;
}): Promise<void> {
  const actions = [...STATIC_QUICK_ACTIONS];

  if (options.outboxCount > 0) {
    actions.push({
      id: "action_outbox",
      title: "Outbox",
      subtitle: `${options.outboxCount} Queued Message${options.outboxCount > 1 ? "s" : ""}`,
      icon: "send",
    });
  }

  // If using expo-quick-actions in native build, it can set items dynamically
  try {
    const QuickActions = require("expo-quick-actions");
    if (QuickActions && QuickActions.setItems) {
      await QuickActions.setItems(
        actions.map((a) => ({
          id: a.id,
          title: a.title,
          subtitle: a.subtitle,
          icon: Platform.OS === "ios" ? `symbol:${a.icon}` : a.icon,
        }))
      );
    }
  } catch {
    // Graceful fallback in development or Expo Go
  }
}
