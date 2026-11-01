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

## Graphify (optional)

[Graphify](https://github.com/Graphify-Labs/graphify) builds a local knowledge graph under `graphify-out/` (gitignored). The project skill lives in `.cursor/skills/graphify/`; Cursor loads `.cursor/rules/graphify.mdc` after `graphify install --platform cursor --project`.

Install the CLI once (includes Postgres introspection):

```bash
uv tool install 'graphifyy[postgres]'
```

With Postgres running (`docker compose up -d`) and `DATABASE_URL` in `.env`:

```bash
npm run graphify:extract   # AST on code + live schema (tables, FKs)
npm run graphify:update    # after code edits (no LLM)
graphify query "How does AgentRun persist?"
graphify explain jaha_eye --all
```

Re-run `graphify:extract` after migrations so table nodes stay in sync. This does not replace Prisma migrations.

Open **Graphify** in the sidebar (`/graphify`) for a visual status page, schema diagram, and rebuild buttons (API must have the `graphify` CLI on `PATH`). See [Knowledge graph](../ui/knowledge-graph.md).

## Later

Phase 2 may add Redis, worker containers, and optional Langfuse stack. Not in current Compose file.
