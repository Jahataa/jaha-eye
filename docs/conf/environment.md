# Environment variables

Copy `.env.example` to `.env` at the repo root. Prisma commands (`npm run db:migrate`, etc.) load this file automatically — no separate copy under `packages/database/` is needed.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `OPENAI_API_KEY` | No* | — | Fallback API key when not set in Settings |
| `OPENAI_BASE_URL` | No | OpenAI default | Fallback base URL for local models (Ollama, etc.) |
| `API_PORT` | No | `4000` | Fastify listen port |
| `API_HOST` | No | `0.0.0.0` | Fastify bind address |
| `VITE_API_URL` | No | `http://localhost:4000` | API URL for Vite dev proxy |
| `HTTP_ALLOWED_HOSTS` | No | — | Comma-separated hostnames allowed for `http_request` and `web_fetch` (e.g. `httpbin.org,example.com`). When unset, all hosts are allowed. |

\*Required for model runs when Settings has no stored key. Configure via `/settings` or `.env`.

Global LLM defaults live in `AppSettings` (Settings page). Per-agent model settings (provider, model name, base URL, temperature) are stored in the `Agent` table; per-agent base URL overrides the global URL when set.
