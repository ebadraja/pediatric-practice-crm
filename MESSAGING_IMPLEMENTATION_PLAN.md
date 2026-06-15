# Patient Messaging System — Implementation Plan

**Project:** Klara replacement module for Kids 0-18 CRM  
**Version:** 1.0  
**Date:** June 14, 2026  
**References:** `REQUIREMENTS.md`, `SCHEMA_DESIGN.md`, `codebase_integration_file_map.html`

---

## Overview

This plan breaks the messaging module into **milestones** ordered by dependency. Each milestone has clear **acceptance criteria** that must pass before moving on.

**Delivery phases:**

| Phase | Milestones | New external services |
|-------|------------|----------------------|
| **Phase 1** — Web messaging foundation | M0 → M7 | None (Supabase Realtime already in stack) |
| **Phase 2** — SMS & automation | M8 → M11 | Twilio (or Telnyx) + file storage |
| **Phase 3** — Advanced features | M12 → M13 | Optional upgrades only |

**Architecture principle:** Extend existing patterns — Next.js App Router, Prisma, NextAuth (staff), BullMQ worker, shadcn/ui, `(dashboard)` layout for staff, separate `(portal)` layout for patients.

---

## Milestone Map

```
M0  Prerequisites
 └─ M1  Database schema
     └─ M2  Core messaging API
         └─ M3  Staff unified inbox UI
             ├─ M4  Patient portal
             ├─ M5  Web chat widget
             └─ M6  Real-time & notifications
                 └─ M7  Templates, inboxes, assignment, settings
                     └─ M8  SMS (Twilio)
                         └─ M9  Automated messaging
                             └─ M10  Unified timeline & integrations
                                 └─ M11  File exchange
                                     └─ M12  Broadcasts & analytics
                                         └─ M13  Advanced features
```

---

## M0 — Prerequisites & Security Baseline

**Goal:** Resolve blockers before any message content is stored or transmitted.

**Scope:**
- Upgrade `lib/crypto.ts` from XOR obfuscation to **AES-256-GCM** for message content and sensitive fields
- Ensure production runs over **HTTPS** before go-live (currently HTTP on VPS intake-forms path)
- Add environment variables: `PORTAL_SECRET`, `MESSAGING_ENCRYPTION_KEY` (or reuse existing secret with GCM)
- Update `proxy.ts` to whitelist public routes: `/portal/*`, `/api/portal/*`, `/api/webchat/*`, `/api/webhooks/twilio`
- Document Twilio BAA requirement for Phase 2 (do not send PHI via SMS until BAA signed)

**Files touched:** `lib/crypto.ts`, `proxy.ts`, `.env.example` (if present), deployment config

### Acceptance Criteria

- [x] `lib/crypto.ts` encrypt/decrypt round-trips with AES-256-GCM; existing email encryption still works
- [x] Unit test or script confirms encrypted ciphertext differs from plaintext and decrypts correctly
- [x] `proxy.ts` allows unauthenticated access to portal and webchat API routes; staff routes remain protected
- [x] No message PHI is written to database before M0 is complete
- [x] HTTPS deployment path documented and scheduled before production launch _(Hostinger VPS — handled at deploy)_

---

## M1 — Database Schema & Migrations

**Goal:** Add all messaging tables to Prisma and deploy migration.

**Scope:**
- Add 8 enums and 10 models per `SCHEMA_DESIGN.md`:
  - `Conversation`, `Message`, `SharedInbox`, `SharedInboxMember`, `MessageTemplate`, `MessagingAutomationRule`, `ConversationAssignmentLog`, `PatientPortalSession`, `Broadcast`, `SMSOptOut`
- Extend existing models:
  - `Patient` — `conversation` relation, `smsOptOut` field
  - `User` — assignment, sent messages, inbox memberships, template/broadcast creator relations
  - `Settings` — `messagingEnabled`, `smsProviderConfig`, `messagingBusinessHours`, `defaultRoutingRules`, `webChatWidgetConfig`, `portalConfig`
  - `Notification` — new types: `NEW_MESSAGE`, `MESSAGE_ASSIGNED`, `CONVERSATION_ESCALATED`, `BROADCAST_COMPLETED`
  - `AuditLog` — new actions: `MESSAGE_SENT`, `MESSAGE_READ`, `CONVERSATION_ASSIGNED`, `CONVERSATION_RESOLVED`, `PORTAL_ACCESS`, `BROADCAST_SENT`
