---
description: "Task list for Mail Risk Intelligence"
---

# Tasks: Mail Risk Intelligence

**Input**: Design documents from `specs/001-mail-risk-intelligence/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/api.md ✅

**Tests**: Agent A and Agent B unit tests + pipeline integration test are included
(required by spec SC-006 and constitution Principle IV). No other test tasks.

**Organization**: Tasks grouped by user story (US1 P1 → US5 P5 bonus).
Each story is independently completable and testable.

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: Repository skeleton and seed data — no application logic yet.

- [x] T001 Initialize backend Node.js/TypeScript project in `backend/` (package.json with Express, better-sqlite3, unpdf, mailparser, Zod, groq SDK, tsx; tsconfig.json; vitest.config.ts)
- [x] T002 [P] Initialize frontend Vite + React + TypeScript project in `frontend/` (package.json with React 19, React Router 7, Tailwind CSS 4, Vite 8; tsconfig.json; vite.config.ts)
- [x] T003 [P] Create `.env.example` at repo root with LLM_PROVIDER, GROQ_API_KEY, GROQ_MODEL, GEMINI_API_KEY, GEMINI_MODEL, OLLAMA_BASE_URL, OLLAMA_MODEL, PORT variables
- [x] T004 [P] Verify `mock_mailbox_data.json` exists at repo root — file is provided with the assignment and must not be recreated or modified; confirmed present and will be used as the seed dataset by the `backend/src/seed.ts` loader (T014)

---

## Phase 2: Foundational

**Purpose**: Core infrastructure required by every user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Create SQLite database module in `backend/src/db.ts` — open/create `mailbox.db` with better-sqlite3; run CREATE TABLE IF NOT EXISTS for all five tables (emails, extractions, risk_assessments, entities, relationships) using schemas from data-model.md; export the db singleton
- [x] T006 [P] Create configuration module in `backend/src/config.ts` — require GROQ_API_KEY and GROQ_MODEL from process.env (throw on missing); read PORT; export typed config object with `llm: { apiKey, model }` and `port`
- [x] T007 [P] Create TypeScript entity interfaces in `backend/src/models/types.ts` — Email, Extraction, RiskAssessment, Entity, Relationship, EmailStatus enum, RiskLevel enum, EntityType enum (matching data-model.md columns exactly)
- [x] T008 Create Express app in `backend/src/index.ts` — configure JSON body parser, CORS for localhost:5173, multipart file upload middleware (multer); import and register route files from `backend/src/routes/`; start server on PORT; export app for tests
- [x] T009 Implement LLM client in `backend/src/services/llm/client.ts` — export `async function complete(prompt: string): Promise<string>` using Groq SDK; implement exponential backoff for HTTP 429 (base 1s × 2^attempt, max 3 attempts); throw `LlmError` after exhausting retries
- [x] T010 [P] Verify Tailwind CSS 4 integration in `frontend/` — confirm `@tailwindcss/vite` plugin is registered in `vite.config.ts`; confirm `frontend/src/index.css` uses `@import "tailwindcss"` (v4 CSS-first setup — no tailwind.config.js or postcss.config.js); add a smoke-test utility class to `App.tsx` and confirm it renders correctly in the browser; do not create v3-style configuration files
- [x] T011 [P] Create React Router app shell in `frontend/src/App.tsx` — BrowserRouter with four routes: `/` → InboxPage, `/emails/:id` → EmailDetailPage, `/add` → AddEmailPage, `/graph` → GraphPage; import page components (create empty placeholder files for each if not yet present)
- [x] T012 [P] Create TypeScript interfaces in `frontend/src/types/index.ts` — EmailSummary, EmailDetail, Extraction, RiskAssessment, Entity, Relationship, GraphResponse; shapes must match contracts/api.md response bodies exactly
- [x] T013 [P] Create fetch utility in `frontend/src/services/api.ts` — define BASE_URL (`http://localhost:3000/api`); export async `apiFetch<T>(path, options)` helper that calls fetch, checks response.ok, and returns typed JSON; all story-specific API functions will be added here in later phases

**Checkpoint**: Foundation complete — all five tables exist, Express starts, React Router renders, Tailwind applies.

