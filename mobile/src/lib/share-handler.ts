export interface ParsedDeepLink {
  screen: "Inbox" | "Compose" | "MessageDetail" | "MaskedAliases" | "NewsletterFeed" | "Settings";
  params?: Record<string, any>;
}

/**
 * Parses deep link URLs and system share intents (e.g. mailflare://..., mailto:...)
 */
export function parseDeepLinkUrl(url: string): ParsedDeepLink | null {
  if (!url) return null;

  try {
    // Handle mailto: URIs
    if (url.startsWith("mailto:")) {
      const mailtoParts = url.slice(7).split("?");
      const to = decodeURIComponent(mailtoParts[0] || "");
      const params: Record<string, string> = {};

      if (mailtoParts[1]) {
        const queryPairs = mailtoParts[1].split("&");
        for (const pair of queryPairs) {
          const [k, v] = pair.split("=");
          if (k && v) {
            params[decodeURIComponent(k).toLowerCase()] = decodeURIComponent(v);
          }
        }
      }

      return {
        screen: "Compose",
        params: {
          initialTo: to,
          initialSubject: params.subject,
          initialBody: params.body,
        },
      };
    }

    // Handle mailflare:// and https:// links
    const cleanUrl = url.replace(/^https:\/\/[^/]+/, "mailflare:/").replace(/^mailflare:\/\//, "mailflare:/");
    const parsed = new URL(url.includes("://") ? url : `mailflare://${url}`);
    const host = parsed.hostname || parsed.pathname.replace(/^\//, "");
    const pathname = parsed.pathname;

    if (host === "compose" || pathname === "/compose") {
      const to = parsed.searchParams.get("to") || "";
      const subject = parsed.searchParams.get("subject") || "";
      const body = parsed.searchParams.get("body") || "";
      const sharedUrl = parsed.searchParams.get("sharedUrl") || parsed.searchParams.get("url") || "";
      const sharedText = parsed.searchParams.get("sharedText") || parsed.searchParams.get("text") || "";

      const finalBody = [body, sharedText, sharedUrl].filter(Boolean).join("\n\n");

      return {
        screen: "Compose",
        params: {
          initialTo: to,
          initialSubject: subject,
          initialBody: finalBody,
        },
      };
    }

    if (host === "message" || pathname.startsWith("/message/")) {
      const parts = (pathname || "").split("/").filter(Boolean);
      const messageId = parts[1] || parsed.searchParams.get("id") || "";
      if (messageId) {
        return {
          screen: "MessageDetail",
          params: { messageId },
        };
      }
    }

    if (host === "masked" || pathname === "/masked") {
      return {
        screen: "MaskedAliases",
      };
    }

    if (host === "feed" || pathname === "/feed") {
      return {
        screen: "NewsletterFeed",
      };
    }

    if (host === "outbox" || pathname === "/outbox") {
      return {
        screen: "Inbox",
        params: { initialFolder: "outbox" },
      };
    }

    if (host === "inbox" || pathname === "/inbox") {
      return {
        screen: "Inbox",
        params: { initialFolder: "inbox" },
      };
    }
  } catch (err) {
    console.warn("Failed to parse deep link URL:", url, err);
  }

  return null;
}
