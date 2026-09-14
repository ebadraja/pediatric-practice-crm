# Retell Agent Settings & Usage — Implementation Prompt

> **Paste this whole file to the implementing agent, or point it at this path.**
> Scope is deliberately narrow: **two features only** — a live *Agent Settings*
> panel and a live *Usage & Billing* panel, both backed by the Retell AI API.
> Nothing about call ingestion, webhooks, transcripts, or appointment booking
> is in scope. See "Out of scope" at the bottom and respect it.

---

## 1. Mission

Port two proven features from a sibling dashboard (`hvac-riley-dashboard`, a
Vapi-based voice-agent console) into this project:

1. **Agent Settings** — read the live voice agent's configuration from the
   provider, show the read-only stack (model / voice / transcriber), and let an
   admin edit the **greeting**, the **system prompt**, and the **transfer
   number**, writing changes back to the provider.
2. **Usage & Billing** — pull real call records for this agent, compute
   minutes, show what the provider actually charged (with a cost breakdown),
   apply a client-facing rate card, and chart daily usage over a selectable
   period (this month / 7d / 30d).

**The source dashboard uses Vapi. This project must use Retell AI instead.**
Section 4 is the technology-shift plan; it is the most important part of this
document because Retell's object model is *not* a drop-in for Vapi's.

---

## 2. Non-negotiable ground rules

These come from `cursorrules` and `AGENTS.md` in this repo. Breaking any of
them is a failed implementation, no matter how well the feature works.

1. **Next.js 16.2.6 has breaking changes.** Read the relevant guide in
   `node_modules/next/dist/docs/` before writing route handlers or pages. Do
   not write Next.js code from memory.
2. **Check what already exists before building anything.** Several pieces of
   this feature are already half-present (see section 3).
3. Use the Prisma singleton from `lib/prisma.ts`. Never construct `PrismaClient`.
4. Use shadcn/ui primitives from `components/ui/`. **Do not install any UI
   library, chart library, or icon set.** `recharts` and `lucide-react` are
   already here; use those.
5. **Tailwind classes only — no inline styles, no CSS modules.** The source
   dashboard is written entirely in inline styles; you are porting *behaviour
   and data flow*, not its markup. Every ported component must be rewritten in
   this project's Tailwind + shadcn idiom, including `dark:` variants, which
   this codebase uses everywhere.
6. Settings live in the **singleton `Settings` table**. Do not create a new
   config table. Follow the existing `snake_case` `@map()` convention.
7. API routes follow `app/api/settings/hippatizer/route.ts` — read it first and
   copy its shape exactly.
8. Encrypt secrets with `lib/crypto.ts` (`encrypt` / `decrypt`). **Note:** the
   hippatizer route has its own inline XOR helpers; that is legacy. Use
   `lib/crypto.ts` for new fields — its `decrypt()` already reads both formats.
9. Auth on every route: `import { auth } from '@/auth'`, then gate on
   `session.user.role !== 'ADMIN'` for anything that reads or writes provider
   credentials.
10. Write an `auditLog` row for every credential or agent-config mutation. This
    is a HIPAA-sensitive codebase.
11. `sonner` is referenced in `cursorrules` but is **not installed**. Do not add
    it. Use inline status/error text, as `components/messaging/MessagingSettingsTab.tsx`
    does.
12. Never touch `auth.ts`, `auth.config.ts`, or `proxy.ts`.

---

## 3. What already exists here (read before you build)

