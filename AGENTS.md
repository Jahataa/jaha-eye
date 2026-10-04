# jaha-eye — Agent Guide

jaha-eye is an **operator console for many agents**, not a chat app. Read this file first.

## Core concepts

| Term | Meaning |
|------|---------|
| **Agent** | Saved definition: model, prompt, tools |
| **Run** | One execution of an agent definition |
| **Event** | AG-UI protocol event persisted to Postgres and streamed via SSE |

## Where things live

| Path | Purpose |
|------|---------|
| `docs/` | Human documentation (architecture, UI, config, source) |
| `.cursor/` | Coding-agent rules, skills, subagents, memory |
| `apps/web` | React dashboard (Vite + TanStack Query + Zustand) |
| `apps/api` | Fastify control API (REST + SSE) |
| `packages/agent-core` | `AgentRuntime`, Strands factory, event normalizer |
| `packages/database` | Prisma schema + client |
| `packages/shared` | Shared Zod schemas and types |
| `research.md` | Original research notes (source material) |

## Hard rules

1. **API never calls `new Agent()` directly** — only through `AgentFactory` / `StrandsRuntime`.
2. **Persist every event to `AgentRunEvent` before streaming** it to the client.
3. **Phase 1 has no Redis, BullMQ, worker, schedules, or Langfuse.**
4. **UI speaks REST + AG-UI SSE only** — no direct Strands imports in `apps/web`.
5. **Do not use `createStrandsApp`** — we encode SSE ourselves in Fastify.

## Session start checklist

Before non-trivial work, read:

1. This file (`AGENTS.md`)
2. `.cursor/memory/project.md`
3. `docs/architecture/overview.md`

## Documentation rule

A code change updates the matching doc in the same pass:

- UI → `docs/ui/`
- Config → `docs/conf/`
- Source → `docs/src/`
- Architecture → `docs/architecture/`

## Running locally

```bash
npm run local:start           # Postgres + install + migrate + dev (API :4000, Web :5173)
npm run local:stop            # stop dev servers + docker compose down
```

Manual flow: `docker compose up -d`, copy `.env.example` → `.env`, `npm install`, `npm run db:migrate`, `npm run dev`.

See [README.md](README.md) and [docs/](docs/README.md) for details.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
