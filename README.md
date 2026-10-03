# jaha-eye

Operator console for managing and monitoring AI agents.

jaha-eye is a **control plane**: you define agents (model, prompt, tools), start runs, watch live execution timelines, and stop runs — all through a React dashboard backed by a Fastify API and PostgreSQL.

## Quick start

**Prerequisites:** Node.js 22+, Docker

```bash
# 1. Start Postgres
docker compose up -d

# 2. Configure environment
cp .env.example .env
# Edit .env — set OPENAI_API_KEY (and optionally OPENAI_BASE_URL for local models)

# 3. Install and migrate
npm install
npm run db:migrate

# 4. Start dev servers
npm run dev
```

- **Web UI:** http://localhost:5173
- **API:** http://localhost:4000

## Documentation

Full documentation lives in [`docs/`](docs/README.md):

- [Architecture](docs/architecture/overview.md) — system design and phase boundaries
- [UI](docs/ui/README.md) — screens, state, components
- [Configuration](docs/conf/README.md) — environment, Docker, models
- [Source](docs/src/README.md) — package map and package docs
- [Agents](docs/agents/definitions-and-runs.md) — agent definitions, runs, tools

For coding agents, start with [AGENTS.md](AGENTS.md).

## Monorepo layout

```
apps/web          React dashboard (Vite)
apps/api          Fastify control API
packages/database Prisma + PostgreSQL
packages/shared   Shared types and Zod schemas
packages/agent-core AgentRuntime, Strands adapter
```

## Phase 1 scope

Included: agent CRUD, manual runs, live SSE timeline, cancel, event persistence.

Not included (Phase 2+): Redis, BullMQ, worker process, schedules, approvals, Langfuse.

## Research

Original architecture research: [research.md](research.md)
