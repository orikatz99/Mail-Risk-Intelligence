# Feature Specification: Mail Risk Intelligence

**Feature Branch**: `001-mail-risk-intelligence`
**Created**: 2026-10-06
**Status**: Draft
**Input**: User description: "Full-stack compliance/risk email analysis tool for Arcline — mailbox, two-agent processing pipeline, entity extraction, risk assessment, and interactive UI"

## Clarifications

### Session 2026-10-06

- Q: What are the valid processing statuses for an email? → A: Three states: `pending` → `processing` → `done` / `failed`
- Q: What should happen when the LLM provider's rate limit is hit? → A: Retry with exponential backoff (up to 3 attempts), then mark `failed` if all retries exhausted
- Q: When a user retries a failed email, which pipeline stages are re-run? → A: Always re-run both stages from the beginning
- Q: How should emails be sorted in the inbox by default? → A: Risk level descending (high → medium → low → none), then by date within each level
- Q: How are entities matched for deduplication in the knowledge graph? → A: Exact match after normalization (lowercase, trimmed whitespace); same type + same normalized value = same node

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mailbox Overview (Priority: P1)

A compliance analyst opens the app and immediately sees a list of incoming
emails. Each row shows sender, subject, date, and a color-coded risk badge
(none/low/medium/high). The analyst can scan the inbox at a glance to
identify which emails require urgent attention.

**Why this priority**: Without a visible inbox, no other functionality is
discoverable or usable. This is the entry point for all subsequent workflows.

**Independent Test**: Seed `mock_mailbox_data.json` on first run, open the
app — all 10 seed emails appear in the inbox list in `pending` state
immediately. The inbox view renders rows and status indicators without
pipeline results. Once the pipeline processes them (US2), risk badges and
metadata populate. The inbox rendering itself — rows, status indicators,
polling, responsive layout — is independently testable before US2 is
complete.

**Acceptance Scenarios**:

1. **Given** the app has been started for the first time, **When** the user
   opens the inbox, **Then** all 10 seed emails are listed; each shows a
   `pending` status indicator initially; sender, subject, date, and risk
   badge appear once the pipeline has processed each email.
2. **Given** seed data is already loaded, **When** the user opens the app
   again, **Then** no duplicate emails appear (seeding is idempotent).
3. **Given** the inbox contains emails of mixed risk levels, **When** the
   user views the list, **Then** each risk badge is color-coded distinctly
   (none/low/medium/high each have a unique, accessible color).
4. **Given** the inbox is viewed on a 375px viewport, **When** the user
   scrolls through the list, **Then** no horizontal scrolling is required
   and all key metadata is visible.

---

### User Story 2 - Email Processing Pipeline (Priority: P2)

When an email enters the system (whether from seed data or user input), it
is automatically processed by a two-stage analysis pipeline. The first stage
extracts structured data (sender, recipients, date, subject, summary, key
facts). The second stage assesses risk (level, rationale, tags) and identifies
entities and relationships. The analyst sees the email's risk assessment
without manual review.

**Why this priority**: The core value proposition of the tool is automated
risk detection. Without this pipeline, the tool is just an email reader.

**Independent Test**: Submit a single raw email text through the system and
confirm that after processing, the email record contains a risk level, a
non-empty rationale, at least one tag, and at least one extracted entity.
Verifiable via the storage layer or API without a UI.

**Acceptance Scenarios**:

1. **Given** a raw email is submitted to the system, **When** the first
   pipeline stage completes, **Then** the structured record contains sender,
   recipients, date, subject, a summary, and any key facts (amounts, dates,
   reference numbers) present in the email.
2. **Given** the first stage output, **When** the second stage completes,
   **Then** the record contains a risk level (none/low/medium/high), a
   short rationale explaining the assessment, one or more risk tags, a list
   of named entities, and at least one entity relationship (if present in
   the email).
3. **Given** the pipeline stage two fails (e.g., LLM timeout), **When** the
   error occurs, **Then** the email is stored with a "failed" status and the
   UI surfaces a clear error state — no unhandled crash or blank screen.
4. **Given** an email with no extractable content (e.g., corrupted file),
   **When** stage one processes it, **Then** the system stores what it can
   and marks missing fields explicitly rather than propagating nulls silently.

---

### User Story 3 - Email Detail View (Priority: P3)

The analyst clicks an email in the inbox and sees the full detail view:
original content, structured extraction results, risk level and rationale,
risk tags, and an entities/relationships panel listing all people, organizations,
amounts, and their connections.

**Why this priority**: The inbox overview drives triage; the detail view
enables the analyst to act on a flagged email with full context.

**Independent Test**: Click any processed email — the detail view shows all
five sections (original content, extraction, risk assessment, tags, entities
panel) populated. Testable independently of the add-email story (US4).