| Thing | Where | State |
|---|---|---|
| "AI Voice Agent" settings tab | `app/(dashboard)/settings/page.tsx` ~line 761 | Exists but is **local-DB only** — agent name, a hardcoded 3-voice `<select>`, greeting textarea, and three personality sliders. Nothing talks to a provider. |
| "Billing & Subscription" tab | same file, ~line 1818 | "Usage This Month" is **hardcoded fake data** (`687 / 1000` voice calls, etc.). This is what the new usage panel replaces. |
| Voice-agent columns | `prisma/schema.prisma`, `Settings` model, "Voice agent (Vapi / 11labs)" block | `voiceAgentEnabled`, `voiceAgentName`, `voiceProvider`, `voiceId`, `greetingMessage`, `toneSlider`, `speedSlider`, `empathySlider`, `emergencyPhone`. **No API key and no agent ID fields exist yet.** |
| Settings page size | `app/(dashboard)/settings/page.tsx` | **1964 lines / 99 KB.** Do not grow it further inline. |
| Extracted-tab pattern | `components/messaging/MessagingSettingsTab.tsx` | The precedent for a large tab living in its own client component. Follow it. |
| Credential-settings route pattern | `app/api/settings/hippatizer/route.ts` | GET + **PUT** (not PATCH), admin gate, encrypt-on-write, never return the secret — only `hasApiKey`, audit log, `{ error }` responses, `console.error('[SETTINGS_X]', e)`. |
| Charts | `app/(dashboard)/reports/page.tsx`, `app/(dashboard)/email/campaigns/page.tsx` | Existing `recharts` usage — match it for the daily-usage chart. |

**Decisions implied by the above (follow them):**

- Extend the **existing `ai` tab** rather than adding a new one. Move its body
  into `components/voice/RetellAgentTab.tsx` first, then add the live panel.
- Put usage into the **existing `billing` tab** as
  `components/voice/RetellUsageTab.tsx`, replacing the fake "Usage This Month"
  card. Leave "Current Plan" and "Billing History" alone.
- Keep the existing personality sliders and `voiceAgentEnabled` toggle working
  exactly as they do now — they are local presentation state, unrelated to
  Retell, and nothing else in this plan should disturb them.

---

## 4. Technology shift: Vapi → Retell

This is where a naive port breaks. Vapi keeps the prompt, the tools and the
voice on **one** assistant object. Retell splits them across **two** objects
and adds **versioning**.

### 4.1 Object model

```
VAPI                                  RETELL
────────────────────────────────      ─────────────────────────────────────────
Assistant                             Agent
  .firstMessage                  ->     (lives on the LLM, not the agent)
  .model.messages[role=system]   ->     (lives on the LLM, not the agent)
  .model.provider/.model         ->     RetellLlm.model
  .voice.provider/.voiceId       ->     Agent.voice_id + Agent.voice_model
  .transcriber.provider/.model   ->     Agent.stt_mode / language  (VERIFY)
  .model.toolIds[] -> Tool obj   ->     RetellLlm.general_tools[]
                                        Agent.response_engine.llm_id ──┐
                                                                       │
                                        RetellLlm  <───────────────────┘
                                          .general_prompt   (system prompt)
                                          .begin_message    (first message)
                                          .general_tools[]  (incl. transfer_call)
```

**Consequence:** loading or saving the agent settings is a **two-hop**
operation. Get the agent, read `response_engine.llm_id`, then get/patch the
LLM. Budget for this in the route handlers — a single fetch is not enough.

**Guard:** `response_engine.type` may be `retell-llm`, `custom-llm`, or
`conversation-flow`. Only `retell-llm` exposes `general_prompt` /
`begin_message`. If it is anything else, return a clean, explicit error
(`{ error: 'unsupported_response_engine', message: ... }`) and have the UI
render the stack read-only with an explanation. **Do not** attempt to edit a
conversation-flow agent.

### 4.2 Endpoint mapping