- Single migration: `prisma/migrations/add_messaging_system/`
- Run `prisma generate`; verify `lib/generated/prisma` updates

**Files touched:** `prisma/schema.prisma`, new migration folder

### Acceptance Criteria

- [x] `npx prisma migrate deploy` succeeds against dev/staging database _(run locally: `npx prisma migrate deploy`)_
- [x] `npx prisma generate` completes without errors
- [ ] All 10 new models queryable via Prisma client in a smoke script
- [ ] Cascade deletes work: deleting a `Patient` removes their `Conversation` and `Message` records
- [ ] `Patient.conversation` is unique (one conversation per patient enforced at DB level)
- [ ] Seed script (optional) can create sample conversation + messages for dev testing

---

## M2 — Core Messaging API

**Goal:** Staff-authenticated REST API for conversations and messages.

**Scope:**
- `app/api/messaging/conversations/route.ts` — GET list (filters: status, assignedTo, inbox, search), POST create
- `app/api/messaging/conversations/[id]/route.ts` — GET detail, PATCH status/assignment metadata
- `app/api/messaging/conversations/[id]/messages/route.ts` — GET paginated messages, POST send (staff)
- `app/api/messaging/conversations/[id]/assign/route.ts` — POST assign/reassign + `ConversationAssignmentLog`
- `app/api/messaging/conversations/[id]/notes/route.ts` — POST internal note (`isInternalNote: true`)
- `lib/messaging/mergeTags.ts` — resolve `{{patient.firstName}}`, `{{appointment.date}}`, etc.
- `lib/messaging/router.ts` — route by `MessageReason` to default shared inbox
- Message content encrypted at rest on write; decrypted on read
- Audit log entries on send, read, assign, resolve

**Files touched:** `app/api/messaging/**`, `lib/messaging/**`

### Acceptance Criteria

- [x] Authenticated staff can list conversations with pagination and inbox filters
- [x] Staff can open a conversation and retrieve message history in chronological order
- [x] Staff can send a text message; it persists encrypted in `Message.content`
- [x] Staff can post an internal note; API marks `isInternalNote: true`
- [x] Staff can assign conversation to user or shared inbox; assignment log row created
- [x] Staff can PATCH conversation status: OPEN → RESOLVED → ARCHIVED (and reopen)
- [x] Unauthenticated requests to messaging API return 401
- [x] `AuditLog` records MESSAGE_SENT and CONVERSATION_ASSIGNED actions

---

## M3 — Staff Unified Inbox UI

**Goal:** Three-panel messaging page inside existing dashboard layout.

**Scope:**
- `app/(dashboard)/messaging/page.tsx` — unified inbox
- `app/(dashboard)/messaging/[conversationId]/page.tsx` — deep-link to conversation
- `components/messaging/`:
  - `ConversationList.tsx`, `ConversationThread.tsx`, `PatientContextPanel.tsx`
  - `MessageComposer.tsx`, `MessageBubble.tsx`, `InternalNote.tsx`
  - `InboxTabs.tsx`, `AssignmentDialog.tsx`
- `components/sidebar.tsx` — add "Messaging" nav item (unread badge wired in M6)
- Right panel pulls patient demographics, appointments, call logs from existing APIs

**Files touched:** `app/(dashboard)/messaging/**`, `components/messaging/**`, `components/sidebar.tsx`

### Acceptance Criteria

- [x] Messaging appears in sidebar; navigates to `/messaging`
- [x] Three-panel layout renders: inbox list (left), thread (center), patient context (right)
- [x] Inbox tabs work: All, Unassigned, My Inbox (shared inboxes added in M7)
- [x] Clicking a conversation loads thread; selected state visible in list
- [x] Staff can compose and send a reply from UI; thread updates without full page reload
- [x] Internal notes render with amber/lock styling; visually distinct from patient-visible messages
- [x] Channel badges shown on messages (WEB_CHAT, PORTAL, SYSTEM placeholders until M4/M5)
- [x] Patient context panel shows linked patient record, upcoming appointments, recent call logs
- [x] Deep link `/messaging/[conversationId]` opens correct conversation
- [x] Mobile: usable layout (list ↔ thread toggle or stacked view)

---

## M4 — Patient Portal

**Goal:** Standalone mobile-first portal for parents/guardians — no CRM chrome.

