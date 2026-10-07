# PROCESS.md — AI-Assisted Development Workflow

This document describes how I used Claude Code (AI) during the development of Mail Risk Intelligence. The approach throughout was AI-assisted, human-directed: Claude handled the bulk of implementation within clearly defined scopes, while I reviewed decisions before approving them, tested the running application, and corrected or redirected when the output didn't match the assignment or my intent.

---

## Planning

Before writing any implementation code, I used Spec Kit (a Claude Code planning skill) to generate a full set of design documents from the assignment brief:

- `spec.md` — functional requirements and constraints
- `data-model.md` — SQLite schema and entity relationships
- `contracts/api.md` — REST API contract
- `plan.md` — architecture decisions and project structure
- `tasks.md` — phased task list (T001–T046) with explicit dependencies, parallel opportunities, and per-phase checkpoints

This produced a concrete implementation plan before any code was written. I reviewed the proposed technology stack during planning and made deliberate changes: I chose Node.js/Express over the initially proposed Python/FastAPI based on my own experience and preference. I also reduced the initially proposed multi-LLM-provider design (Groq, Gemini, Ollama) to Groq only, keeping the implementation focused within the assignment time box.

---

## Development Workflow

Each phase followed the same pattern:

1. Provide Claude with a scoped prompt referencing the relevant tasks
2. Claude implements the tasks, runs typechecks and tests, marks tasks complete
3. I manually verify the result in the running application in the browser
4. If the output is correct, I confirm and move to the next phase; if not, I identify the problem and redirect

For decisions with visual or architectural significance, I asked Claude to recommend a fix or approach before making any changes, and approved or rejected before implementation proceeded.

---

## Autonomy Within Scoped Batches

Claude was given autonomy to implement within clearly scoped task batches — typically one phase at a time. Phases 1–2 (project setup and foundational infrastructure) required very little intervention. For Phases 3–6 (the four core user stories), Claude implemented each batch end-to-end, but several of the important corrections and live-testing discoveries occurred within those phases. I verified each phase in the browser before moving to the next, which is where most issues surfaced.

---

## Key Interventions and Corrections

**Seed data handling**
Early in planning, Claude moved toward generating its own mock email data. I caught this and corrected it: the provided `mock_mailbox_data.json` must be used exactly as given, and seed emails must flow through the same Agent A → Agent B pipeline as any user-submitted email — not be pre-populated with static results.

**Technology stack**
During planning, Claude initially proposed Python/FastAPI as one option. I reviewed the proposed stack before any implementation and chose Node.js/Express based on my own experience and the scope of the project. Claude proceeded from my choice rather than its suggestion.

**Groq rate limits (discovered in live testing)**
When I first ran the application end-to-end with all 10 seed emails, the pipeline attempted to process all of them concurrently. Since each email requires two LLM calls, this immediately hit Groq's free-tier rate limit and several emails failed with 429 errors. The initial retry backoff was also too short for the actual retry window. I identified the problem from the failure states in the UI, and we changed the pipeline to a serial queue (one email at a time) and increased the backoff delays to 10s and 20s with a maximum of 3 attempts. After reprocessing, all emails completed successfully.

**Agent output robustness**
During live processing, the LLM returned an entity type (`"reference"`) that was not in the defined schema. I identified this from inconsistent graph data and we adjusted the handling so that unexpected entity types would not corrupt the stored graph or cause the application to crash.

**Knowledge graph (most iterative)**
The knowledge graph required four rounds of correction, all identified through visual testing in the browser:

1. Initial render: nodes appeared as invisible points — React Flow requires its own state hooks (`useNodesState`/`useEdgesState`) for dimension measurement; a no-op change handler broke `fitView`
2. Grid layout: nodes were evenly spaced but position was unrelated to relationships
3. Dagre layout: automatic hierarchical layout based on relationships; correct conceptually but rendered top-to-bottom despite `rankdir: 'LR'`
4. Handle direction: React Flow routes edges between handle positions; changing node handles from `Position.Top`/`Bottom` to `Position.Left`/`Right` fixed the left-to-right flow

For each round, I described the visual problem, asked Claude to diagnose and recommend a fix before touching anything, then approved the change.

**UI corrections**
Several small UI decisions were reversed after I saw them in the browser: "＋ Add" was reverted to "+ Add Email"; the header background was changed from `bg-blue-50` to `bg-blue-100` after I judged the lighter shade too subtle; consistent header styling was then applied across all four pages.

**Health endpoint**
I noticed the health endpoint had been registered as `/api/health` rather than `/health` as the spec required. Before changing it, I asked Claude to verify there were no other references to the old path in the codebase, then approved the correction.

**README**
Rather than asking Claude to auto-generate the README, I conducted a structured interview covering each significant technology decision — what was chosen, why, and what the tradeoffs were. The README reflects my actual reasoning rather than plausible-sounding reconstruction.

---

## Theme

Claude handled the bulk of the implementation work. My contribution was to define the scope clearly before each phase, review recommendations before approving them, test actual behavior in the running application, and correct the AI when its output didn't match the assignment requirements or my own judgment. The most important corrections came from running the application and observing real failures — not from code review alone.
