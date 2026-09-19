# AGENTS.md — Mailflare Architecture & Developer Guide

> **Note for AI Agents**: This file is the single source of truth for the Mailflare codebase (`Kanav11pro/mailflare-app`). Read this document to understand the full system architecture, database design, email pipelines, security model, UI conventions, and operational rules without having to inspect dozens of individual files.

---

## 1. System Overview & Core Mission

**Mailflare** is a modern, self-hosted, serverless email platform built on **Cloudflare Pages / Workers**, **Cloudflare D1 (SQLite)**, **Cloudflare R2 (Object Storage)**, and **Resend** (for outbound transactional and compose mail).

### Key Capabilities
- **Inbound Email Intake**: Cloudflare Email Routing worker parses raw MIME streams via `postal-mime`, uploads attachments to R2, runs spam heuristics, and saves structured messages to D1.
- **Outbound Email Engine**: Robust Resend API integration supporting `mail.studyholic.xyz` subdomain sending, Apex DMARC compliance, `Cc`, `Bcc`, `In-Reply-To`, `References`, attachments (PDF/Images/docs), and a 5-second cancelable Undo Send buffer.
- **Full-Text Search (FTS5)**: SQLite FTS5 virtual table with insert/update/delete triggers and Gmail-style search operators (`from:`, `to:`, `subject:`, `has:attachment`, `after:`, `before:`, `is:unread`, `is:starred`).
- **Spam & Bayesian Engine**: Multi-analyzer scoring engine (SPF/DKIM/DMARC, URL safety, domain reputation, Bayesian tokens) with interactive feedback training.
- **Security & Authentication**: Argon2id password hashing, cookie-based session management, RFC 6238 TOTP two-factor authentication (QR code enrollment), 8 single-use hashed recovery codes, and email-based password reset.
- **Mailbox Aliases & Subaddressing**: Direct alias management and `+` / `.` subaddressing tags (e.g., `user+tag@domain.com`).
- **Obsidian Dark Mode**: Custom dark theme with deep obsidian backgrounds (`#0f1015`, `#15161b`, `#18191e`), high-contrast borders (`#252730`), and accessible typography.

---

## 2. Technology Stack & Runtime

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack) | React 19, Server Components & Route Handlers |
| **Edge Runtime** | Cloudflare Pages / Workers | `getEnv()` from `@/lib/cloudflare` accesses D1, R2, KV, and environment bindings |
| **Database** | Cloudflare D1 (SQLite) | Managed via **Drizzle ORM** (`src/db/schema/index.ts`) |
| **Object Storage** | Cloudflare R2 | `ATTACHMENTS_BUCKET` (attachments) & `AVATARS_BUCKET` (avatars) |
| **Outbound Email** | Resend API | `RESEND_API_KEY`, sending via `mail.studyholic.xyz` with apex DMARC |
| **Styling** | Tailwind CSS v4 | Obsidian Dark Mode tokens, Radix UI primitives, Lucide React icons |
| **Editor** | Rich Text / Formatting Toolbar | TipTap & custom HTML/plain-text formatting |
| **MFA & 2FA** | `otpauth` + `qrcode` | Standard TOTP (SHA1, 6 digits, 30s period) + SVG QR rendering |

---

## 3. Database Architecture & Drizzle Schema