**Scope:**
- `app/portal/layout.tsx` — minimal branding (logo, practice name from Settings) _(route group `(portal)` optional; public URLs are `/portal/*`)_
- `app/portal/page.tsx` — phone entry
- `app/portal/verify/page.tsx` — redirects to main auth flow (DOB step inline in `PortalAuth`)
- `app/portal/chat/page.tsx` — conversation view
- `app/portal/chat/[token]/page.tsx` — magic link entry
- `app/api/portal/auth/route.ts` — magic link gen, SMS code, DOB verify
- `app/api/portal/session/route.ts` — validate portal session token
- `app/api/portal/messages/route.ts` — patient send/receive (scoped to own conversation)
- `lib/messaging/portalAuth.ts` — token hashing, 30-day session persistence
- `components/portal/PortalAuth.tsx`, `PortalChat.tsx`, `PortalHeader.tsx`
- Patient must select `MessageReason` when starting a new thread

**Files touched:** `app/portal/**`, `app/api/portal/**`, `components/portal/**`, `lib/messaging/portalAuth.ts`

### Acceptance Criteria

- [x] Portal renders without CRM sidebar or staff header
- [x] Patient receives magic link (email/SMS stub OK in dev); clicking opens verify flow _(via `createMagicLinkSession` + `/portal/chat/[token]`)_
- [x] DOB verification succeeds for matching patient; fails gracefully for mismatch
- [x] After verify, patient sees chat-style conversation history
- [x] Patient can send a message; it appears in staff CRM inbox (M3)
- [x] Patient can select reason (Scheduling, Refill, Question, Urgent, etc.) on new conversation
- [x] Session persists 30 days on same device (cookie/token); re-verify DOB after expiry
- [x] Fallback flow: portal URL → phone → SMS code → DOB verify
- [x] Internal staff notes are **never** returned by portal API
- [x] Portal is mobile-responsive; touch targets ≥ 44px
- [x] `PatientPortalSession` record created with hashed token and expiry

---

## M5 — Web Chat Widget

**Goal:** Embeddable website chat that feeds the unified inbox.

**Scope:**
- `public/webchat-widget.js` — single script tag embed (< 50KB gzipped target)
- `app/api/webchat/init/route.ts` — widget config (branding, hours, welcome message from Settings)
- `app/api/webchat/message/route.ts` — visitor send; creates or resumes conversation
- Auto-match visitor to patient by phone number (`lib/messaging/patientMatcher.ts` or reuse hippatizer patterns)
- Channel: `WEB_CHAT`; tag messages in CRM thread
- Offline mode: outside business hours → capture message + set expectations

**Files touched:** `public/webchat-widget.js`, `app/api/webchat/**`, `lib/messaging/patientMatcher.ts`, `lib/messaging/webchatSession.ts`, `lib/messaging/businessHours.ts`

### Acceptance Criteria

- [x] Widget loads on external HTML page via one `<script>` tag
- [x] New visitor prompted for name, phone, reason before first message
- [x] Visitor message creates conversation (or appends to existing by phone match)
- [x] Message appears in CRM unified inbox with WEB_CHAT channel indicator
- [x] Staff reply from CRM delivered to widget in real time while visitor is on page _(2s polling via M6)_
- [x] Widget matches existing patient by phone when record exists
- [x] Unknown phone creates conversation linked to unmatched state for staff to link/create patient _(placeholder patient with medical note)_
- [x] Offline mode shows appropriate message outside configured business hours
- [ ] Widget bundle < 50KB gzipped _(verify at deploy)_
- [x] Basic rate limiting on widget message endpoint

---

## M6 — Real-Time Delivery & Notifications

**Goal:** Instant message delivery and staff alerts.

**Scope:**
- `lib/messaging/realtime.ts` — Supabase Realtime subscriptions on `Message` / `Conversation` changes
- Wire realtime into CRM inbox (M3), patient portal (M4), webchat widget (M5)
- Extend `app/api/notifications/route.ts` for `NEW_MESSAGE`, `MESSAGE_ASSIGNED`
- Sidebar unread badge on Messaging nav item
- Auto-open conversation status on new patient message; AWAITING_REPLY on staff reply
- Optional: browser push notifications (Phase 2 nice-to-have; defer if needed)

**Files touched:** `lib/messaging/realtime.ts`, messaging/portal/widget UI files, `app/api/notifications/**`, `components/sidebar.tsx`, `app/api/dashboard/route.ts` (stub KPIs)

