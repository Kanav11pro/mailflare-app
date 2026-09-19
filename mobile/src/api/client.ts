import * as SecureStore from "expo-secure-store";
import { FolderType, Mailbox, Message, User, MaskedAlias, ContactDossier, DeliveryDiagnosticsDossier } from "../types";

const SERVER_URL_KEY = "mailflare_server_url";
const TOKEN_KEY = "mailflare_auth_token";
const USER_KEY = "mailflare_auth_user";

export const DEFAULT_SERVER_URL = "https://mailflare-app.cbforin.workers.dev";

export class ApiClient {
  private static instance: ApiClient;
  private serverUrl: string = DEFAULT_SERVER_URL;
  private token: string | null = null;

  private constructor() {}

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  public async init(): Promise<{ token: string | null; user: User | null; serverUrl: string }> {
    try {
      const storedUrl = await SecureStore.getItemAsync(SERVER_URL_KEY);
      if (storedUrl && storedUrl !== "https://mail.studyholic.xyz" && !storedUrl.includes("10.64.30.6")) {
        this.serverUrl = storedUrl.replace(/\/$/, "");
      } else {
        this.serverUrl = DEFAULT_SERVER_URL;
      }
      this.token = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(USER_KEY);
      const user = storedUser ? JSON.parse(storedUser) : null;
      return { token: this.token, user, serverUrl: this.serverUrl };
    } catch {
      return { token: null, user: null, serverUrl: this.serverUrl };
    }
  }

  public async setServerUrl(url: string): Promise<void> {
    this.serverUrl = url.trim().replace(/\/$/, "");
    await SecureStore.setItemAsync(SERVER_URL_KEY, this.serverUrl);
  }

  public getServerUrl(): string {
    return this.serverUrl;
  }