| Purpose | Vapi (source) | Retell (build this) |
|---|---|---|
| Base URL | `https://api.vapi.ai` | `https://api.retellai.com` |
| Auth | `Authorization: Bearer <private key>` | `Authorization: Bearer <RETELL_API_KEY>` — same shape |
| Read agent | `GET /assistant/{id}` | `GET /get-agent/{agent_id}` |
| Update agent | `PATCH /assistant/{id}` | `PATCH /update-agent/{agent_id}` |
| Read prompt | *(part of assistant)* | `GET /get-retell-llm/{llm_id}` |
| Update prompt | *(part of assistant)* | `PATCH /update-retell-llm/{llm_id}` (partial) |
| Read tool | `GET /tool/{id}` | *(none — tools are inline in `general_tools`)* |
| Update transfer number | `PATCH /tool/{id}` `{destinations}` | `PATCH /update-retell-llm/{llm_id}` with the edited `general_tools` array |
| List calls | `GET /call?assistantId=…&limit=1000` | **`POST /v3/list-calls`** with a JSON body |
| List chats | `GET /chat?assistantId=…` (paginated) | **VERIFY** — Retell chat agents are a separate product. If there is no equivalent, drop the chat columns entirely rather than faking them. |
| Publish | *(n/a — PATCH is instantly live)* | `POST /publish-agent-version` |

### 4.3 Versioning — the biggest behavioural difference

On Vapi, a `PATCH` is live on the next call. **On Retell it may not be.**
Retell agents are versioned, and each agent has `prod` / `staging` environment
tags. Phone numbers can be pinned to a version or a tag. An unpinned SDK call
defaults to the latest version.

**Requirements:**

- Do **not** copy the source dashboard's "Saved — live on Vapi" success
  message. It would be a lie here.
- After a successful save, report the version you wrote and whether it is
  published, e.g. *"Saved as version 7 (draft). Publish to route live calls to
  it."* Read `version` and `is_published` back from the PATCH response.
- Decide explicitly and state in the UI whether saving also publishes. The safe
  default is **save-as-draft with a separate "Publish" button** that calls
  `POST /publish-agent-version`. Confirm the exact request body against the
  live docs before wiring the button.
- Surface the agent's current `version` and `is_published` in the read-only
  stack panel so an admin can tell what callers are actually hearing.

### 4.4 Cost and duration units — read carefully

| | Vapi | Retell |
|---|---|---|
| Cost field | `call.cost` | `call.call_cost.combined_cost` |
| **Cost unit** | **US dollars** | **cents** |
| Breakdown | `costBreakdown.{stt,llm,tts,vapi,transport}` | `call_cost.product_costs[]` — array of `{product, unit_price, cost}`, each in **cents** |
| Duration | derive from `startedAt`/`endedAt` ISO strings | `duration_ms` (ms), or `call_cost.total_duration_seconds` |
| Timestamps | ISO 8601 strings | **epoch milliseconds** (`start_timestamp`, `end_timestamp`) |

**This is the single easiest way to ship a 100× billing bug.** Convert cents to
dollars exactly once, in the Retell client layer, and have every caller above
it work in dollars. Write a unit test that pins this.

The source's `costBreakdown` has five fixed keys; Retell's `product_costs` is a
**variable-length array keyed by product name**. Do not hardcode five buckets —
group and sum by `product` and render whatever comes back.

### 4.5 Querying calls

`POST /v3/list-calls`. Both filters are required for correctness:

```jsonc
{
  "filter_criteria": {
    "agent": [{ "agent_id": "<configured agent id>" }],
    "start_timestamp": { "type": "range", "op": "bt", "value": [<fromMs>, <toMs>] }
  },
  "sort_order": "descending",
  "limit": 1000,
  "skip": 0
}
```

- **Always filter by `agent_id`.** The source carries a hard-won comment: an
  org can hold several agents, and an unfiltered query bills this client for
  another business's traffic. Same risk here.
- `limit` max is **1000**. Paginate with `skip`, or with `pagination_key` —
  **not both in one request**.
- Filter server-side by timestamp; do not fetch everything and filter in JS.
- Only count calls that actually connected. Filter `call_status` to `ended`,
  and treat a missing/zero `duration_ms` as zero minutes rather than `NaN`.

---

## 5. Build plan

### Phase 0 — Recon (do this first, write nothing)