---

## Phase 3: User Story 1 — Mailbox Overview (Priority: P1) 🎯 MVP

**Goal**: Analyst sees a risk-sorted inbox of all emails with color-coded badges.

**Independent Test**: Start the app on a fresh DB — all 10 seed emails appear in the inbox list in `pending` state immediately after startup. The inbox view renders rows, handles all email status states, and polls for updates. Risk badges populate as the pipeline processes each email (US2).

- [x] T014 [US1] Implement seed loader in `backend/src/seed.ts` — read `mock_mailbox_data.json`; check if seeds already exist (idempotency — skip if any email with `source='seed'` is present); insert each email as `pending` into the emails table with `source='seed'` and its `raw_content`; call `seed()` from `backend/src/index.ts` startup before the server begins accepting requests; pipeline processing of the seeded emails is handled by T025
- [x] T015 [US1] Implement `GET /api/emails` in `backend/src/routes/emails.ts` — run the risk-sorted JOIN query from data-model.md (emails LEFT JOIN extractions LEFT JOIN risk_assessments); return EmailSummary array; handle empty result with empty array
- [x] T016 [P] [US1] Add `getEmails(): Promise<EmailSummary[]>` to `frontend/src/services/api.ts`
- [x] T017 [P] [US1] Create `RiskBadge` component in `frontend/src/components/RiskBadge.tsx` — accept `risk_level: RiskLevel | null` prop; render color-coded Tailwind pill for none (gray), low (blue), medium (amber), high (red); verify all four colors meet WCAG AA contrast on white background; render "Processing" neutral badge when null
- [x] T018 [P] [US1] Create `EmptyState` component in `frontend/src/components/EmptyState.tsx` — accept `message: string` prop; render centered icon + text; used when inbox has no emails
- [x] T019 [P] [US1] Create `ErrorState` component in `frontend/src/components/ErrorState.tsx` — accept `message: string` and optional `onRetry: () => void` props; render error message with retry button when onRetry is provided
- [x] T020 [US1] Create `EmailListItem` component in `frontend/src/components/EmailListItem.tsx` — render single inbox row: sender, subject, date, RiskBadge; show placeholder text for null fields (email is pending/processing); wrap in React Router Link to `/emails/:id`; apply Tailwind responsive layout for ≤375px viewport
- [x] T021 [US1] Implement `InboxPage` in `frontend/src/pages/InboxPage.tsx` — on mount call `getEmails()` via useEffect; manage loading/error/data state with useState; render list of EmailListItem; show EmptyState when list is empty; show ErrorState on fetch failure; poll with setInterval every 3s while any email has status pending or processing; clear interval when all emails are done or failed; link to AddEmailPage

**Checkpoint**: US1 complete and independently testable — inbox renders all seed emails in `pending` state on cold start; handles loading, empty, and error states correctly.

---

## Phase 4: User Story 2 — Email Processing Pipeline (Priority: P2)

**Goal**: Raw emails are automatically processed by a two-stage LLM pipeline and stored with structured results.

**Independent Test**: POST a raw email to `/api/emails` (or inspect after seed); confirm email transitions pending → processing → done; DB contains extraction row, risk_assessment row, at least one entity row. Tests pass without a live LLM connection.

