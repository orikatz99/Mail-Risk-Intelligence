# Quickstart: Mail Risk Intelligence

## Prerequisites

- Node.js 20+ and npm 10+
- A Groq API key (free at [console.groq.com](https://console.groq.com))

## 1. Clone and configure

```bash
git clone <repo-url>
cd Mail-Risk-Intelligence
cp .env.example .env
# Edit .env and set GROQ_API_KEY=<your-key>
```

### `.env.example` reference

```env
# Groq (free tier — https://console.groq.com)
GROQ_API_KEY=your-groq-api-key-here
GROQ_MODEL=llama-3.1-70b-versatile

# Server port (default: 3000)
PORT=3000
```

## 2. Backend setup

```bash
cd backend
npm install
npm run dev
# API server starts at http://localhost:3000
```

On first start, the backend:
1. Creates `mailbox.db` (SQLite) in the repo root.
2. Seeds the 10 emails from `mock_mailbox_data.json` and queues them for processing.
3. Begins pipeline processing in the background.

## 3. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

## 4. Running tests

```bash
# Backend (no live LLM required — LLM client is stubbed)
cd backend
npm test

# Frontend
cd frontend
npm test
```

## Fallback behavior when LLM is unavailable

If the LLM API is unreachable or returns repeated errors, each affected email is
marked `failed` after 3 retry attempts with exponential backoff. The inbox shows
a clear error state with a **Retry** button. All previously processed emails
remain accessible. The app does not crash.

## Resetting the database

```bash
rm mailbox.db
# Restart the backend — seeds will re-run automatically.
```