- Read `node_modules/next/dist/docs/` for route handlers in Next 16.
- Read `app/api/settings/hippatizer/route.ts` end to end.
- Read `components/messaging/MessagingSettingsTab.tsx` for the tab idiom.
- Read the `ai` and `billing` blocks of `app/(dashboard)/settings/page.tsx`.
- Confirm against **live Retell docs** (`https://docs.retellai.com`) every
  endpoint in section 4.2, plus the `publish-agent-version` body and whether a
  chat/text product exists. Report any drift from this document before coding.

### Phase 1 — Schema

Add to the `Settings` model, in the existing voice-agent block, following the
`snake_case` `@map()` convention:

```prisma
  retellEnabled       Boolean   @default(false) @map("retell_enabled")
  retellApiKey        String?   @map("retell_api_key")          // encrypted
  retellAgentId       String?   @map("retell_agent_id")
  retellLastSync      DateTime? @map("retell_last_sync")
```

Do not remove or rename any existing voice-agent column. Generate a migration;
do not hand-edit the client in `lib/generated/prisma`.

### Phase 2 — `lib/retell/` client

Create a small, typed, testable layer. **All HTTP and all unit conversion lives
here and nowhere else.**

- `lib/retell/client.ts` — `retellFetch(path, apiKey, init)`: sets the bearer
  header, parses JSON defensively (Retell can return a non-JSON error body —
  the source handles this and so must you), returns
  `{ ok, status, json, text }` rather than throwing.
- `lib/retell/agent.ts` — `getAgentWithLlm(apiKey, agentId)` doing the two-hop
  fetch; `updateAgentConfig(...)` handling prompt / greeting / transfer-number
  writes; `summarizeAgent()` producing the flat shape the UI renders
  (`agentName`, `voiceLabel`, `modelLabel`, `languageLabel`, `version`,
  `isPublished`, `beginMessage`, `generalPrompt`, `transferNumber`,
  `hasTransferTool`, `responseEngineType`).
- `lib/retell/usage.ts` — `listAgentCalls(apiKey, agentId, fromMs, toMs)` with
  pagination; **converts cents → dollars here**; returns normalized rows.
- `lib/retell/types.ts` — hand-written types for the subset of fields used.
  Do not install an SDK.

Port these two behaviours from the source verbatim, they are hard-won:

- **E.164 normalization** for the transfer number (`toE164` in the source's
  `app/api/assistant/route.ts`). Accept `(262) 923-3303` and `+12629233303`,
  reject anything else with a clear message. Bare 10-digit → `+1`; 11-digit
  starting `1` → `+`.
- **Preserve unknown fields on write.** The source carefully spreads the
  existing model object and only replaces the system message, so it never drops
  settings it does not understand. Do the same with `general_tools`: map over
  the existing array and replace only the `transfer_call` entry's destination,
  preserving `transfer_option`, `speak_during_execution`, and every other tool.

### Phase 3 — `app/api/settings/retell/route.ts`

Mirror the hippatizer route exactly: `GET` + `PUT`, admin-gated.

- `GET` returns `{ enabled, hasApiKey, agentId, lastSync }`. **Never return the
  key**, not even masked-from-plaintext — decrypt only server-side.
- `PUT` accepts `{ apiKey?, agentId?, enabled?, clearApiKey? }`. Blank `apiKey`
  keeps the existing value (the source's "leave blank to keep current"
  behaviour); `clearApiKey: true` nulls it and forces `enabled: false`.
- Validate the body with **zod** (this repo's convention; the source has no
  validation layer — this is an upgrade, not a port).
- Encrypt with `lib/crypto.ts` before writing. Write an `auditLog` row with
  `{ enabled, hasApiKey: !!apiKey }` — **never the key itself**.

### Phase 4 — `app/api/voice-agent/route.ts`

`GET` and `PATCH`, admin-gated. This is the port of the source's
`app/api/assistant/route.ts`.

- Resolve credentials from `Settings`; if the key or agent id is missing,
  return a **typed, actionable** error the UI can render as a prompt to go fill
  in settings — the source's `{ error: 'missing_key', message: 'Add your … key
  in Settings first.' }` pattern is good, keep it.
