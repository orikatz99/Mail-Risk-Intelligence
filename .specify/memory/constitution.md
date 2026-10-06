<!--
SYNC IMPACT REPORT
==================
Version change: (template/unfilled) → 1.0.0
Bump rationale: MINOR — initial population of all placeholders constitutes first
  formal versioned release of governance for the Mail Risk Intelligence project.

Modified principles: N/A (initial fill, no prior named principles)
Added sections:
  - Core Principles (5 principles)
  - Technology Constraints
  - Development Workflow
  - Governance

Removed sections: N/A

Templates reviewed:
  ✅ .specify/templates/plan-template.md — Constitution Check section already
     defers to this document via runtime lookup; no hardcoded gates to update.
  ✅ .specify/templates/spec-template.md — Generic placeholders; no
     constitution-specific references requiring update.
  ✅ .specify/templates/tasks-template.md — Task categories (setup, foundational,
     user story, polish) align with all five principles; no changes needed.

Follow-up TODOs: None — all placeholders resolved.
-->

# Mail Risk Intelligence Constitution

## Core Principles

### I. Clean Architecture Separation

Every layer of the system MUST be independently replaceable:
ingestion/parsing, agent orchestration, storage, API, and UI are
distinct modules with no direct coupling between non-adjacent layers.

- Ingestion MUST NOT call storage directly; it passes parsed data to
  the agent orchestration layer.
- The API layer MUST NOT contain business logic; it delegates to
  services/orchestration.
- The UI MUST communicate with the backend exclusively through the
  defined API contracts.

**Rationale**: The assignment explicitly grades architecture quality on
this separation. Violations make the system brittle and undemonstrable
as a portfolio piece.

### II. Resilient Agent Pipeline

Every LLM call MUST be wrapped with error handling covering: network
timeouts, API unavailability, non-2xx responses, and malformed/empty
output.

- A failed agent call MUST NOT propagate an unhandled exception to the
  caller or crash the application.
- Agent A (Extraction) and Agent B (Risk & Graph) MUST each return a
  well-typed result or a typed error/fallback value — never `null` or
  `undefined` without an explicit error state.
- The UI MUST surface a degraded state (e.g., "Processing failed —
  retry available") rather than a blank view or console error when an
  agent fails.

**Rationale**: The brief explicitly requires handling "the unhappy path"
and states "don't let the whole app break because of it."

### III. Free-Tier LLM Mandate

No paid API key MAY be required to run the application. Supported
providers: Groq free API, Google Gemini free tier, Ollama (local models
such as llama3, mistral, phi3).

- The chosen LLM provider MUST be documented in `README.md` with setup
  instructions and a `.env.example` file.
- `README.md` MUST describe fallback behavior when the LLM API is
  unavailable at runtime (e.g., emails marked "pending analysis").
- Switching providers MUST require only an environment variable change,
  not code changes.

**Rationale**: The assignment requires reviewers to run the app without
a paid key. Provider lock-in at the code level would fail this gate.

### IV. Tested Core Pipeline

The agent pipeline's critical path (raw email in → structured JSON out
→ risk assessment out) MUST have at least one automated test per agent.

- Tests MUST be runnable without a live LLM connection; LLM calls MUST
  be stubbable/mockable via a test fixture or environment flag.
- `README.md` MUST include a single command to run all tests.
- Tests for storage and API endpoints are encouraged but not mandatory.

**Rationale**: The assignment requires "at least some tests." Pipeline
tests provide the most demonstrable coverage given the time constraint.

### V. Responsive & Accessible UI

The UI MUST be functional on a narrow (≤375px) mobile-width viewport
without horizontal scrolling.

- Color-coded risk badges (none/low/medium/high) MUST meet WCAG AA
  contrast ratios against their background.
- Every view MUST handle three non-happy states: loading, empty, and
  error — each with a distinct, non-blank UI.
- Interactive elements (buttons, list items) MUST have visible focus
  states for keyboard navigation.

**Rationale**: The brief explicitly requires mobile-width usability and
the UI track grades accessibility basics and state polish.

## Technology Constraints

The following stack choices are fixed for this project:

- **Frontend**: React + TypeScript. Styling approach is a free choice
  (Tailwind, CSS Modules, styled-components, plain CSS) — justify in
  `README.md`.
- **Backend**: Node/Express or Python/FastAPI — choose one and document
  in `README.md`.
- **Storage**: SQLite, JSON file, or in-memory store. No external
  database provisioning is required or expected.
- **LLM**: Free-tier or local only (see Principle III).
- **Auth**: None — no user accounts or authentication layer.

Deviating from the frontend/backend constraint (e.g., Vue, Django)
requires an explicit amendment to this constitution with rationale.

## Development Workflow

- **Two-agent chained pipeline**: Agent A (Extraction) runs first and
  produces structured JSON; Agent B (Risk & Graph) consumes that JSON.
  The agents MUST be separately invokable for testing.
- **Uniform ingestion path**: Seed data (`mock_mailbox_data.json`) and
  user-added emails (pasted text, `.txt`/`.pdf`/`.eml` upload) MUST
  flow through the identical pipeline.
- **Process documentation**: A `PROCESS.md` MUST be delivered alongside
  the code, documenting the AI-agent workflow: prompting approach,
  planning steps, where autonomous operation was used, and where manual
  correction was applied.
- **Time-box discipline**: Target 5–6 focused hours. Scope decisions
  MUST be documented as explicit tradeoffs in `README.md` under "What
  we'd do with more time."

## Governance

This constitution supersedes all ad-hoc design decisions. Where this
document conflicts with implementation convenience, this document wins
or an amendment must be filed.

**Amendment procedure**:
1. Identify the principle or section to change and write a rationale.
2. Determine the version bump: MAJOR for principle removal/redefinition,
   MINOR for additions, PATCH for clarifications.
3. Run `/speckit-constitution` with the proposed change.
4. Add the amendment to the Sync Impact Report comment in this file.
5. Verify the Constitution Check gate in `plan.md` still passes.

**Versioning policy**: Semantic versioning (`MAJOR.MINOR.PATCH`).
Breaking governance changes increment MAJOR.

**Compliance review**: Every feature plan MUST include a Constitution
Check section (see `.specify/templates/plan-template.md`) that
explicitly validates compliance with each principle before Phase 0
research proceeds. Re-check after Phase 1 design.

**Version**: 1.0.0 | **Ratified**: 2026-10-06 | **Last Amended**: 2026-10-06