### Acceptance Criteria

- [x] New patient message appears in staff inbox within 2 seconds without manual refresh _(2s polling)_
- [x] Staff reply appears in patient portal within 2 seconds without manual refresh _(2s polling)_
- [x] Staff reply appears in webchat widget within 2 seconds while visitor is connected _(2s polling)_
- [x] New message creates `Notification` with `actionUrl` pointing to conversation
- [x] Sidebar Messaging item shows unread count badge
- [x] Conversation `unreadCount` increments on patient message; decrements on staff read
- [x] Conversation status auto-updates per FR-506 (open on patient message, awaiting reply on staff response)
- [x] Supabase Realtime connection errors fail gracefully (polling fallback acceptable for v1) _(polling-only v1; optional Supabase when env vars set)_

---

## M7 — Templates, Shared Inboxes, Assignment & Settings

**Goal:** Complete Phase 1 staff tooling and configuration.

**Scope:**
- `app/api/messaging/templates/route.ts` + `[id]/route.ts` — CRUD message templates
- `app/api/messaging/shared-inboxes/route.ts` — CRUD shared inboxes + member subscriptions
- `components/messaging/TemplatePicker.tsx` — quick-insert in composer
- `app/(dashboard)/settings/page.tsx` — add **Messaging** tab (15th tab):
  - Enable/disable messaging
  - Business hours, default routing rules
  - Web chat widget config (colors, welcome message)
  - Portal config
- Default shared inboxes seeded: Scheduling, Refills, Clinical, Billing
- Search conversations by patient name, phone, message content, date range

**Files touched:** `app/api/messaging/templates/**`, `app/api/messaging/shared-inboxes/**`, `components/messaging/TemplatePicker.tsx`, `app/(dashboard)/settings/page.tsx`

### Acceptance Criteria

- [ ] Staff can create/edit/delete message templates with merge tags
- [ ] Template picker in composer inserts body and resolves tags for preview
- [ ] Admin can create shared inbox; staff can subscribe/unsubscribe
- [ ] Inbox tabs include shared inboxes (Scheduling, Refills, etc.)
- [ ] Messages routed to correct inbox based on patient-selected reason
- [ ] Settings Messaging tab saves and loads `messagingEnabled`, widget config, business hours
- [ ] Search returns conversations matching patient name, phone, or message content
- [ ] **Phase 1 complete:** all Phase 1 acceptance criteria from requirements doc pass (see checklist below)

### Phase 1 Final Checklist

- [ ] Staff accesses Messaging from sidebar and manages conversations end-to-end
- [ ] Patient uses magic link + DOB → sends/receives messages in portal
- [ ] Website visitor uses widget → staff sees message in inbox
- [ ] Assignment, internal notes, templates, shared inboxes all functional
- [ ] Real-time delivery and notifications working
- [ ] No new external service dependencies required

---

## M8 — SMS via Twilio (Phase 2 Start)

**Goal:** Two-way SMS on a dedicated practice number.

**Scope:**
- `app/api/webhooks/twilio/route.ts` — inbound SMS + delivery status callbacks
- `lib/messaging/smsProvider.ts` — Twilio send/receive abstraction
- `services/messageQueue.ts` — BullMQ queue for outbound SMS (retry, rate limit)
- `worker.ts` — register message queue processor alongside email worker
- `SMSOptOut` model enforcement — STOP/START keyword handling (TCPA)
- `Settings.smsProviderConfig` — Twilio credentials UI
- Inbound SMS matched to patient by phone; unknown numbers create unmatched conversation
- Rate limiting: max messages per patient per hour

**Prerequisites:** Twilio account, HIPAA-eligible product, **BAA signed**

**Files touched:** `app/api/webhooks/twilio/**`, `lib/messaging/smsProvider.ts`, `services/messageQueue.ts`, `worker.ts`, settings UI

### Acceptance Criteria

- [ ] Practice SMS number provisioned and configured in Settings
- [ ] Staff sends message from CRM → delivered to patient phone via SMS
- [ ] Patient replies via SMS → appears in CRM conversation thread within 5 seconds (API)
- [ ] Delivery status tracked: QUEUED → SENT → DELIVERED / FAILED with reason
- [ ] Patient texting STOP opts out; START re-subscribes; `SMSOptOut` + `Patient.smsOptOut` updated
- [ ] Opted-out patients excluded from outbound SMS
- [ ] SMS send failures queued for retry; graceful degradation when Twilio unavailable
- [ ] No PHI in SMS body until BAA confirmed (or messages kept generic with portal link)
- [ ] `externalMessageId` stores Twilio SID on `Message` records