- `GET` → two-hop fetch → `summarizeAgent()`.
- `PATCH` accepts `{ beginMessage?, generalPrompt?, transferNumber? }`, rejects
  a body with none of them, normalizes the phone number, and writes to the LLM.
- Distinguish **our** errors from **Retell's**: upstream failures return `502`
  with Retell's message passed through; bad input returns `400`. The source
  does this and it makes the UI messages genuinely useful.
- Audit-log the change. Log *which fields* changed; the prompt body may contain
  clinical instructions, so **do not log prompt contents**.

### Phase 5 — `app/api/voice-agent/usage/route.ts`

`GET`, admin-gated. Port of the source's `app/api/usage/route.ts`.

- Accept `?range=month|7d|30d`, defaulting to `month`.
- Compute the range start in the **practice's timezone**, not the server's.
  Vercel runs UTC; a naive `new Date()` silently shifts month boundaries. The
  source solves this in `lib/billing.ts` (`startOfMonthInTimeZone`) — port that
  function, it is timezone-correct and already proven. Use `date-fns`
  (already a dependency) only if it gives you an equally correct result.
- Return: totals (calls, minutes, billed, avg length), the provider's real
  spend with a `product_costs` breakdown, a `daily` array bucketed by day **in
  the practice timezone**, and the rate card.
- Keep the client rate card and the provider's real cost as **two clearly
  separate numbers**. The source is careful never to conflate them, and that
  distinction is the whole point of the panel.

### Phase 6 — `lib/voice-billing.ts`

Port `lib/billing.ts` from the source: `CLIENT_RATE_PER_MIN`, the `RATE_STACK`
line items, `billFromMinutes`, `startOfMonthInTimeZone`, `formatMonthLabel`.
Re-label the stack for this project (the source's "Riley Desk" platform line is
branding that does not belong here) and **confirm the per-minute rate with the
user before shipping** — do not assume the HVAC rate of `$0.22/min` applies to
this practice.

### Phase 7 — `components/voice/RetellAgentTab.tsx`

1. First, move the existing `ai` tab body out of `settings/page.tsx` into this
   component **with no behaviour change**. Verify the tab still works.
