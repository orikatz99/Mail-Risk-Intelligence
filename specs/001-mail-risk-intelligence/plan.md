# Implementation Plan: Mail Risk Intelligence

**Branch**: `001-mail-risk-intelligence` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-mail-risk-intelligence/spec.md`

## Summary

A full-stack compliance/risk email analysis tool for Arcline. Emails flow through
a two-stage LLM pipeline: Agent A (extraction) produces structured JSON from raw
email content; Agent B (risk & graph) adds risk level, rationale, tags, named
entities, and typed relationships. Both agents validate LLM output at runtime
using Zod schemas. Results persist in SQLite via better-sqlite3. A React/TypeScript
SPA surfaces a risk-sorted inbox, email detail view, entities panel, and an optional
interactive knowledge graph (bonus). Backend: Node.js 20 / Express / TypeScript.
LLM: Groq free API.

## Technical Context

**Language/Version**: Node.js 20+ / TypeScript 5+ (backend and frontend)
**Primary Dependencies**: Express 4, better-sqlite3, unpdf, mailparser, Zod, groq SDK;
React 19, React Router 7, Tailwind CSS 4, Vite 8
**Storage**: SQLite — single `mailbox.db` file at repo root, accessed via better-sqlite3
**Testing**: Vitest (backend unit + integration tests, frontend component tests)
**Target Platform**: Local development server (no deployment target)
**Project Type**: Web application — React SPA + Express JSON API, both TypeScript
**Performance Goals**: Inbox cold-start ≤ 3s (SC-001); pipeline completion ≤ 30s (SC-002);
failure surfaced ≤ 5s (SC-003)
**Constraints**: Free-tier LLM only; no auth; no paid services; SQLite only
**Scale/Scope**: Single user; ~10–100 emails; local tool

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status | Notes |
|-----------|------|--------|-------|
| I. Clean Architecture Separation | Ingestion, pipeline, storage, API, UI are separate modules with no cross-layer coupling | ✅ PASS | `ingestion/` → `services/pipeline.ts` → better-sqlite3 queries → `routes/` → frontend `services/api.ts` → `pages/` |
| II. Resilient Agent Pipeline | Every LLM call wrapped; failures degrade gracefully; UI surfaces error state | ✅ PASS | `llm/client.ts` wraps all calls with retry/backoff; Zod validates LLM output; email status transitions enforced (FR-010, FR-014) |
| III. Free-Tier LLM Mandate | No paid key required; `.env.example` documents required keys | ✅ PASS | Groq only; `GROQ_API_KEY` + `GROQ_MODEL` required; no paid service used |
| IV. Tested Core Pipeline | One test per agent; tests run without live LLM | ✅ PASS | `tests/unit/agent-extraction.test.ts` + `tests/unit/agent-risk.test.ts`; LLM client stubbed via Vitest mock |
| V. Responsive & Accessible UI | ≤375px functional; WCAG AA badges; loading/empty/error states everywhere | ✅ PASS | Tailwind responsive classes; badge colors meet AA contrast; all pages handle loading/empty/error states via useState/useEffect |

*Post-Phase 1 re-check: All gates still pass — design does not introduce new violations.*

## Project Structure

### Documentation (this feature)

```text
specs/001-mail-risk-intelligence/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # REST API contract
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── index.ts                      # Express app, middleware, startup
│   ├── config.ts                     # env var loading and validation
│   ├── db.ts                         # better-sqlite3 instance + schema init (CREATE TABLE IF NOT EXISTS)
│   ├── seed.ts                       # first-run seed loader (mock_mailbox_data.json)
│   ├── models/
│   │   └── types.ts                  # TypeScript interfaces for all DB entities
│   ├── services/
│   │   ├── pipeline.ts               # Orchestrates Agent A → Agent B, manages status transitions
│   │   ├── agents/
│   │   │   ├── extraction.ts         # Agent A: raw email → Extraction (Zod-validated)
│   │   │   └── risk.ts               # Agent B: Extraction → RiskAssessment + entities (Zod-validated)
│   │   ├── ingestion/
│   │   │   ├── parser.ts             # .txt / .pdf (unpdf) / .eml (mailparser) → plain text
│   │   │   └── validator.ts          # file type + content validation
│   │   └── llm/
│   │       └── client.ts             # LLM abstraction: Groq / Gemini / Ollama + exponential backoff
│   └── routes/
│       ├── emails.ts                 # GET /emails, GET /emails/:id, POST /emails, POST /emails/:id/retry
│       └── graph.ts                  # GET /graph
├── tests/
│   ├── unit/
│   │   ├── agent-extraction.test.ts  # Agent A with stubbed LLM client
│   │   └── agent-risk.test.ts        # Agent B with stubbed LLM client
│   └── integration/
│       └── pipeline.test.ts          # full pipeline with stubbed LLM, in-memory SQLite
├── package.json
├── tsconfig.json
└── vitest.config.ts

frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx                       # React Router setup
│   ├── types/
│   │   └── index.ts                  # TypeScript interfaces (mirrors backend models/types.ts)
│   ├── services/
│   │   └── api.ts                    # fetch-based API client functions
│   ├── components/
│   │   ├── RiskBadge.tsx             # color-coded badge (none/low/medium/high)
│   │   ├── EmailListItem.tsx         # single inbox row
│   │   ├── EntityPanel.tsx           # entities + relationships display
│   │   ├── EmptyState.tsx            # reusable empty state component
│   │   └── ErrorState.tsx            # reusable error state with retry callback
│   └── pages/
│       ├── InboxPage.tsx             # US1: risk-sorted email list, useState/useEffect polling
│       ├── EmailDetailPage.tsx       # US3: full detail + entity panel
│       ├── AddEmailPage.tsx          # US4: paste text or upload file
│       └── GraphPage.tsx             # US5 bonus: React Flow knowledge graph
├── tests/
│   └── components/
│       └── RiskBadge.test.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts

mock_mailbox_data.json                # 10 seed emails
.env.example
README.md
PROCESS.md
```

**Structure Decision**: Web application with separate `backend/` (Node.js/Express/TypeScript)
and `frontend/` (React/TypeScript/Vite) directories. All cross-boundary communication is via
the REST API defined in `contracts/api.md`. No shared runtime code between backend and frontend;
TypeScript interfaces in `types.ts` are duplicated by convention (keeping them in sync is a
manual task acceptable at this scope).

Frontend state management uses React's built-in `useState` and `useEffect` directly in page
components. No external state management library. Polling for `processing` emails is
implemented as a `useEffect` with `setInterval` that clears when the email reaches `done`
or `failed`.

## Complexity Tracking

> No constitution violations — this section is not applicable.