- [x] T022 [P] [US2] Implement Agent A in `backend/src/services/agents/extraction.ts` — define Zod schema for extraction output (sender, recipients, date, subject, summary, key_facts array); build LLM prompt instructing extraction from raw email text; call `llm/client.ts`; parse and validate response JSON with Zod; return typed Extraction or throw on validation failure
- [x] T023 [P] [US2] Implement Agent B in `backend/src/services/agents/risk.ts` — define Zod schema for risk output (risk_level enum: none/low/medium/high, rationale, tags, entities array, relationships array); build LLM prompt taking Extraction input; call `llm/client.ts`; parse and validate response JSON with Zod; an invalid or out-of-range risk_level MUST fail Zod validation — do not coerce or default to "none"; throw on any validation failure so the pipeline marks the email as failed
- [x] T024 [US2] Implement pipeline orchestrator in `backend/src/services/pipeline.ts` — export `async function runPipeline(emailId: string): Promise<void>`; update email status to processing; call Agent A; write extraction row to DB; call Agent B with Agent A output; write risk_assessment, entities, relationships rows to DB; update email status to done with processed_at timestamp; catch any error, update email status to failed with error_message; never throw — always resolve
- [x] T025 [US2] Wire pipeline into `backend/src/index.ts` — after seeding, call runPipeline for any email with status pending; export a `queueEmail(emailId)` function for use by POST /emails route (added in US4); run pipeline calls asynchronously (do not await in request handlers)
- [x] T026 [P] [US2] Write Agent A unit test in `backend/tests/unit/agent-extraction.test.ts` — vi.mock the LLM client; test: valid JSON response returns typed Extraction; test: response missing required fields throws; test: LLM returns non-JSON throws
- [x] T027 [P] [US2] Write Agent B unit test in `backend/tests/unit/agent-risk.test.ts` — vi.mock the LLM client; test: valid JSON response returns typed risk output; test: out-of-range risk_level (e.g. "critical") throws (Zod must reject it, not coerce it); test: response missing required fields throws
- [x] T028 [US2] Write pipeline integration test in `backend/tests/integration/pipeline.test.ts` — use in-memory SQLite DB (separate db instance); vi.mock the LLM client with fixed responses; test: successful run writes all DB rows and sets status to done; test: Agent A failure sets status to failed with error_message; test: Agent B failure sets status to failed with error_message

**Checkpoint**: US2 complete — emails process end-to-end; all three tests pass with no live LLM.

---

## Phase 5: User Story 3 — Email Detail View (Priority: P3)

**Goal**: Analyst can open any email to see its full content, extraction results, risk assessment, and entities panel.

**Independent Test**: Navigate to `/emails/:id` for any processed seed email — all five sections render with data; navigating to a failed email shows an error state with a retry button.

- [x] T029 [US3] Implement `GET /api/emails/:id` in `backend/src/routes/emails.ts` — query emails, extractions, risk_assessments tables by id; query entities and relationships for that email_id; assemble EmailDetail response shape from contracts/api.md; return 404 if email not found
- [x] T030 [P] [US3] Add `getEmail(id: string): Promise<EmailDetail>` to `frontend/src/services/api.ts`
- [x] T031 [P] [US3] Create `EntityPanel` component in `frontend/src/components/EntityPanel.tsx` — accept entities: Entity[] and relationships: Relationship[] props; group entities by type; for each entity render its outgoing and incoming relationships; show EmptyState when no entities; apply Tailwind responsive layout
- [x] T032 [US3] Implement `EmailDetailPage` in `frontend/src/pages/EmailDetailPage.tsx` — read :id param with useParams; fetch via getEmail(id) on mount; manage loading/error/data state; render five sections: original content (pre-wrap), extraction (sender/recipients/date/subject/summary/key_facts), risk assessment (RiskBadge + rationale + tags), EntityPanel; show loading spinner per section for pending/processing emails; show ErrorState with retry button that calls retryEmail(id) (imported from api.ts, added in US4 — stub the call until then); poll every 3s while status is processing; stop poll on done or failed

**Checkpoint**: US3 complete — detail view fully populated for processed emails; loading/error states work.

---

## Phase 6: User Story 4 — Add New Email (Priority: P4)

**Goal**: Analyst can submit a new email by pasting text or uploading a .txt, .pdf, or .eml file; it flows through the pipeline and appears in the inbox.

**Independent Test**: Paste a raw email into the add-email form; submit; confirm redirect to inbox; confirm new email row appears with status pending then done after processing.