---

## M9 — Automated Messaging Workflows

**Goal:** Event-driven SMS/portal messages; coordinate with email engine.

**Scope:**
- `app/api/messaging/automation-rules/route.ts` — CRUD `MessagingAutomationRule`
- `services/messageScheduler.ts` — cron (mirror `emailScheduler.ts` pattern)
- Triggers: appointment reminder (48h/24h/2h), no-show follow-up, new patient welcome, intake form due
- `worker.ts` — run message scheduler
- `services/emailScheduler.ts` — coordinate with email rules to prevent duplicate reminders
- Idempotent execution: same event + patient + rule does not send twice
- Optional: confirm/cancel/reschedule quick-reply handling on SMS

**Files touched:** `app/api/messaging/automation-rules/**`, `services/messageScheduler.ts`, `services/emailScheduler.ts`, `worker.ts`, settings UI

### Acceptance Criteria

- [ ] Admin creates automation rule: trigger, delay, template, channel (SMS/portal/both)
- [ ] Appointment reminder fires at configured offset before `Appointment.startTime`
- [ ] No-show follow-up fires X hours after NO_SHOW status
- [ ] New patient welcome message sends on patient record creation (when rule active)
- [ ] Intake form link auto-sent on booking for configured appointment types
- [ ] Duplicate send prevented for same trigger event + appointment + patient
- [ ] If email reminder already sent for same appointment, SMS reminder is skipped (coordination logic)
- [ ] Inactive rules do not fire
- [ ] Automation runs via worker cron without blocking Next.js request cycle

---

## M10 — Unified Timeline & Module Integrations

**Goal:** One chronological view per patient across all channels.

**Scope:**
- Unified timeline API: interleave messages, appointments, call logs (Maya/Vapi), email logs, intake form events
- `app/api/webhooks/vapi/route.ts` — emit system messages on book/cancel/callback
- HIPPAtizer: sending form links via messaging (M7 templates); submission → system message in thread
- `app/api/dashboard/route.ts` — messaging KPIs: messages today, open conversations, avg response time
- Patient context / timeline UI in right panel or dedicated tab
- System messages use `MessageContentType.SYSTEM_EVENT`, channel `SYSTEM`

**Files touched:** timeline API, `app/api/webhooks/vapi/route.ts`, dashboard API/UI, messaging UI

### Acceptance Criteria

- [ ] Timeline shows messages, appointments, call logs, emails, intake submissions in chronological order
- [ ] Vapi booking creates system message in patient conversation
- [ ] Vapi cancellation creates system message in patient conversation
- [ ] Staff can send HIPPAtizer form link from composer; patient receives as FORM_LINK message
- [ ] Form submission webhook creates system message ("Intake form completed: …")
- [ ] Dashboard shows messages today, open conversation count, average first-response time
- [ ] Timeline accessible from patient detail and/or messaging context panel

---

## M11 — File & Document Exchange

**Goal:** Secure file sharing in conversations.

**Scope:**
- Staff attach files in composer; patients upload from portal (and optionally webchat)
- Storage: Supabase Storage or S3 (HIPAA/BAA)
- Files linked to existing `Document` model + `Message.metadata`
- `MessageContentType.FILE` / `IMAGE`; thumbnail for images, download link for PDFs
- Configurable file type whitelist and max size in Settings
- Encrypted storage; no PHI in URLs/logs

**Files touched:** messaging API, portal API, storage config, `Document` integration, UI components

### Acceptance Criteria

- [ ] Staff attaches PDF/image in CRM composer; patient downloads from portal
- [ ] Patient uploads photo/document from portal; staff sees in thread
- [ ] File stored securely; `Document` record created and linked to patient
- [ ] Disallowed file types rejected with clear error
- [ ] Oversized files rejected per configured limit
- [ ] Image messages show thumbnail preview; other types show download link
- [ ] File access logged in `AuditLog`

---

## M12 — Broadcasts & Analytics (Phase 3)

**Goal:** Bulk messaging and operational reporting.

