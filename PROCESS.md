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

Each phase followed the same general pattern:
- I reviewed the planned tasks before implementation and clarified or adjusted them when needed.
- I provided Claude with a scoped prompt referencing the relevant tasks.
- Claude implemented the tasks and ran the relevant typechecks and tests.
- I reviewed and manually tested the implementation before moving on to the next phase.
- If I found an issue or something that did not match the assignment or my intent, I redirected Claude and verified the correction.
- For decisions with visual or architectural significance, I asked Claude to recommend an approach before making changes, then reviewed and approved or rejected the recommendation before implementation proceeded.
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
The graph went through several iterations based on my visual testing in the browser. Although the initial implementations worked technically, I wasn't satisfied with how clearly they represented the relationships. I asked Claude to diagnose the issues and recommend an approach before making further changes. We eventually moved to a relationship-aware Dagre layout and adjusted the React Flow configuration until the graph was clear and usable.

For each round, I described the visual problem, asked Claude to diagnose and recommend a fix before touching anything, then approved the change.

**UI corrections**
During manual browser review, I identified a few small UI improvements. I asked for a subtle header background to create clearer visual separation from the content, and changed the add action to “+ Add Email” so its purpose was immediately clear. The same header styling was then applied consistently across the application.

**Health endpoint**
I noticed the health endpoint had been registered as `/api/health` rather than `/health` as the spec required. Before changing it, I asked Claude to verify there were no other references to the old path in the codebase, then approved the correction.

**README**
Rather than asking Claude to auto-generate the README, I conducted a structured interview covering each significant technology decision — what was chosen, why, and what the tradeoffs were. The README reflects my actual reasoning rather than plausible-sounding reconstruction.

---

## Theme

Claude handled the bulk of the implementation work. My contribution was to define the scope clearly before each phase, review recommendations before approving them, test actual behavior in the running application, and correct the AI when its output didn't match the assignment requirements or my own judgment. The most important corrections came from running the application and observing real failures — not from code review alone.