- [x] T033 [P] [US4] Implement file validation in `backend/src/services/ingestion/validator.ts` — export `validateFile(mimetype: string, buffer: Buffer): ValidationResult`; accept text/plain, application/pdf, message/rfc822; reject empty content; reject all other MIME types with descriptive error message
- [x] T034 [P] [US4] Implement file parser in `backend/src/services/ingestion/parser.ts` — export `async function extractText(mimetype: string, buffer: Buffer): Promise<string>`; for text/plain return buffer.toString(); for application/pdf call unpdf extractText(); for message/rfc822 call mailparser simpleParser(), return parsed.text (fall back to parsed.html stripped of tags if text is empty); return empty string for image-only PDFs (do not throw)
- [x] T035 [US4] Implement `POST /api/emails` in `backend/src/routes/emails.ts` — handle both JSON body `{ content }` and multipart file upload; for file uploads call validator then parser; insert email row with status pending; call queueEmail(id) from pipeline.ts; return 202 with EmailSummary; return 422 on validation failure
- [x] T036 [P] [US4] Implement `POST /api/emails/:id/retry` in `backend/src/routes/emails.ts` — verify email exists and status is failed (return 409 otherwise); reset status to pending, clear error_message and processed_at; clear existing extraction, risk_assessment, entity, relationship rows for that email_id; call queueEmail(id); return 202 with EmailSummary
- [x] T037 [P] [US4] Add `submitEmail()`, `uploadEmailFile()`, `retryEmail()` to `frontend/src/services/api.ts` — submitEmail(content: string) POSTs JSON body; uploadEmailFile(file: File) POSTs FormData; retryEmail(id: string) POSTs to /emails/:id/retry; all return EmailSummary
- [x] T038 [US4] Implement `AddEmailPage` in `frontend/src/pages/AddEmailPage.tsx` — two input modes: textarea for pasting raw text; file picker filtered to .txt,.pdf,.eml for upload; single submit button; show inline validation error for unsupported file type or empty content; on success navigate to `/` (inbox); show loading state during submission; show ErrorState on API error; apply Tailwind responsive layout for ≤375px

**Checkpoint**: US4 complete — paste or upload an email; it appears in the inbox and processes to completion.

---

## Phase 7: User Story 5 — Knowledge Graph (Priority: P5 — Bonus)

**Goal**: Interactive graph aggregating entities and relationships across all processed emails.

**Independent Test**: Open `/graph` after at least two processed emails share a common entity — one deduplicated node appears with edges to all its relationships; graph supports pan, zoom, and node click.

**⚠️ NOTE**: This phase begins only after US1–US4 are complete and verified.

- [x] T039 [US5] Implement `GET /api/graph` in `backend/src/routes/graph.ts` — run node deduplication query (GROUP BY type, normalized_value with email_count) and edge query from data-model.md; build node ids as `{type}::{normalized_value}`; build edge ids from source + target + relationship_type; return GraphResponse shape from contracts/api.md; register route in `backend/src/index.ts`
- [x] T040 [P] [US5] Add `getGraph(): Promise<GraphResponse>` to `frontend/src/services/api.ts`
- [x] T041 [P] [US5] Install `reactflow` in `frontend/` and configure in vite.config.ts; import React Flow CSS in `frontend/src/main.tsx`
- [x] T042 [US5] Implement `GraphPage` in `frontend/src/pages/GraphPage.tsx` — fetch via getGraph() on mount; manage loading/error/data state; map API nodes → React Flow nodes (label from node.label, type badge from node.type, email_count subtitle); map API edges → React Flow edges (label from relationship_type); render ReactFlow component with pan/zoom enabled; on node click highlight connected edges; show EmptyState when nodes array is empty; apply Tailwind responsive layout with touch-friendly controls

**Checkpoint**: US5 complete — graph renders all deduplicated entities; pan/zoom/click work; empty state visible when no processed emails.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Quality, documentation, and final validation across all user stories.

- [ ] T043 [P] Validate 375px viewport layout across InboxPage, EmailDetailPage, AddEmailPage, GraphPage — fix any horizontal overflow or text truncation
- [ ] T044 [P] Add `GET /health` endpoint returning `{ "status": "ok" }` to `backend/src/index.ts`
- [ ] T045 [P] Write `README.md` — setup and run instructions, architecture overview, key technology decisions and tradeoffs, what you'd do with more time, honest time estimate
- [ ] T046 [P] Write `PROCESS.md` — document the AI-agent workflow: planning approach, prompting strategy, where autonomous operation was used, where manual correction was applied, how work was broken into sub-tasks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — first independently deliverable increment
- **Phase 4 (US2)**: Depends on Phase 2 — can run in parallel with US1 after Phase 2
- **Phase 5 (US3)**: Depends on Phase 2 — benefits from US2 data but independently implementable
- **Phase 6 (US4)**: Depends on Phase 2 + US2 (needs `queueEmail` from pipeline.ts)
- **Phase 7 (US5 bonus)**: Depends on all prior phases; start only after US1–US4 verified
- **Phase 8 (Polish)**: Depends on all desired user stories complete