2. Then add the live panel:
   - A **connection card**: API key (password input, "leave blank to keep
     current"), agent ID, enabled toggle, Save. Shows "Connected" /
     "Not configured" from `hasApiKey`.
   - A **read-only stack card**: model, voice, language, version,
     published state. Cards + `Badge`, matching the existing dark-mode classes.
   - An **editable card**: transfer number (disabled with an explanatory hint
     when no `transfer_call` tool exists — port this affordance, it is good
     UX), greeting (`Input`), system prompt (`Textarea`, tall, monospace).
   - Buttons: **Save**, **Reload from Retell**, and — if you implement it —
     **Publish**. Disable during in-flight requests.
   - Inline status and error text. No toasts.
3. Render the personality sliders and local fields exactly as before.

### Phase 8 — `components/voice/RetellUsageTab.tsx`

Replace the fake "Usage This Month" card in the `billing` tab.

- Range switcher (This month / 7 days / 30 days) — shadcn `Button` variants.
- Headline: billed amount, minutes × rate, and the period label.
- Stat tiles: calls, minutes, average length, provider cost.
- Cost breakdown list rendered from `product_costs` — **iterate, do not
  hardcode buckets**.
- Rate-card list: each line with its label, the live model name, and its
  per-minute rate.
- Daily chart via **recharts**, matching `app/(dashboard)/reports/page.tsx`.
  The source hand-rolls CSS bars; do not port that.
- Empty state when there is no activity; error card when the API call fails;
  `Skeleton` while loading.
- Carry over the source's honest disclosure that provider plans cap call-history
  retention, so older activity may be missing — but **verify Retell's actual
  retention** before stating a number.

### Phase 9 — Tests (Vitest 4)

At minimum:

- **cents → dollars** conversion, including a `combined_cost` of `0` and a
  missing `call_cost`.
- `toE164` accept/reject table.
- `startOfMonthInTimeZone` across a DST boundary for the practice timezone.
- `general_tools` transfer-number rewrite **preserves other tools and other
  fields on the transfer tool**.
- Minute summation ignores calls with missing/zero duration.

### Phase 10 — Verify

- `npm run lint` and `npm run test` clean.
- `npm run build` clean (`prisma generate` runs as part of it).
- Manually: save credentials → load agent → edit greeting → save → reload and
  confirm persistence → usage tab renders for all three ranges.
- Confirm a **non-admin** session gets `403` from all three routes.

---

## 6. Pitfalls carried over from the source implementation

These are real bugs the source dashboard already hit and fixed. Inherit the
fixes, not the bugs.

1. **Never let an empty response clear stored values.** The source's tool-arg
   merging explicitly refuses to let a later, emptier payload overwrite values
   already found. Apply the same defensiveness when merging Retell's agent and
   LLM objects.
2. **A JSON-schema-shaped object is not user data.** The source was silently
   writing a tool's JSON Schema into its database because Vapi returns the
   *definition* and the *arguments* in similarly shaped arrays. When reading
   `general_tools`, confirm you are reading the configured destination, not a
   parameter schema.
3. **Parse upstream errors defensively.** A non-2xx from the provider is often
   `text/plain` or HTML. `await res.json()` throws on it and turns a clean 502
   into an unhandled 500. The source wraps this; you must too.
4. **Do not display a masked secret you reconstructed from plaintext.** The
   source returns `maskSecret(key)` to the browser. This repo is HIPAA-adjacent
   and its established pattern is the stricter `hasApiKey: boolean`. Follow
   *this* repo, not the source.
5. **Timezone.** Covered above, but it is the most likely silent defect: month
   totals off by a day's worth of calls at the boundary.

---

## 7. Acceptance criteria

- [ ] An admin can enter a Retell API key + agent ID; the key is stored
      encrypted and is never returned to the browser in any form.
- [ ] The agent's live model, voice, language, version, and published state are
      displayed read-only.
- [ ] Greeting, system prompt, and transfer number can be edited and saved to
      Retell, and a reload shows the saved values.
- [ ] The UI states truthfully whether a saved change is live or a draft.
- [ ] A `conversation-flow` or `custom-llm` agent degrades to read-only with a
      clear explanation instead of erroring.
- [ ] Usage shows real, agent-scoped calls for month / 7d / 30d, with provider
      cost in **dollars** and a breakdown built from `product_costs`.
- [ ] Client-billed amount and provider cost are visibly distinct figures.
- [ ] Non-admins get `403`; unconfigured credentials produce an actionable
      message, not a stack trace.
- [ ] No inline styles; no new dependencies; `settings/page.tsx` is **smaller**
      than it was.
- [ ] Lint, tests, and build all pass.

---

## 8. Out of scope — do not build these

- Retell webhooks, call ingestion, transcripts, recordings, or call analysis.
- Anything touching `app/api/webhooks/*`, Call Logs, or Chat Logs.
- Appointment booking, patient matching, or messaging.
- Migrating or removing the existing Vapi integration. **Leave it alone.**
  This plan *adds* a Retell-backed settings/usage surface; it does not rip
  anything out. If the two must be reconciled, that is a separate, later task.
- Any change to `auth.ts`, `auth.config.ts`, `proxy.ts`, or the worker.

---

## 9. Open questions — ask before assuming

1. What per-minute rate should the client-facing rate card use? (The source
   uses `$0.22/min`; do not assume it transfers.)
2. Should saving publish immediately, or save a draft plus an explicit Publish
   button? (Default to the latter unless told otherwise.)
3. Does this practice use Retell **chat/text** agents as well as voice? If not,
   the usage panel is voice-only and the chat columns are dropped.
4. Should the existing Vapi integration eventually be retired, or do both run
   side by side?