All tables are defined in [`src/db/schema/index.ts`](file:///c:/Users/MITTAL/Desktop/Kanav%20Class%2011/mailflare-app/src/db/schema/index.ts).

### Core Tables Summary

1. **`users`**:
   - Fields: `id`, `email`, `passwordHash`, `name`, `role` (`admin` | `user`), `avatarKey`, `forwardingEmail`, `resetEmail`, `shortcutsEnabled`, `threadingMode`, `createdAt`, `updatedAt`.
2. **`sessions`**:
   - Fields: `id`, `userId`, `token` (sha256 hashed), `expiresAt`, `createdAt`.
3. **`domains`**:
   - Fields: `id`, `name`, `cfZoneId`, `status` (`active` | `pending` | `error`), `routingEnabled`, `sendingEnabled`, `isApex`, `createdAt`.
4. **`mailboxes`**:
   - Fields: `id`, `domainId`, `userId`, `localPart`, `hostname`, `displayName`, `signature`, `autoReplyEnabled`, `autoReplySubject`, `autoReplyBody`, `avatarKey`, `type` (`personal` | `shared`), `isPrimary`, `createdAt`.
5. **`mailboxAliases`**:
   - Fields: `id`, `mailboxId`, `domainId`, `aliasLocalPart`, `createdAt`.
6. **`messages`**:
   - Fields: `id`, `userId`, `mailboxId`, `threadId`, `direction` (`inbound` | `outbound`), `fromAddr`, `toAddr`, `ccAddr`, `bccAddr`, `subject`, `snippet`, `textBody`, `htmlBody`, `status` (`delivered` | `queued` | `failed` | `spam`), `spamScore`, `spamVerdict`, `isRead`, `isStarred`, `isArchived`, `isSpam`, `isTrash`, `inReplyTo`, `references`, `createdAt`.
7. **`messages_fts` (Virtual Table)**:
   - SQLite FTS5 table indexing `subject`, `snippet`, `fromAddr`, `toAddr`, `textBody`, with triggers updating on `messages` insert/update/delete.
8. **`messageAttachments`**:
   - Fields: `id`, `messageId`, `filename`, `contentType`, `sizeBytes`, `r2Key`, `contentId`, `disposition` (`attachment` | `inline`), `createdAt`.
9. **`threads`**:
   - Groups related messages based on `References` and `In-Reply-To` headers.
10. **`contacts`**:
    - Fields: `id`, `userId`, `name`, `email`, `avatarKey`, `source` (`inbound` | `outbound` | `manual`), `lastContactedAt`, `createdAt`.
11. **`spamTokens` & `spamFeedback`**:
    - Stores Bayesian word frequencies and user-submitted false-positive / false-negative feedback.
12. **`routingRules`**:
    - Rules per domain/mailbox: `ruleType` (`forward` | `alias` | `catchall` | `reject`), `priority`, `active`.
13. **`webhooks` & `webhookDeliveries`**:
    - Outbound event hooks with retry tracking (`deliveryId`, `attempts`, `nextRetryAt`, `lastResponseStatus`).
14. **`mfaTotp`, `mfaRecoveryCodes`, `mfaChallenges`**:
    - TOTP secret (encrypted/stored), 8 single-use hashed backup codes, and transient login challenge tokens.
15. **`passwordResetTokens`**:
    - Single-use hashed reset tokens with expiry.

> **CRITICAL SQL PARSING RULE**: When applying SQLite migrations with multiline triggers (`CREATE TRIGGER ... BEGIN ... END;`), never split SQL on raw semicolons (`;`). Use `db.executescript()` or a statement-aware parser (`splitSqlStatements`).

---

## 4. Outbound Email Engine (Resend)

### Outbound Configuration
- **Domain Strategy**: Outbound mail is routed through the verified Resend domain `mail.studyholic.xyz`.
- **Apex DMARC Alignment**: The apex domain `studyholic.xyz` has a DMARC policy (`v=DMARC1; p=none; sp=none; aspf=r; adkim=r;`) allowing DKIM-signed subdomains (`mail.studyholic.xyz`) to pass DMARC cleanly.
- **Pipeline Implementation**:
  - [`src/lib/email/send.ts`](file:///c:/Users/MITTAL/Desktop/Kanav%20Class%2011/mailflare-app/src/lib/email/send.ts): Entry point for creating messages, scheduling, storing attachments, and dispatching.
  - [`src/lib/email/resend-client.ts`](file:///c:/Users/MITTAL/Desktop/Kanav%20Class%2011/mailflare-app/src/lib/email/resend-client.ts): Sends HTTP payload to `https://api.resend.com/emails`. Converts `Uint8Array | ArrayBuffer` attachments into Base64 seamlessly.
  - [`src/lib/email/system-mail.ts`](file:///c:/Users/MITTAL/Desktop/Kanav%20Class%2011/mailflare-app/src/lib/email/system-mail.ts): Used for internal transactional emails (Password Reset tokens, MFA alerts).

### Outbound UX Innovations
- **5-Second Undo Send Buffer**:
  - The UI uses `useUndoSend` ([`src/components/compose/undo-send-context.tsx`](file:///c:/Users/MITTAL/Desktop/Kanav%20Class%2011/mailflare-app/src/components/compose/undo-send-context.tsx)) to delay API calls by 5000ms with an interactive "Undo" toast.
  - Clicking "Undo" cancels the timer and restores the composer state.
- **Scheduled Sending**: Supports future timestamp queueing via `scheduledAt`.

---

## 5. Inbound Email Intake & Routing Engine

1. **Worker Entry**: [`worker.ts`](file:///c:/Users/MITTAL/Desktop/Kanav%20Class%2011/mailflare-app/worker.ts) receives incoming email events from Cloudflare Email Routing.
2. **Parsing**: [`src/lib/email/inbound.ts`](file:///c:/Users/MITTAL/Desktop/Kanav%20Class%2011/mailflare-app/src/lib/email/inbound.ts) parses raw RFC 822 streams with `postal-mime`.
3. **Subaddressing & Alias Resolution**:
   - Addresses with `+` (e.g. `user+shop@domain.com`) or `.` subaddresses are resolved to their parent mailbox.
   - Exact alias mappings in `mailboxAliases` route directly to the assigned mailbox.
4. **Spam Assessment**:
   - The message is evaluated by [`src/lib/spam/engine.ts`](file:///c:/Users/MITTAL/Desktop/Kanav%20Class%2011/mailflare-app/src/lib/spam/engine.ts).
   - If verdict is `spam`, the message status is set to `spam` and marked as read or placed in the Junk folder.
5. **Thread Resolution**:
   - Matches existing conversations using `In-Reply-To` and `References` headers.
6. **Attachment Storage**:
   - Raw binary attachments are saved to Cloudflare R2; metadata is inserted into `messageAttachments`.
7. **Webhook Dispatch**:
   - Triggers matching webhooks in background with exponential retry scheduling.

---

## 6. Spam Classifier & Bayesian Engine

Located in [`src/lib/spam/`](file:///c:/Users/MITTAL/Desktop/Kanav%20Class%2011/mailflare-app/src/lib/spam/):
- **Analyzers**:
  - `authentication.ts`: Checks SPF, DKIM, and DMARC authentication headers.
  - `reputation.ts`: Evaluates sender domain age, disposable email providers, and known suspicious TLDs.
  - `structure.ts`: Detects suspicious MIME structures, mismatched headers, and hidden text.
  - `urls.ts`: Scans links for deceptive subdomains, IP hostnames, or URL shorteners.
  - `classifier.ts`: Computes Naive Bayesian probability tokens from subject and body text.
- **Verdict Thresholds**:
  - Score `< 30`: `inbox`
  - Score `30 - 69`: `suspicious`
  - Score `>= 70`: `spam`
- **Feedback Loop**: When users click "Report Spam" or "Not Spam", `/api/settings/spam` updates token frequencies in `spamTokens` to continuously train the filter.

---

## 7. Search Engine (FTS5 + Query Operators)

- **Engine**: SQLite Full-Text Search version 5 (`messages_fts`).
- **Operators Supported**:
  - `from:alice@example.com`
  - `to:team@domain.com`
  - `subject:"meeting notes"`
  - `has:attachment`
  - `after:2026-01-01` / `before:2026-03-01`
  - `is:unread` / `is:starred` / `is:spam`
- **Helper Utilities**: [`src/lib/search/query-utils.ts`](file:///c:/Users/MITTAL/Desktop/Kanav%20Class%2011/mailflare-app/src/lib/search/query-utils.ts) parses tokenized queries into structured SQL conditions.

---

## 8. Authentication, MFA & Security Model

- **Password Hashing**: Argon2id with salt.
- **Session Tokens**: 64-character crypto random string, stored as SHA-256 in D1 `sessions` table, passed via `MAILFLARE_SESSION` HTTP-only cookie.
- **Two-Factor Authentication (TOTP)**:
  - RFC 6238 compliant (SHA-1, 6 digits, 30-second window).
  - Setup displays SVG QR code and secret in [`src/components/settings/mfa-settings.tsx`](file:///c:/Users/MITTAL/Desktop/Kanav%20Class%2011/mailflare-app/src/components/settings/mfa-settings.tsx).
  - Generates 8 single-use, 8-character recovery codes (hashed before saving).
- **Two-Step Login Flow**:
  1. `/api/auth/login` checks email/password.
  2. If MFA is active, returns `{ requireMfa: true, challengeToken: "..." }`.
  3. Client posts TOTP code or recovery code to `/api/auth/mfa/challenge` to finalize the session.
- **Password Reset**:
  - User enters email at `/forgot-password`.
  - Single-use hashed token link is emailed via `src/lib/email/system-mail.ts`.
  - `/reset-password?token=...` accepts new password and invalidates all existing sessions.

---

## 9. UI Design System & Obsidian Dark Mode

### Color System & Design Language
We adhere strictly to the **Obsidian Dark Mode** design system. Generic gray backgrounds and unstyled white components are prohibited.

| Surface / Element | Light Mode | Obsidian Dark Mode Class |
| :--- | :--- | :--- |
| **App Layout Background** | `#f6f8fc` | `dark:bg-[#0f1015]` |
| **Main Content / Cards** | `#ffffff` | `dark:bg-[#15161b]` |
| **Inner Panels / Settings Cards** | `#f9fafb` / `#ffffff` | `dark:bg-[#18191e]` / `dark:bg-[#1a1b20]` |
| **Borders & Dividers** | `border-neutral-200` | `dark:border-neutral-800` |
| **Primary Text** | `text-neutral-900` | `dark:text-neutral-100` / `dark:text-[#f1f3f5]` |
| **Secondary / Muted Text** | `text-neutral-500` | `dark:text-neutral-400` / `dark:text-[#9ca3af]` |
| **Search Bar Container** | `bg-[#eaf1fb]` | `dark:bg-[#18191e] dark:border dark:border-neutral-800` |
| **Accent / Action Buttons** | `bg-blue-600` | `hover:bg-blue-500 text-white` |

### Critical UI Guidelines
1. **Always provide dark variants**: Every new component, modal, input, and table cell must include matching `dark:` utility classes.
2. **Safe JSON Parsing**: Always parse API responses safely to avoid client crash `Runtime SyntaxError: Unexpected end of JSON input`. Use `res.text()` first, verify truthiness, and parse within `try/catch`.
3. **Keyboard Navigation**: Dashboard layout must be wrapped with `<ShortcutsProvider>` to ensure `/` (search focus), `⌘K` (command palette), `c` (compose), and `g i` (go to inbox) hotkeys function globally.

---

## 10. Mailbox Identity & Multi-tenancy Rules

- **Primary Identity Rule**:
  - Only the primary mailbox (`isPrimary = true` and `type = 'personal'`) carries the user's account name and avatar.
  - Sibling/secondary mailboxes own their own distinct `displayName` and `avatarKey`.
  - Editing profile name or account settings syncs ONLY to the primary identity mailbox.
- **Shared Mailboxes**:
  - Mailboxes can be marked as `shared` with distinct permissions: `read_only`, `send_as`, `send_on_behalf`, or `full_access`.

---

## 11. Directory Structure

```
mailflare-app/
├── drizzle/                     # D1 Database Migrations (0000 - 0031)
├── mobile/                      # React Native (Expo) Companion Mobile App
│   ├── src/
│   │   ├── api/                 # Mobile API Client (Bearer Token Auth)
│   │   ├── components/          # Avatar, EmailRow, SkeletonLoader, MailboxSheet
│   │   ├── context/             # AuthContext & Session Store (expo-secure-store)
│   │   ├── screens/             # LoginScreen, InboxScreen, MessageDetail, Compose, Settings
│   │   └── types/               # Mobile TypeScript Data Contracts
│   ├── app.json                 # Expo Application Configuration
│   ├── App.tsx                  # Root Native Stack Navigator
│   └── package.json             # Mobile Dependencies & Scripts
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (admin)/             # Admin Dashboard & Domain Provisioning
│   │   ├── (auth)/              # Login, Register, MFA, Password Reset
│   │   ├── (dashboard)/         # Inbox, Starred, Sent, Drafts, Spam, Trash
│   │   ├── (settings)/          # Settings (Account, MFA, Inbox, Spam, Shortcuts)
│   │   └── api/                 # REST API endpoints
│   ├── components/              # UI Components
│   │   ├── auth/                # Auth guards, login challenges
│   │   ├── command-palette/     # Command palette (⌘K)
│   │   ├── compose/             # Rich text composer, floating composer, undo send
│   │   ├── contacts/            # Contact cards, avatars, details
│   │   ├── mail-search/         # FTS5 search input & filter pills
│   │   ├── messages/            # Message thread, conversation viewer, spam badges
│   │   ├── settings/            # MFA settings, Spam toggles, Domain routing
│   │   ├── shortcuts/           # Hotkeys context, cheat sheet dialog
│   │   └── ui/                  # Radix UI primitives (dialog, button, switch, tooltip)
│   ├── db/                      # Database connection and Drizzle schema
│   │   └── schema/index.ts      # Authoritative database schema definition
│   ├── hooks/                   # Custom React hooks
│   └── lib/                     # Core Business Logic & Engines
│       ├── auth/                # Sessions, TOTP, MFA, recovery codes, password reset
│       ├── cloudflare/          # Cloudflare environment & binding helpers
│       ├── contacts/            # Contact management & Gravatar resolution
│       ├── domains/             # Domain provisioning, DNS health scores, routing rules
│       ├── email/               # Resend client, send engine, inbound parsing, attachments
│       ├── search/              # FTS5 search conditions, query parsing
│       ├── spam/                # Bayesian engine, SPF/DKIM analyzers, weights
│       └── validators.ts        # Zod validation schemas
├── tests/                       # Node test suites (identity scope, schema bootstrap)
├── worker.ts                    # Cloudflare Email Routing worker script
├── wrangler.jsonc               # Cloudflare configuration and bindings
└── AGENTS.md                    # This document
```

---

## 12. Golden Rules for AI Agents Working on this Codebase

1. **NEVER RUN `git push`**: Do not push commits or tags to the remote repository unless the user explicitly types the command to push.
2. **DO NOT RUN `npm run build` UNNECESSARILY**: Full production builds take significant time. Validate code using `npx tsc --noEmit` and `node --test tests/*.test.mjs`.
3. **PRESERVE RESEND OUTBOUND ENGINE**: Never replace or degrade the Resend outbound delivery pipeline or break the `mail.studyholic.xyz` apex DMARC routing.
4. **PRESERVE OBSIDIAN DARK THEME**: Always use Obsidian dark tokens (`dark:bg-[#0f1015]`, `dark:bg-[#15161b]`, `dark:border-neutral-800`). Never introduce unstyled bright white containers or raw unstyled components.
5. **RESPECT IDENTITY SCOPE**: Sibling mailboxes must keep their own names and avatars. Only primary identity mailboxes follow profile changes.
6. **MAINTAIN TEST COVERAGE**: Ensure all test suites in `tests/` pass with 100% success before concluding tasks.