  public async setToken(token: string | null, user?: User | null): Promise<void> {
    this.token = token;
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      if (user) {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      }
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.serverUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await response.text();
      let data: any = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      if (!response.ok) {
        const errorMsg = data.error?.message || data.error || data.message || `Request failed with status ${response.status}`;
        throw new Error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError" || err.message?.includes("aborted")) {
        throw new Error(`Connection timed out after 10s. Cannot reach "${this.serverUrl}". Ensure your phone is on the same Wi-Fi and the server URL is correct.`);
      }
      throw err;
    }
  }

  // --- Auth Endpoints ---
  public async login(email: string, password: string): Promise<{ token: string; user?: User; mfaRequired?: boolean; challengeToken?: string }> {
    const res = await this.request<{ ok: boolean; token?: string; mfaRequired?: boolean; challengeToken?: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (res.token) {
      this.token = res.token;
      // Fetch profile to populate user
      try {
        const user = await this.getProfile();
        await this.setToken(res.token, user);
        return { token: res.token, user };
      } catch {
        await this.setToken(res.token, { id: "u", email, name: email.split("@")[0], role: "user" });
        return { token: res.token, user: { id: "u", email, name: email.split("@")[0], role: "user" } };
      }
    }

    return res as any;
  }

  public async verifyMfa(challengeToken: string, code: string): Promise<{ token: string; user?: User }> {
    const res = await this.request<{ ok: boolean; token: string }>("/api/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ challengeToken, code }),
    });

    this.token = res.token;
    try {
      const user = await this.getProfile();
      await this.setToken(res.token, user);
      return { token: res.token, user };
    } catch {
      await this.setToken(res.token, null);
      return { token: res.token };
    }
  }

  public async getProfile(): Promise<User> {
    const res = await this.request<{ user: User }>("/api/auth/me");
    return res.user;
  }

  public async logout(): Promise<void> {
    try {
      if (this.token) {
        await this.request("/api/auth/logout", { method: "POST" });
      }
    } catch {
      // ignore network errors on logout
    } finally {
      await this.setToken(null, null);
    }
  }

  // --- Mailbox Endpoints ---
  public async getMailboxes(): Promise<Mailbox[]> {
    const res = await this.request<{ mailboxes: Mailbox[] }>("/api/mailboxes");
    return res.mailboxes || [];
  }

  // --- Message Endpoints ---
  public async getMessages(params: {
    folder?: FolderType;
    mailboxId?: string;
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ messages: Message[]; total: number }> {
    const queryParts: string[] = [];

    if (params.mailboxId) {
      queryParts.push(`mailboxId=${encodeURIComponent(params.mailboxId)}`);
    }

    if (params.query) {
      queryParts.push(`q=${encodeURIComponent(params.query)}`);
    }

    if (params.folder === "starred") {
      queryParts.push("starred=true");
      queryParts.push("status=received");
    } else if (params.folder === "snoozed") {
      queryParts.push("snoozed=true");
    } else if (params.folder === "sent") {
      queryParts.push("direction=outbound");
    } else if (params.folder === "spam") {
      queryParts.push("status=spam");
    } else if (params.folder === "trash") {
      queryParts.push("status=trash");
    } else if (params.folder === "drafts") {
      queryParts.push("status=draft");
    } else {
      // Default: inbox
      queryParts.push("status=received");
      queryParts.push("direction=inbound");
    }

    queryParts.push(`limit=${params.limit ?? 30}`);
    queryParts.push(`offset=${params.offset ?? 0}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return await this.request<{ messages: Message[]; total: number }>(`/api/messages${queryString}`);
  }

  public async getMessage(id: string): Promise<Message> {
    const res = await this.request<any>(`/api/messages/${id}`);
    if (res && res.message) {
      return {
        ...res.message,
        textBody: res.body?.textBody ?? res.message.textBody,
        htmlBody: res.body?.htmlBody ?? res.message.htmlBody,
        attachments: res.attachments || res.message.attachments || [],
      };
    }
    return res as Message;
  }

  public async toggleStar(messageId: string): Promise<boolean> {
    const res = await this.request<{ starred: boolean }>(`/api/messages/${messageId}/star`, {
      method: "POST",
    });
    return res.starred;
  }

  public async markRead(messageId: string, read: boolean = true): Promise<void> {
    await this.request(`/api/messages/${messageId}/read`, {
      method: "POST",
      body: JSON.stringify({ read }),
    });
  }

  public async setStatus(messageId: string, status: "trash" | "received" | "spam" | "archived"): Promise<void> {
    await this.request(`/api/messages/${messageId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  }

  public async bulkAction(
    action: "read" | "unread" | "trash" | "spam" | "archive" | "inbox",
    messageIds: string[]
  ): Promise<{ ok: boolean }> {
    return await this.request<{ ok: boolean }>("/api/messages/bulk", {
      method: "POST",
      body: JSON.stringify({ action, messageIds }),
    });
  }

  public getAttachmentUrl(messageId: string, attachmentId: string): string {
    return `${this.serverUrl}/api/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`;
  }

  public async sendMessage(payload: {
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
  }): Promise<{ ok: boolean; id?: string }> {
    return await this.request<{ ok: boolean; id?: string }>("/api/send", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getThread(messageId: string): Promise<Message[]> {
    const res = await this.request<{ threadId: string; count: number; messages: any[] }>(
      `/api/messages/${encodeURIComponent(messageId)}/thread`
    );
    if (res && Array.isArray(res.messages)) {
      return res.messages.map((item) => ({
        ...item.message,
        textBody: item.body?.textBody ?? item.message?.textBody,
        htmlBody: item.body?.htmlBody ?? item.message?.htmlBody,
        attachments: item.attachments || item.message?.attachments || [],
      }));
    }
    return [];
  }

  public async registerPushToken(
    token: string,
    platform: "ios" | "android" | "web" = "android",
    deviceName?: string
  ): Promise<{ ok: boolean }> {
    return await this.request<{ ok: boolean }>("/api/notifications/register-token", {
      method: "POST",
      body: JSON.stringify({ token, platform, deviceName }),
    });
  }

  public async unregisterPushToken(token: string): Promise<{ ok: boolean }> {
    return await this.request<{ ok: boolean }>("/api/notifications/register-token", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    });
  }

  // --- Masked / Disposable Aliases Endpoints ---
  public async getMaskedAliases(): Promise<MaskedAlias[]> {
    const res = await this.request<{ aliases: MaskedAlias[] }>("/api/aliases/masked");
    return res.aliases || [];
  }

  public async createMaskedAlias(payload: {
    label: string;
    mailboxId?: string;
    domainId?: string;
    customLocalPart?: string;
    duration?: "24h" | "7d" | "30d" | "permanent";
  }): Promise<MaskedAlias> {
    const res = await this.request<{ alias: MaskedAlias }>("/api/aliases/masked", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.alias;
  }

  public async updateMaskedAlias(
    aliasId: string,
    status?: "active" | "paused" | "killed",
    label?: string
  ): Promise<void> {
    await this.request("/api/aliases/masked", {
      method: "PATCH",
      body: JSON.stringify({ aliasId, status, label }),
    });
  }

  public async deleteMaskedAlias(aliasId: string): Promise<void> {
    await this.request(`/api/aliases/masked?aliasId=${encodeURIComponent(aliasId)}`, {
      method: "DELETE",
    });
  }

  // --- 1-Click Unsubscribe Endpoint ---
  public async unsubscribeMessage(messageId: string): Promise<{ ok: boolean; message?: string }> {
    return await this.request<{ ok: boolean; message?: string }>(
      `/api/messages/${encodeURIComponent(messageId)}/unsubscribe`,
      {
        method: "POST",
      }
    );
  }

  // --- Snooze Endpoints ---
  public async snoozeMessage(
    messageId: string,
    snoozedUntil: string
  ): Promise<{ ok: boolean }> {
    return await this.request<{ ok: boolean }>(
      `/api/messages/${encodeURIComponent(messageId)}/snooze`,
      {
        method: "POST",
        body: JSON.stringify({ snoozedUntil }),
      }
    );
  }

  public async unsnoozeMessage(messageId: string): Promise<{ ok: boolean }> {
    return await this.request<{ ok: boolean }>(
      `/api/messages/${encodeURIComponent(messageId)}/snooze`,
      {
        method: "DELETE",
      }
    );
  }

  // --- Contact Intelligence Dossier ---
  public async getContactDossier(email: string): Promise<ContactDossier> {
    return await this.request<ContactDossier>(
      `/api/contacts/dossier?email=${encodeURIComponent(email)}`
    );
  }

  // --- Calendar Invites & RSVP ---
  public async getCalendarDetails(
    messageId: string
  ): Promise<import("../types").CalendarDetailsResponse> {
    return await this.request<import("../types").CalendarDetailsResponse>(
      `/api/messages/${encodeURIComponent(messageId)}/calendar`
    );
  }

  public async rsvpCalendarEvent(
    messageId: string,
    action: "accept" | "decline" | "tentative",
    comment?: string
  ): Promise<{ success: boolean; action: string; summary: string }> {
    return await this.request<{ success: boolean; action: string; summary: string }>(
      `/api/messages/${encodeURIComponent(messageId)}/calendar`,
      {
        method: "POST",
        body: JSON.stringify({ action, comment }),
      }
    );
  }

  // --- Delivery Analytics & Diagnostics ---
  public async getDeliveryDiagnostics(
    messageId: string
  ): Promise<DeliveryDiagnosticsDossier> {
    return await this.request<DeliveryDiagnosticsDossier>(
      `/api/messages/${encodeURIComponent(messageId)}/delivery`
    );
  }

  // --- Two-Factor Authentication (MFA / TOTP) ---
  public async getMfaStatus(): Promise<import("../types").MfaStatus> {
    return await this.request<import("../types").MfaStatus>("/api/settings/mfa");
  }

  public async enrollMfa(): Promise<import("../types").MfaEnrollResult> {
    return await this.request<import("../types").MfaEnrollResult>("/api/settings/mfa/enroll", {
      method: "POST",
    });
  }

  public async confirmMfa(code: string): Promise<import("../types").MfaConfirmResult> {
    return await this.request<import("../types").MfaConfirmResult>("/api/settings/mfa/confirm", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  public async disableMfa(code: string): Promise<{ ok: boolean }> {
    return await this.request<{ ok: boolean }>("/api/settings/mfa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  public async regenerateRecoveryCodes(): Promise<{ ok: boolean; recoveryCodes: string[] }> {
    return await this.request<{ ok: boolean; recoveryCodes: string[] }>("/api/settings/mfa/recovery-codes", {
      method: "POST",
    });
  }

  // --- Mailbox Settings & Auto-Reply ---
  public async getMailbox(mailboxId: string): Promise<import("../types").MailboxDetail> {
    const res = await this.request<{ mailbox: import("../types").MailboxDetail }>(
      `/api/mailboxes/${encodeURIComponent(mailboxId)}`
    );
    return res.mailbox;
  }

  public async updateMailbox(
    mailboxId: string,
    payload: {
      displayName?: string;
      signature?: string;
      autoReplyEnabled?: boolean;
      autoReplySubject?: string;
      autoReplyBody?: string;
      useAllDomains?: boolean;
    }
  ): Promise<import("../types").MailboxDetail> {
    const res = await this.request<{ mailbox: import("../types").MailboxDetail }>(
      `/api/mailboxes/${encodeURIComponent(mailboxId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
    return res.mailbox;
  }

  // --- Custom Routing Rules ---
  public async getRoutingRules(params?: { domainId?: string; mailboxId?: string }): Promise<import("../types").RoutingRule[]> {
    const query = new URLSearchParams();
    if (params?.domainId) query.set("domainId", params.domainId);
    if (params?.mailboxId) query.set("mailboxId", params.mailboxId);
    const qs = query.toString();
    const res = await this.request<{ rules: import("../types").RoutingRule[] }>(
      `/api/routing-rules${qs ? `?${qs}` : ""}`
    );
    return res.rules || [];
  }

  public async createRoutingRule(payload: {
    domainId: string;
    mailboxId?: string;
    folderId?: string;
    scope?: "mailbox" | "domain";
    name?: string;
    pattern: string;
    matchField?: "email" | "from" | "to" | "subject" | "header";
    matchOperator?: "contains" | "equals" | "starts_with" | "ends_with" | "regex";
    matchValue?: string;
    action?: "store" | "forward" | "reject";
    forwardTo?: string;
    keepCopy?: boolean;
    rejectReason?: string;
    priority?: number;
    enabled?: boolean;
  }): Promise<import("../types").RoutingRule> {
    const res = await this.request<{ rule: import("../types").RoutingRule }>("/api/routing-rules", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.rule;
  }

  public async updateRoutingRule(
    id: string,
    payload: Partial<import("../types").RoutingRule>
  ): Promise<void> {
    await this.request(`/api/routing-rules/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  public async deleteRoutingRule(id: string): Promise<void> {
    await this.request(`/api/routing-rules/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  // --- Domains & Cloudflare DNS Health ---
  public async getDomains(): Promise<import("../types").DomainInfo[]> {
    const res = await this.request<{ domains: import("../types").DomainInfo[] }>("/api/domains?includeDns=true");
    return res.domains || [];
  }

  public async checkDomainDns(domainId: string): Promise<import("../types").DomainInfo> {
    const res = await this.request<{ domain: import("../types").DomainInfo }>(
      `/api/domains/${encodeURIComponent(domainId)}`
    );
    return res.domain;
  }

  // --- Contacts CRM Directory ---
  public async getContacts(query?: string): Promise<import("../types").ContactItem[]> {
    const qs = query ? `?q=${encodeURIComponent(query)}` : "";
    const res = await this.request<{ contacts: import("../types").ContactItem[] }>(`/api/contacts${qs}`);
    return res.contacts || [];
  }

  public async createContact(payload: {
    email: string;
    displayName?: string;
  }): Promise<import("../types").ContactItem> {
    const res = await this.request<{ contact: import("../types").ContactItem }>("/api/contacts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.contact;
  }

  public async deleteContact(email: string): Promise<void> {
    await this.request(`/api/contacts?email=${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
  }

  // --- Account & Profile Security ---
  public async getAccountProfile(): Promise<import("../types").UserAccountProfile> {
    const res = await this.request<{ user: import("../types").UserAccountProfile }>("/api/settings/profile");
    return res.user;
  }

  public async updateAccountProfile(payload: {
    name?: string;
    resetEmail?: string;
    forwardingEmail?: string;
  }): Promise<{ user: import("../types").UserAccountProfile }> {
    return await this.request<{ user: import("../types").UserAccountProfile }>("/api/settings/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  public async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ ok: boolean }> {
    return await this.request<{ ok: boolean }>("/api/settings/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // --- Spam & Bayesian Filter Intelligence ---
  public async getSpamSettings(): Promise<import("../types").SpamSettings> {
    const res = await this.request<{ enabled: boolean; vocabularySize?: number }>("/api/settings/spam");
    return {
      enabled: res.enabled ?? true,
      vocabularySize: res.vocabularySize ?? 1420,
      spamThreshold: 70,
      analyzers: {
        authSpfDkim: true,
        urlScanner: true,
        domainReputation: true,
        mimeStructure: true,
        bayesianTokens: true,
      },
    };
  }

  public async updateSpamSettings(enabled: boolean): Promise<{ enabled: boolean }> {
    return await this.request<{ enabled: boolean }>("/api/settings/spam", {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
  }

  // --- Webhooks & Delivery Telemetry ---
  public async getWebhooks(): Promise<import("../types").WebhookItem[]> {
    const res = await this.request<{ webhooks: import("../types").WebhookItem[] }>("/api/webhooks");
    return res.webhooks || [];
  }

  public async createWebhook(payload: {
    url: string;
    description?: string;
    events?: string[];
  }): Promise<import("../types").WebhookItem> {
    const res = await this.request<{ webhook: import("../types").WebhookItem }>("/api/webhooks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.webhook;
  }

  public async deleteWebhook(id: string): Promise<void> {
    await this.request(`/api/webhooks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  public async testWebhook(id: string): Promise<{ success: boolean; status?: number }> {
    return await this.request<{ success: boolean; status?: number }>(
      `/api/webhooks/${encodeURIComponent(id)}/test`,
      { method: "POST" }
    );
  }

  // --- Drafts Synchronization ---
  public async getDrafts(): Promise<import("../types").DraftItem[]> {
    const res = await this.request<{ drafts: import("../types").DraftItem[] }>("/api/drafts");
    return res.drafts || [];
  }

  public async saveDraft(payload: {
    id?: string;
    mailboxId?: string;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<import("../types").DraftItem> {
    const res = await this.request<{ draft: import("../types").DraftItem }>("/api/drafts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.draft;
  }

  public async deleteDraft(id: string): Promise<void> {
    await this.request(`/api/drafts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
}

export const api = ApiClient.getInstance();

