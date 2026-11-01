# Knowledge graph (Graphify)

The **Graphify** screen (`/graphify`) shows what the local [Graphify](https://github.com/Graphify-Labs/graphify) pipeline has indexed: codebase symbols from AST extraction plus PostgreSQL tables and foreign keys from live introspection.

## What you see

| Area | Meaning |
|------|---------|
| **Stat cards** | Whether `graphify-out/graph.json` exists, when it was last written, node/edge counts, and whether Postgres schema is merged in |
| **Pipeline diagram** | Code and Postgres feed the graph file; the API reads it; this UI displays status (highlights while a rebuild runs) |
| **Activity log** | Tail of `graphify extract` or `graphify update` stdout/stderr while the API runs a rebuild |
| **Schema diagram** | Mermaid ER view of tables and `references` edges from the graph (not full column detail) |

Graphify does **not** run migrations or change the database. Use Prisma migrations as usual; re-run **Rebuild (code + DB)** after schema changes so the graph matches.

## Actions

- **Rebuild (code + DB)** — `graphify extract . --code-only --postgres "$DATABASE_URL" --no-cluster` on the API host (requires `graphify` CLI and Postgres reachable from the API).
- **Update code only** — `graphify update .` (incremental AST, no Postgres pass).

CLI equivalents from the repo root: `npm run graphify:extract`, `npm run graphify:update`.

## Requirements

- Install CLI on the machine running **apps/api**: `uv tool install 'graphifyy[postgres]'`.
- Postgres up when rebuilding with DB (`docker compose up -d` or `npm run local:start`).
- Optional: set `GRAPHIFY_UI=0` on the API to disable rebuild buttons (status still readable if the graph file exists).

## Cursor integration

Project rule `.cursor/rules/graphify.mdc` and skill `.cursor/skills/graphify/SKILL.md` tell coding agents to query the graph before exploring the repo. The dashboard page is for **operators** who want a visual snapshot without using the CLI.
