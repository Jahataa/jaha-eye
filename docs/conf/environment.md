# Environment variables

Copy `.env.example` to `.env` at the repo root. Prisma commands (`npm run db:migrate`, etc.) load this file automatically — no separate copy under `packages/database/` is needed.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `POSTGRES_PASSWORD` | No | `jaha_eye_dev_secret` | Postgres password for `docker compose` (must match `DATABASE_URL`) |
| `OPENAI_API_KEY` | No* | — | API key for model runs and settings connection test |
| `OPENAI_BASE_URL` | No | OpenAI default | Fallback base URL for local models (Ollama, etc.) |
| `API_TOKEN` | Yes | — | Shared bearer token for all `/api/*` routes |
| `API_PORT` | No | `4000` | Fastify listen port |
| `API_HOST` | No | `127.0.0.1` | Fastify bind address |
| `WEB_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin for the dashboard |
| `VITE_API_URL` | No | `http://localhost:4000` | API URL for Vite dev proxy |
| `HTTP_ALLOWED_HOSTS` | No | *(deny all)* | Hosts allowed for `http_request` and `web_fetch`: `all` for any public host, or comma-separated exact hostnames (e.g. `technopolis.bg,www.technopolis.bg`). When unset or empty, network tools refuse every host. Private, loopback, and link-local addresses are always blocked. Read per request. |
| `SEARXNG_URL` | No* | — | Base URL of the local SearXNG instance for the `web_search` tool (default in `.env.example`: `http://127.0.0.1:8888`) |
| `SEARXNG_SECRET` | No | `change-me-local-searxng-secret` | Secret key for the SearXNG container (`docker-compose.tools.yml`) |
| `NODE_ENV` | No | — | `development` enables Prisma warning logs; `production` disables the dev Prisma client cache |

\*Required for model runs. Set in `.env` only — the API does not store keys in Postgres.

\*Required for `web_search` when that tool is enabled on an agent. Start SearXNG with `docker compose -f docker-compose.yml -f docker-compose.tools.yml up -d` (included in `npm run local:start`).

The Vite dev proxy adds `Authorization: Bearer $API_TOKEN` to proxied `/api` requests (including SSE). `API_TOKEN` is read from server env at dev time, not exposed as a `VITE_` variable.

Global LLM defaults live in `AppSettings` (base URL, default model, temperature). Per-agent model settings are stored in the `Agent` table; per-agent base URL overrides the global URL when set.
