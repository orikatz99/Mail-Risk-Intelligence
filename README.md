# Mail Risk Intelligence

A full-stack email risk analysis tool for compliance teams. Emails are processed through a two-stage LLM pipeline that extracts structured metadata and produces a risk assessment, named entities, and relationship data. Results are surfaced in a risk-sorted inbox, an email detail view, and an interactive knowledge graph.

---

## Setup

### Prerequisites

- Node.js 20+
- A [Groq](https://console.groq.com) API key (free tier)

### Install

```bash
# Clone the repository, then:
cd backend && npm install
cd ../frontend && npm install
```

### Configure

```bash
cp .env.example .env
```

Edit `.env` and set:

```
GROQ_API_KEY=your_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

`openai/gpt-oss-120b` is the model this project was built and tested with. `GROQ_MODEL` is configurable — any Groq-compatible chat model can be substituted.

### Run

In two separate terminals:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

On first run, the backend loads the 10 seed emails from the provided mock_mailbox_data.json file into the database and processes them through the same pipeline used for user-added emails. The database is stored as backend/mailbox.db and persists between runs.

### Tests

```bash
cd backend && npm test
cd frontend && npm test
```

---

## Architecture

The application is a React 19 TypeScript SPA (Vite, React Router 7) backed by a Node.js 20 / Express 4 TypeScript REST API. All data is stored in a local SQLite database via `better-sqlite3`.

When an email is submitted, it enters a two-stage LLM pipeline:

1. **Agent A — Extraction**: takes raw email content and produces structured metadata — sender, recipients, date, subject, summary, and key facts (amounts, account numbers, dates, reference IDs).
2. **Agent B — Risk & Graph**: takes Agent A's output and produces a risk level (`none` / `low` / `medium` / `high`), a rationale, tags, named entities, and typed relationships between entities.

The processing pipeline follows the assignment's two-agent requirement. Each agent issues one LLM call, validates the response against a strict Zod schema, and throws a diagnosable error if validation fails. Emails are processed serially (one at a time) to stay within Groq's free-tier rate limits.

The frontend polls for status updates while an email is processing. A knowledge graph view aggregates deduplicated entities and relationships across all processed emails, rendered with React Flow and automatically laid out using dagre.

---

## Technology Decisions

**React + TypeScript (frontend):** Required by the assignment; also the right fit for a single-page application at this scope. Familiar and productive.

**Node.js + Express (backend):** Chosen over the Python/FastAPI alternative. I have experience with both, but work more often with Node.js and Express, making it the more natural choice. It is also a good fit for a small REST API at this scope.

**SQLite:** Chosen for persistence without requiring a separate database server. A single `mailbox.db` file is sufficient for a local single-user tool. No ORM — raw SQL queries via `better-sqlite3`'s synchronous API.

**Groq (LLM provider):** Chosen for its free tier and simple SDK. The model (`openai/gpt-oss-120b`) is configurable via `GROQ_MODEL`. No paid service is required to run the project.

**Two-agent pipeline:** Follows the assignment's two-agent requirement. Agent A focuses solely on extraction; Agent B focuses on risk analysis and entity extraction. Separating the two responsibilities makes each agent's prompt more focused, its output schema simpler, and failures easier to diagnose.

**Zod (LLM output validation):** LLM responses cannot be trusted to always match the expected structure. Both agents validate output with Zod before persisting anything. A validation failure marks the email as `failed` with a clear error message rather than storing malformed data.

**Tailwind CSS:** Chosen for familiarity and development speed. Utility classes applied directly in JSX eliminate the need for separate CSS files, which suited the time-boxed scope of this assignment.

**React Flow + dagre (knowledge graph):** The knowledge graph is a bonus feature. React Flow handles interactive node/edge rendering, pan, zoom, and selection. Dagre computes an automatic left-to-right hierarchical layout so the graph reflects entity relationships rather than arbitrary positions.

---

## LLM Unavailability

If the Groq API is unavailable or returns an error, the pipeline retries up to three times with exponential backoff (10s, 20s) on rate-limit errors. Any other error causes an immediate failure. After exhausting retries, the email is marked `failed` and the error message is stored and displayed in the UI. The user can retry the full pipeline via a retry button on the email detail page.

There is no secondary provider or offline fallback. A clear failure state is preferable to presenting partial or potentially unreliable analysis results.

---

## Tradeoffs

**Serial processing vs. speed:** Emails are processed one at a time rather than concurrently. This makes bulk processing slower but reduces rate-limit failures on Groq's free tier and simplifies error handling.

**Groq-only vs. multiple LLM providers:** The LLM client is abstracted behind a single `complete()` function, but only Groq is implemented. Supporting additional providers (Gemini, Ollama) would increase flexibility at the cost of additional complexity outside the assignment scope.

**SQLite simplicity vs. queryable storage:** SQLite requires no setup and fits a local single-user application well. Some structured arrays (recipients, tags, key facts) are stored as serialized JSON strings, which keeps the schema simple but would be less suitable for complex querying at larger scale.

**Polling vs. WebSockets:** The frontend polls every 3 seconds while an email is processing rather than maintaining a persistent connection. This is simpler and sufficient for a local tool, at the cost of slightly delayed updates and lower scalability.

---

## Scope

This is a local development tool with no authentication and no deployment target. It is designed for a single user running both services on `localhost`.

---

## What I'd Do With More Time

- Improve the visual design of the knowledge graph — the functionality is in place but the presentation could be more polished.
- Experiment with stronger or more capable LLM models to improve the consistency and quality of extraction and risk analysis.
- Test with a larger and more varied set of real email data to surface edge cases in the pipeline.

---

## Time Spent

Approximately 6–7 hours total:

- ~1.5 hours: planning, specification, and project setup
- ~4 hours: implementation, testing, and debugging
- ~1 hour: UI polish, manual verification, and documentation

I worked on the project across multiple sessions, so the time breakdown above is an estimate rather than exact tracked time.