**Acceptance Scenarios**:

1. **Given** a processed email, **When** the analyst opens its detail view,
   **Then** they see the original email content, structured extraction,
   risk level, rationale, tags, and the entities/relationships panel.
2. **Given** an email still being processed, **When** the analyst opens its
   detail view, **Then** a loading indicator is shown for pending sections.
3. **Given** an email whose processing failed, **When** the analyst opens
   it, **Then** a clear error state is shown with a retry option — not a
   blank panel. Triggering retry resets the email to `pending` and
   re-runs both pipeline stages from the beginning.
4. **Given** the detail view on a 375px viewport, **When** the analyst
   scrolls through all sections, **Then** content is fully readable with no
   horizontal overflow.

---

### User Story 4 - Add New Email (Priority: P4)

The analyst can add a new email to the inbox by either pasting raw email
text into a text area or uploading a `.txt`, `.pdf`, or `.eml` file. The
new item flows through the same two-stage processing pipeline as seed data
and appears in the inbox with a risk badge once processed.

**Why this priority**: The app must handle real incoming emails, not just
seed data. This story makes the tool operational for ongoing use.

**Independent Test**: Paste a raw email text into the add-email interface,
submit it — a new entry appears in the inbox and, after processing, shows
a risk badge. Independently testable once US1 and US2 exist.

**Acceptance Scenarios**:

1. **Given** the analyst pastes raw email text and submits, **When** submission
   completes, **Then** the new email appears in the inbox list and enters
   the processing pipeline.
2. **Given** the analyst uploads a `.txt`, `.pdf`, or `.eml` file, **When**
   the file is submitted, **Then** the file content is extracted and the
   email enters the same pipeline as pasted text.
3. **Given** the analyst uploads an unsupported file type, **When** they
   attempt to submit, **Then** a clear validation message is shown and no
   broken entry is created.
4. **Given** a newly added email is processing, **When** the analyst views
   the inbox, **Then** the email shows a "processing" indicator until the
   pipeline completes.

---

### User Story 5 - Knowledge Graph (Priority: P5 — Bonus)

The analyst opens a knowledge graph view that aggregates all entities and
relationships extracted from every processed email. Nodes represent entities
(people, organizations, accounts); edges represent relationships. The graph
is interactive: the analyst can pan, zoom, and click a node to see its
connections and source emails.

**Why this priority**: Bonus feature — provides cross-email pattern detection
(e.g., the same person appears in multiple suspicious emails). Lower priority
than core functionality.

**Independent Test**: Open the knowledge graph view after at least two
processed emails share a common entity — the shared entity appears as one
node with edges to both email-sourced relationships. Graph renders without
crashing on at least 10 emails worth of entities.

**Acceptance Scenarios**:

1. **Given** multiple processed emails share a common entity (e.g., same
   person), **When** the analyst opens the knowledge graph, **Then** the
   shared entity appears as a single node with edges to all its relationships.
2. **Given** the knowledge graph is open, **When** the analyst clicks a node,
   **Then** the connected edges and source emails are highlighted.
3. **Given** the knowledge graph on a 375px viewport, **When** the analyst
   views it, **Then** a touch-friendly pan/zoom interface is available.
4. **Given** no emails have been processed, **When** the analyst opens the
   knowledge graph, **Then** an empty state message is displayed.

---

### Edge Cases

- What happens when an uploaded file has no extractable text (encrypted or
  corrupted PDF)?
- How does the system handle an email submitted twice with identical content?
- What if Agent A (extraction) succeeds but Agent B (risk) fails — partial
  results or full failure?
- What if the LLM returns a risk level value outside the valid set
  (none/low/medium/high)? → Zod schema validation MUST reject it; the
  pipeline marks the email `failed`. Invalid risk levels must never be
  coerced or silently defaulted to "none" — a silent downgrade would hide
  a broken prompt or model regression.
- How is an email with no body text (header-only) handled?
- What is shown in the entities panel when zero entities are extracted?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a mailbox list view showing sender, subject,
  date, and color-coded risk badge for each email. Emails MUST be sorted by
  risk level descending (high → medium → low → none), with date descending
  as the tiebreaker within each risk level.
- **FR-002**: System MUST seed the mailbox from `mock_mailbox_data.json` on
  first run; re-running the app MUST NOT create duplicate seed entries.
- **FR-003**: System MUST process incoming emails through a two-stage pipeline:
  Stage 1 (extraction) followed by Stage 2 (risk & entity assessment).
- **FR-004**: Stage 1 MUST extract: sender, recipients, date, subject, a short
  summary, and key facts (monetary amounts, dates, reference/account numbers,
  attachment text if present).
