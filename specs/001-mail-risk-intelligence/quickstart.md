# Quickstart: Mail Risk Intelligence

## Prerequisites

- Node.js 20+ and npm 10+
- A Groq API key (free at [console.groq.com](https://console.groq.com)) — or see
  **Alternative LLM Providers** below

## 1. Clone and configure

```bash
git clone <repo-url>
cd Mail-Risk-Intelligence
cp .env.example .env
# Edit .env and set GROQ_API_KEY=<your-key>
```

### `.env.example` reference

```env
# LLM Provider: "groq" (default) | "gemini" | "ollama"
LLM_PROVIDER=groq

# Groq (free tier — https://console.groq.com)
GROQ_API_KEY=your-groq-api-key-here
GROQ_MODEL=llama-3.1-70b-versatile

# Google Gemini free tier (alternative)
# GEMINI_API_KEY=your-gemini-api-key-here
# GEMINI_MODEL=gemini-1.5-flash

# Ollama local (alternative — no API key needed)
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3

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

## Alternative LLM Providers

### Google Gemini (free tier)

1. Get a key at [aistudio.google.com](https://aistudio.google.com).
2. Set in `.env`:
   ```env
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=<your-key>
   GEMINI_MODEL=gemini-1.5-flash
   ```

### Ollama (fully local, no API key)

1. Install Ollama: [ollama.com/download](https://ollama.com/download)
2. Pull a model: `ollama pull llama3`
3. Set in `.env`:
   ```env
   LLM_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3
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
