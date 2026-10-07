# Research: Mail Risk Intelligence

**Branch**: `001-mail-risk-intelligence` | **Date**: 2026-10-07

## Decision 1: Backend Framework

**Decision**: Node.js 20 + Express 4 + TypeScript 5

**Rationale**: The assignment permits Node/Express or Python/FastAPI. Node.js was
selected to unify the language across the full stack (TypeScript on both sides),
which simplifies type sharing and reduces cognitive overhead during a time-boxed
build. Express is minimal — it adds routing and middleware without imposing
structure, leaving pipeline and service organization to the application code.
TypeScript's strict mode catches the schema mismatches that are especially likely
in LLM output parsing.

**Alternatives considered**:
- Python/FastAPI: Strong async I/O and LLM ecosystem, but introduces a second
  language. Better PDF/EML libraries exist in Python, but Node equivalents
  (unpdf, mailparser) cover the in-scope cases adequately.

---

## Decision 2: LLM Provider

**Decision**: Groq API (free tier) as primary; Google Gemini free tier and Ollama
documented as alternatives.

**Rationale**: Groq's free tier offers the highest throughput (~14,400 req/day)
with the fastest inference speeds. `llama-3.1-70b-versatile` on Groq performs well
on structured extraction and risk classification. The `groq` Node.js SDK is
well-maintained and supports `async/await`.

**Alternatives considered**:
- Google Gemini free tier: 15 RPM / 1M tokens/day. Viable fallback; documented
  in README and `.env.example`.
- Ollama (local): Zero API dependency, fully offline. Slower on CPU-only machines;
  documented as fallback for air-gapped environments.

**Provider abstraction**: `backend/src/services/llm/client.ts` exposes a single
`async function complete(prompt: string): Promise<string>`. Switching providers
requires only changing the `LLM_PROVIDER` environment variable.

---

## Decision 3: PDF Text Extraction

**Decision**: `unpdf`

**Rationale**: `unpdf` provides a clean promise-based API (`extractText(buffer)`)
built on a worker-free variant of PDF.js. It requires no native binaries and works
directly on a `Buffer` or `Uint8Array`, which is exactly what Express multipart
file upload provides. Its worker-free design avoids the additional setup complexity
of full `pdfjs-dist`.

**Alternatives considered**:
- `pdf-parse`: Simpler API (3 lines), but dormant since 2021. Has a quirk loading
  a test file on `require` — harmless with Vitest but indicative of maintenance
  state.
- `pdfjs-dist` (full): More complete, actively maintained by Mozilla, but requires
  configuring a worker for Node.js use — meaningfully more setup for the same
  plain-text-extraction output.

**Scope boundary**: Image-only PDFs (scanned documents without text layers) are
out of scope. `unpdf` returns an empty string for these; the pipeline stores
`null` for `extracted_text` and continues without failing.

---

## Decision 4: SQLite Access

**Decision**: `better-sqlite3` — direct SQL, synchronous API

**Rationale**: `better-sqlite3` is the fastest and most widely used SQLite binding
for Node.js. Its synchronous API is appropriate for a local single-user tool — no
concurrent requests means no event-loop blocking concern. The SQL queries in
`data-model.md` translate directly without an ORM abstraction layer. TypeScript
types for query results are declared manually in `models/types.ts`, keeping the
data layer explicit and easy to audit.

**Alternatives considered**:
- Drizzle ORM + better-sqlite3: TypeScript-native ORM with good type inference.
  Reasonable choice, but adds schema definition overhead for 5 tables and ~6
  pre-designed queries. The type safety benefit is moderate given the queries are
  already written.
- Prisma: Best-in-class TypeScript integration but heavy setup (schema DSL,
  `prisma generate`, migration engine binary). Not justified for the time box.

---

## Decision 5: EML Parsing

**Decision**: `mailparser` (from the nodemailer ecosystem)

**Rationale**: `mailparser` is the de facto standard for parsing `.eml` files in
Node.js. It handles RFC 2822 MIME multipart, base64 and quoted-printable encoding,
international headers, and attachment extraction. Its structured output
(`from`, `to`, `subject`, `date`, `text`, `attachments[]`) maps directly to what
Agent A needs as input. It is actively maintained as part of the nodemailer project.

**Alternatives considered**:
- `postal-mime`: Newer, smaller bundle, clean async API. Less battle-tested for
  complex MIME structures; designed primarily for edge runtimes.
- Manual parsing: RFC 2822 MIME edge cases (folded headers, charset detection,
  nested MIME parts) make this a reliability risk. Not justified given a library
  exists.

---

## Decision 6: LLM Output Validation

**Decision**: Zod runtime schema validation for Agent A and Agent B outputs

