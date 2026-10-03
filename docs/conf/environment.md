# Environment variables

Copy `.env.example` to `.env` at the repo root. Prisma commands (`npm run db:migrate`, etc.) load this file automatically — no separate copy under `packages/database/` is needed.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes* | — | API key for OpenAI-compatible provider |
| `OPENAI_BASE_URL` | No | OpenAI default | Override for local models (Ollama, etc.) |
| `API_PORT` | No | `4000` | Fastify listen port |
| `API_HOST` | No | `0.0.0.0` | Fastify bind address |
| `VITE_API_URL` | No | `http://localhost:4000` | API URL for Vite dev proxy |

\*Required for runs that call a model. Tool-only smoke tests may still need a key if the model is invoked.

Per-agent model settings (provider, model name, base URL, temperature) are stored in the `Agent` table and override env defaults when set.