### Within-Story Dependencies

```
Phase 3 (US1):
  T014 (seed) → T015 (GET /emails) → T016 (api fn) [wait for T015]
  T017, T018, T019 → T020 (EmailListItem) → T021 (InboxPage)

Phase 4 (US2):
  T022, T023 (parallel) → T024 (pipeline) → T025 (wire startup)
  T022 → T026 (Agent A test)
  T023 → T027 (Agent B test)
  T024 → T028 (integration test)

Phase 5 (US3):
  T029 (GET /id) → T030 (api fn) [wait for T029]
  T031 (EntityPanel) parallel with T029/T030
  T029 + T030 + T031 → T032 (DetailPage)

Phase 6 (US4):
  T033, T034 (parallel) → T035 (POST /emails)
  T036 parallel with T035
  T037 parallel with T035
  T035 + T036 + T037 → T038 (AddEmailPage)

Phase 7 (US5):
  T039 (GET /graph) → T040 (api fn) [wait for T039]
  T041 (React Flow setup) parallel with T039/T040
  T039 + T040 + T041 → T042 (GraphPage)
```

### Parallel Opportunities Per Phase

```bash
# Phase 1: all four tasks in parallel
T001 backend init | T002 frontend init | T003 .env.example | T004 verify mock data

# Phase 2: after T001+T002 complete
T005 db.ts | T006 config.ts | T007 backend types | T010 Tailwind | T011 App.tsx | T012 frontend types | T013 api.ts
then T008 (index.ts) and T009 (llm client) — T008 imports routes so run after T007

# Phase 3 (US1): after Phase 2
T017 RiskBadge | T018 EmptyState | T019 ErrorState  ← fully parallel
T014 seed.ts + T015 GET /emails ← sequential pair
T016 api fn after T015

# Phase 4 (US2): after Phase 2
T022 Agent A | T023 Agent B  ← parallel
then T024 pipeline | T025 wire startup | T026 test A | T027 test B | T028 integration

# Phase 5 (US3): after Phase 2
T030 api fn + T031 EntityPanel ← parallel after T029

# Phase 6 (US4): after Phase 2 + US2
T033 validator | T034 parser ← parallel
T035 POST /emails | T036 POST retry | T037 api fns ← parallel after T033+T034

# Phase 8: all four polish tasks fully parallel
T043 | T044 | T045 | T046
```

---

## Implementation Strategy

### MVP First (US1 + US2 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — CRITICAL, blocks everything
3. Complete Phase 3: US1 → **STOP and validate inbox shows seed data**
4. Complete Phase 4: US2 → **STOP and validate pipeline processes emails and tests pass**
5. Deploy/demo: risk badges now populate from real LLM output

### Incremental Delivery

1. Setup + Foundational → infrastructure ready
2. US1 → inbox with seed data → **demo #1**
3. US2 → live pipeline processing → **demo #2**
4. US3 → email detail view → **demo #3**
5. US4 → add real emails → **demo #4**
6. US5 (bonus) → knowledge graph → **demo #5**

---

## Notes

- [P] = different files, no shared incomplete dependencies
- Tests in Phase 4 are mandatory (SC-006, constitution Principle IV); all other test tasks are omitted
- GraphPage (T042) and React Flow (T041) have zero impact on MVP — skip entirely if time is short
- `mock_mailbox_data.json` (verified by T004) contains raw email content; seed emails go through the same Agent A → Agent B pipeline as user-added emails
- T036 (retry) clears existing extraction/risk/entity/relationship rows before re-queuing — prevents stale partial data
- `retryEmail()` in T037 is stubbed in T032 (DetailPage) until T036/T037 are complete; the stub can simply call `alert('retry not yet implemented')` or no-op