**Rationale**: LLMs can return well-formed JSON that does not match the expected
schema — wrong field names, missing required fields, out-of-range enum values
(e.g., a risk level of `"critical"` instead of `"high"`). Zod validates the parsed
JSON at the boundary between the LLM and the rest of the pipeline. A Zod parse
failure is caught, logged, and the email transitions to `failed` — preventing
malformed data from entering the database silently.

Specific invariants enforced:
- Agent A: `sender` (string or null), `recipients` (string[]), `date` (string or
  null), `subject` (string or null), `summary` (string or null), `key_facts`
  (array of `{ type: enum, value: string }`).
- Agent B: `risk_level` (enum: none/low/medium/high), `rationale` (string),
  `tags` (string[]), `entities` (typed array), `relationships` (typed array).

**Alternatives considered**:
- Manual validation (if/typeof checks): More verbose and easier to miss edge cases
  than a declarative schema.
- TypeScript type assertions (`as SomeType`): No runtime enforcement — defeats the
  purpose of validating untrusted LLM output.
- `ajv` (JSON Schema): More verbose schema definition than Zod for TypeScript
  projects; no built-in type inference.

---

## Decision 7: Frontend State Management

**Decision**: React built-in `useState` and `useEffect` with native `fetch`

**Rationale**: The MVP's data-fetching needs are straightforward: load a list,
load a detail, post a new item, poll a processing item until done. These patterns
are fully expressible with `useState`/`useEffect`/`fetch` without an external
library. Each page component manages its own loading/error/data state. Polling
for a `processing` email uses a `setInterval` inside `useEffect` that clears when
the email reaches `done` or `failed`.

Adding TanStack Query for the MVP introduces a dependency whose primary benefit
(automatic cache invalidation and background refetch) would only become clearly
worth the cost if the app grew to multiple pages sharing the same server state.

**Alternatives considered**:
- TanStack Query v5: Well-suited for this app pattern and would simplify the
  polling implementation in particular. Acceptable addition post-MVP if the
  built-in approach proves cumbersome during implementation.
- SWR: Similar trade-off to TanStack Query — justified post-MVP, not for the
  initial build.
- Zustand / Redux: Client-side state managers — not relevant here since all
  meaningful state is server-derived.

---

## Decision 8: Knowledge Graph Visualization

**Decision**: React Flow (`reactflow` v11) — bonus feature only

**Rationale**: React Flow is the most widely adopted React graph visualization
library. It is TypeScript-native, renders nodes as React components (Tailwind
styling works naturally), and handles pan/zoom/click natively. It is included
in the plan as the implementation target for US5 (bonus) only. The MVP (US1–US4)
has no dependency on React Flow.

**Alternatives considered**:
- Cytoscape.js: More powerful for complex layouts; higher API surface and requires
  a React wrapper.
- D3-force: Maximum flexibility; requires manual React integration and significantly
  more implementation time for basic interactions.

---

## Decision 9: Styling

**Decision**: Tailwind CSS v4 (installed: 4.3.3)

**Rationale**: Utility-first CSS satisfies the mobile-first requirement (≤375px
baseline, progressive enhancement) with minimal custom CSS. The `sm:`/`md:` prefix
system handles responsive layout changes inline. The user has prior experience with
Tailwind, removing the learning curve cost. v4 was installed as the current npm
latest; its Vite plugin (`@tailwindcss/vite`) integrates cleanly with the existing
Vite configuration.

**v4 configuration note**: Tailwind v4 uses a CSS-first approach — no
`tailwind.config.js`. The single setup line is `@import "tailwindcss"` in
`src/index.css`. The `@tailwindcss/vite` plugin handles all optimization
(content scanning, dead code elimination via Lightning CSS) automatically.

**Alternatives considered**:
- CSS Modules: More explicit, but slower iteration on responsive layouts.
- styled-components: Runtime CSS-in-JS overhead.
- Plain CSS: Viable but slower for responsive-first UI in a 5–6 hour time box.

---

## Decision 10: Retry / Backoff Implementation

**Decision**: Custom exponential backoff in `llm/client.ts` — max 3 attempts,
base delay 1s, factor ×2 (delays: 1s → 2s → 4s)

**Rationale**: The spec (FR-014, clarification Q2) requires up to 3 retry attempts
with exponential backoff on rate-limit (HTTP 429) responses. A 10-line custom
implementation avoids adding a retry library for a single use case.

**Alternatives considered**:
- `p-retry` or `axios-retry`: Clean abstractions but add a dependency for a
  pattern that is straightforward to implement directly.
- Immediate fail on rate limit: Rejected (clarification Q2 answer B).
