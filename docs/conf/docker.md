# Docker Compose

Phase 1 includes **Postgres only**. API and web run via `npm run dev` on the host.

## One-command local dev

```bash
npm run local:start    # docker compose up, npm install, migrate deploy, npm run dev
npm run local:stop     # kill dev servers + docker compose down
npm run local:status   # show running pid and URLs
```

Wrappers: `./scripts/start` / `./scripts/stop` (Mac/Linux), `scripts\start.cmd` / `scripts\stop.cmd` (Windows).

`local:start` copies `.env.example` → `.env` on first run if missing. Dev server logs go to `.local-dev/dev.log`.

## Manual Postgres only

```bash
docker compose up -d
```

## Service

| Service | Image | Port | Database |
|---------|-------|------|----------|
| `postgres` | postgres:16 | 5432 | `jaha_eye` |

Default credentials: `postgres` / `postgres` (see `.env.example`).

## Later

Phase 2 may add Redis, worker containers, and optional Langfuse stack. Not in current Compose file.
