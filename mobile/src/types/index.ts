export interface User {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "user";
  avatarKey?: string | null;
}

export interface Mailbox {
  id: string;
  domainId: string;
  userId: string;
  localPart: string;
  hostname?: string;
  displayName: string | null;
  signature?: string;
  type: "personal" | "shared";
  isPrimary?: boolean;
  senderAddresses?: string[];
}

export interface MessageAttachment {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  r2Key: string;
  disposition: "attachment" | "inline";
}

export interface Message {
  id: string;
  userId: string;
  mailboxId: string | null;
  direction: "inbound" | "outbound";
  fromAddr: string;
  toAddr: string;
  ccAddr?: string | null;
  bccAddr?: string | null;
  subject: string | null;
  snippet: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
  status: string;
  read: boolean;
  starred: boolean;
  threadId?: string | null;
  threadCount?: number;
  threadUnread?: number;
  fromContactName?: string | null;
  toContactName?: string | null;
  spamScore?: number | null;
  spamVerdict?: "inbox" | "suspicious" | "spam" | null;
  createdAt: string | number | Date;
  inReplyTo?: string | null;
  references?: string | null;
  trackersBlockedCount?: number;
  trackersBlockedDomains?: string | string[];
  unsubscribeUrl?: string | null;
  unsubscribeMailto?: string | null;
  isNewsletter?: boolean;
  deliveryStatus?: "queued" | "sent" | "delivered" | "bounced" | "complained" | "failed" | null;
  deliveryLatencyMs?: number | null;
  deliveryAt?: string | number | Date | null;
  deliveryError?: string | null;
  deliveryBounceType?: string | null;
  openedAt?: string | number | Date | null;
  openCount?: number;
  clickedAt?: string | number | Date | null;
  clickCount?: number;
  lastClickedUrl?: string | null;
  attachments?: MessageAttachment[];
}

export type Attachment = MessageAttachment;

export interface MaskedAlias {
  id: string;
  userId: string;
  mailboxId: string;
  domainId: string;
  localPart: string;
  label: string;
  status: "active" | "paused" | "killed";
  forwardCount: number;
  blockedCount: number;
  lastReceivedAt?: string | number | Date | null;
  expiresAt?: string | number | Date | null;
  createdAt: string | number | Date;
  domainHostname?: string;
  mailboxLocalPart?: string;
  mailboxDisplayName?: string | null;
}

export interface ContactDossier {
  contact: {
    email: string;
    displayName: string | null;
    hasAvatar: boolean;
    source: "manual" | "inbound" | "outbound" | null;
    blocked: boolean;
    lastSeenAt?: string | number | Date | null;
  };
  stats: {
    totalReceived: number;
    totalSent: number;
    totalExchanged: number;
    firstContactAt?: string | number | Date | null;
    lastContactAt?: string | number | Date | null;
    senderDomain: string;
    averageSpamScore: number;
    lastSpamVerdict: string;
    trustLevel: "trusted" | "suspicious" | "untrusted";
    totalTrackersBlocked: number;
  };
  sharedAttachments: Array<{
    id: string;
    messageId: string;
    filename: string;
    contentType: string;
    size: number;
    createdAt: string | number | Date;
  }>;
  recentMessages: Array<{
    id: string;
    subject: string;
    snippet: string;
    direction: "inbound" | "outbound";
    createdAt: string | number | Date;
  }>;
}

export type FolderType =
  | "inbox"
  | "starred"
  | "snoozed"
  | "outbox"
  | "sent"
  | "drafts"
  | "spam"
  | "trash";

export interface CalendarAttendee {
  name?: string;
  email: string;
  role?: string;
  partStat?: "ACCEPTED" | "DECLINED" | "TENTATIVE" | "NEEDS-ACTION";
}

export interface CalendarEventData {
  uid: string;
  method?: string;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  conferenceUrl?: string;
  dtStart: string | null;
  dtEnd: string | null;
  isAllDay: boolean;
  organizer?: { name?: string; email: string };
  attendees: CalendarAttendee[];
  status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
  userStatus?: "ACCEPTED" | "DECLINED" | "TENTATIVE" | "NEEDS-ACTION";
}