- **FR-005**: Stage 2 MUST produce: risk level (none/low/medium/high), a short
  rationale, risk tags (e.g., urgency, financial-anomaly, threat-language,
  mnpi-risk), a list of named entities (people, organizations, amounts,
  accounts, locations), and entity relationships with typed edges.
- **FR-006**: System MUST persist all processed emails and their extracted
  data across application restarts.
- **FR-007**: System MUST allow users to add new emails by pasting raw text
  or uploading a `.txt`, `.pdf`, or `.eml` file.
- **FR-008**: User-added emails MUST flow through the same processing pipeline
  as seed data.
- **FR-009**: System MUST display a detail view for each email showing original
  content, extraction results, risk assessment, risk tags, and an
  entities/relationships panel.
- **FR-010**: Each email MUST progress through exactly three processing states:
  `pending` (queued), `processing` (pipeline running), and either `done`
  (both stages completed) or `failed` (unrecoverable error). No other states
  are valid.
- **FR-011**: System MUST handle all pipeline failure modes (timeout, API error,
  malformed output) without crashing; affected emails MUST be marked `failed`
  with an error state surfaced in the UI.
- **FR-014**: When the LLM provider returns a rate-limit response, the pipeline
  MUST retry the request using exponential backoff for up to 3 attempts before
  marking the email `failed`. The email MUST remain in `processing` state
  during retry attempts.
- **FR-012**: All primary views MUST be functional on a viewport width of 375px
  with no horizontal scrolling required.
- **FR-013** *(Bonus)*: System SHOULD provide an interactive knowledge graph
  aggregating all extracted entities and relationships across all processed
  emails, supporting pan, zoom, and node-click to inspect connections.

### Key Entities *(include if feature involves data)*

- **Email**: Represents an email message in the mailbox. Key attributes:
  unique identifier, raw content, processing status (one of `pending`,
  `processing`, `done`, `failed`), processing timestamps, and links to
  extraction and risk results. Status transitions: `pending` →
  `processing` → `done` (success) or `failed` (unrecoverable error).
- **Extraction**: The structured output of Stage 1 processing. Contains sender,
  recipients, date, subject, summary, and a list of key facts.
- **RiskAssessment**: The output of Stage 2. Contains risk level, rationale,
  and an ordered list of risk tags.
- **Entity**: A named item extracted from an email — a person, organization,
  monetary amount, account number, or location. Belongs to one email but may
  be deduplicated in the knowledge graph view.
- **Relationship**: A typed directional link between two entities, described
  by a source entity, a target entity, and a free-form relationship type label
  (e.g., `requests_transfer_to`, `employed_by`, or any other type Agent B
  determines is supported by the email content). Belongs to the email from
  which it was extracted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The full inbox loads and displays risk badges for all seed emails
  within 3 seconds of the app starting from cold.
- **SC-002**: A newly submitted email completes both pipeline stages and
  displays its risk badge in the inbox within 30 seconds under normal
  network conditions.
- **SC-003**: Pipeline failures are surfaced in the UI within 5 seconds of
  occurrence; the analyst sees a clear error state with a retry option.
- **SC-004**: All five primary views (inbox, detail, entities panel, add-email
  form, knowledge graph if implemented) are fully usable on a 375px viewport
  without horizontal scrolling.
- **SC-005**: The application starts and displays seed data correctly after
  a clean install with no manual configuration beyond providing the LLM
  API key.
- **SC-006**: At least one automated test per pipeline stage passes without
  a live LLM connection (using stubbed responses).

## Assumptions

- No user authentication or multi-user support is required; the app is a
  single-user local tool.
- The LLM provider is selected by setting an environment variable; the
  project ships with at least one free-tier provider configured by default.
- "First run" detection is based on whether seed data already exists in
  storage; the seeding process is idempotent.
- Entity deduplication for the knowledge graph uses exact matching after
  normalization (lowercase, trimmed whitespace). Two entities are the same
  node if and only if they share the same type and the same normalized value.
  Fuzzy or semantic matching is out of scope for v1.
- Relationship types are not restricted to a predefined taxonomy. Each
  relationship uses a simple extensible structure: source entity, target
  entity, and a relationship type label. Agent B may produce any meaningful
  relationship type supported by the email content; the examples in the
  assignment brief (e.g., `requests_transfer_to`, `employed_by`) are
  illustrative, not exhaustive.
- Mobile support targets 375px viewport width; tablet (768px) and desktop
  are progressive enhancements, not separate design targets.
- Attachment processing covers text extraction from `.txt`, `.pdf`, and
  `.eml` attachments; image-only PDFs and binary attachments are out of scope.
- The app is not expected to handle concurrent multi-user access; race
  conditions from simultaneous submissions are out of scope.