**Scope:**
- `app/api/messaging/broadcasts/route.ts` — create, schedule, send, cancel broadcasts
- Audience segmentation: age, insurance, last visit, appointment type, tags
- Broadcast messages appear as system messages in each recipient thread
- Respect `SMSOptOut` for SMS broadcasts
- Preview: recipient count + rendered message before send
- Reports: response times by staff/inbox, channel distribution, volume trends, template usage
- Extend `app/(dashboard)/reports/page.tsx`

**Files touched:** `app/api/messaging/broadcasts/**`, reports UI, message queue for batch send

### Acceptance Criteria

- [ ] Admin creates broadcast with template + segment filters
- [ ] Preview shows estimated recipient count and rendered sample
- [ ] Scheduled broadcast sends at configured time via worker
- [ ] Each recipient gets system message in their conversation thread
- [ ] SMS broadcast excludes opted-out patients
- [ ] Delivery tracking: sent, delivered, failed counts on `Broadcast` record
- [ ] Reports show channel distribution and conversation volume trends
- [ ] Average first-reply time report available by staff member and inbox

---

## M13 — Advanced Features (Phase 3)

**Goal:** Polish, compliance, and power-user features.

**Scope (prioritize per practice need):**
- Read receipts and typing indicators (portal + webchat)
- MMS via Twilio (image SMS)
- Conversation escalation: unassigned inbox unresponded X minutes → admin alert
- Teen portal access (ages 13–18) per Washington state teen rights
- Keyboard shortcuts in CRM inbox (next/prev, reply, assign, resolve)
- Template usage analytics
- Browser push notifications for staff
- Widget: returning visitor resume by fingerprint; branding from Settings

### Acceptance Criteria

- [ ] At least 3 of the above features implemented and demoed per practice priority list
- [ ] Teen portal access enforces documented access rules (separate entry or scoped data)
- [ ] Escalation notification fires when threshold exceeded
- [ ] Read receipts visible to patient when staff reads message (if feature selected)
- [ ] **Phase 3 complete:** broadcast + analytics milestones (M12) still pass regression

---

## Cross-Milestone Dependencies

| Dependency | Blocks |
|------------|--------|
| M0 crypto + HTTPS | All production use |
| M1 schema | M2–M13 |
| M2 API | M3 UI, M4 portal API, M5 widget API |
| M3 UI | M6 realtime (staff side), M7 templates |
| M4 portal | M6 realtime (patient side), Phase 1 acceptance |
| M5 widget | M6 realtime (widget side), Phase 1 acceptance |
| M6 realtime | Phase 1 acceptance |
| M7 settings | Phase 1 complete |
| M8 Twilio + BAA | M9 SMS automation, M12 SMS broadcasts |
| M9 automation | M10 intake auto-send |
| M10 integrations | Full timeline value |
| M11 files | Phase 2 file acceptance |

---

## Testing Strategy (Per Milestone)

- **API:** Vitest integration tests for messaging routes (extend `tests/` pattern from email module)
- **E2E smoke:** Manual checklist per milestone acceptance criteria
- **Security:** Verify internal notes never leak to portal API; audit log coverage
- **Load:** Conversation list with 500+ threads remains responsive
- **Realtime:** Two browser sessions (staff + patient) message round-trip < 2s

---

## Estimated Timeline

| Milestone | Estimate | Cumulative |
|-----------|----------|------------|
| M0 | 2–3 days | ~3 days |
| M1 | 2–3 days | ~1 week |
| M2 | 4–5 days | ~2 weeks |
| M3 | 5–7 days | ~3 weeks |
| M4 | 5–7 days | ~4 weeks |
| M5 | 3–4 days | ~5 weeks |
| M6 | 3–4 days | ~5.5 weeks |
| M7 | 3–4 days | **~6 weeks (Phase 1)** |
| M8 | 5–7 days | ~7.5 weeks |
| M9 | 4–5 days | ~8.5 weeks |
| M10 | 4–5 days | ~9.5 weeks |
| M11 | 3–4 days | **~10 weeks (Phase 2)** |
| M12 | 5–7 days | ~11.5 weeks |
| M13 | 5–7 days | **~12–13 weeks (Phase 3)** |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-14 | Initial implementation plan with 14 milestones |
| 1.1 | 2026-06-14 | M4 patient portal complete; M5 web chat widget scaffolded (realtime deferred to M6) |
| 1.2 | 2026-06-14 | M5 session fix + M6 realtime via 2s polling, staff notifications, sidebar unread badge |