export interface ActionItemData {
  id: string;
  type: "meeting" | "deadline" | "task";
  title: string;
  dateSnippet?: string;
  suggestedDate?: string;
  snippet: string;
  confidence: number;
}

export interface CalendarDetailsResponse {
  hasEvent: boolean;
  event: CalendarEventData | null;
  actionItems: ActionItemData[];
}

export interface DeliveryTimelineMilestone {
  id: string;
  title: string;
  description: string;
  timestamp: string | null;
  status: "completed" | "current" | "failed" | "pending";
  type: "created" | "sent" | "delivered" | "opened" | "clicked" | "bounced";
}

export interface DeliveryDiagnosticsDossier {
  messageId: string;
  providerMessageId: string | null;
  direction: "inbound" | "outbound";
  recipient: string;
  sender: string;
  subject: string;
  status: "queued" | "sent" | "delivered" | "bounced" | "complained" | "failed";
  deliveryLatencyMs: number | null;
  deliveryLatencyFormatted: string | null;
  deliveryAt: string | null;
  deliveryError: string | null;
  deliveryBounceType: string | null;
  authAlignment: {
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
    sendingDomain: string;
  };
  engagement: {
    openCount: number;
    openedAt: string | null;
    clickCount: number;
    clickedAt: string | null;
    lastClickedUrl: string | null;
  };
  timeline: DeliveryTimelineMilestone[];
}

export interface MfaStatus {
  enabled: boolean;
  confirmedAt?: string | null;
  recoveryCodesCount?: number;
}

export interface MfaEnrollResult {
  secret: string;
  uri: string;
  qrCode: string;
}

export interface MfaConfirmResult {
  ok: boolean;
  recoveryCodes: string[];
}

export interface RoutingRule {
  id: string;
  userId: string;
  domainId: string;
  scope: "mailbox" | "domain";
  name?: string | null;
  enabled: boolean;
  pattern: string;
  matchField: "email" | "from" | "to" | "subject" | "header";
  matchOperator: "contains" | "equals" | "starts_with" | "ends_with" | "regex";
  matchValue: string;
  mailboxId?: string | null;
  folderId?: string | null;
  action: "store" | "forward" | "reject";
  forwardTo?: string | null;
  keepCopy: boolean;
  rejectReason?: string | null;
  priority: number;
  lastMatchedAt?: string | null;
  matchCount: number;
  createdAt: string;
}

export interface DomainInfo {
  id: string;
  hostname: string;
  zoneId: string;
  status: "pending" | "active" | "error";
  routingStatus?: string | null;
  routingEnabled: boolean;
  sendingEnabled: boolean;
  sendingRequested: boolean;
  createdAt: string;
  dnsRecords?: Array<{
    type: string;
    name: string;
    content: string;
    status: "valid" | "missing" | "invalid";
    expected: string;
  }>;
}

export interface ContactItem {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  avatarKey?: string | null;
  source: "inbound" | "outbound" | "manual";
  blocked: boolean;
  lastSeenAt?: string | null;
  createdAt: string;
}

export interface MailboxDetail extends Mailbox {
  signature?: string;
  autoReplyEnabled?: boolean;
  autoReplySubject?: string;
  autoReplyBody?: string;
  useAllDomains?: boolean;
  disabled?: boolean;
}

export interface UserAccountProfile {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "user";
  resetEmail?: string | null;
  forwardingEmail?: string | null;
  canForwardEmail?: boolean;
}

export interface SpamSettings {
  enabled: boolean;
  vocabularySize?: number;
  spamThreshold?: number;
  analyzers?: {
    authSpfDkim: boolean;
    urlScanner: boolean;
    domainReputation: boolean;
    mimeStructure: boolean;
    bayesianTokens: boolean;
  };
}

export interface WebhookItem {
  id: string;
  url: string;
  description?: string | null;
  secret?: string | null;
  events: string[];
  active: boolean;
  createdAt: string;
  lastTriggeredAt?: string | null;
  failureCount?: number;
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  event: string;
  responseStatus: number | null;
  responseBody?: string | null;
  attempts: number;
  deliveredAt: string;
  success: boolean;
}

export interface DraftItem {
  id: string;
  mailboxId?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text?: string;
  html?: string;
  threadId?: string;
  updatedAt: string | number | Date;
}

