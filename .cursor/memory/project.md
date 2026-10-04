# jaha-eye project state

**Phase:** 1 — Agent Control MVP  
**Date:** 2026-10-04

## Stack

- **Frontend:** Vite, React, TypeScript, React Router, TanStack Query, Zustand, Tailwind, shadcn-style components, `@xyflow/react` (orchestration canvas)
- **Backend:** Fastify, Zod, in-process runner, in-API DAG executor
- **Runtime:** Strands TypeScript SDK + `@ag-ui/aws-strands` (StrandsAgent)
- **Database:** PostgreSQL + Prisma
- **Monorepo:** npm workspaces + Turborepo, Node 22, scope `@jaha-eye/*`

## In scope (Phase 1)

- Agent CRUD (create, edit, enable/disable, delete)
- Orchestration CRUD (saved agent DAGs, canvas editor, run)
- Manual run start/stop (single agent and orchestration parent + children)
- Parent/child run graph UI (live canvas, tree, per-node timelines)
- Live AG-UI SSE timeline
- Event persistence to Postgres
- Six built-in tools (current_time, calculator, sleep, notebook, http_request, web_fetch)
- Role presets (General, Researcher, API operator, Planner)
- OpenAI-compatible default model provider

## Out of scope (later phases)

- Redis, BullMQ, separate worker
- Cron schedules, retries, concurrency limits
- Agent versioning, approvals, MCP tool picker (Slice D)
- HITL / run resume (Slice C)
- OpenTelemetry, Langfuse
- Strands Graph/Swarm as control plane
- Supervisor / agents-as-tools (Slice E)
- Nested orchestrations, cyclic graphs, conditional edges
- Local host runner (filesystem, shell)

## Key boundaries

- API → AgentFactory → StrandsRuntime → Strands (never `new Agent()` in routes)
- Orchestrations → DAG executor → child runs via same runner (not Strands Graph)
- Events: persist to DB, then stream via SSE
- UI: REST + SSE only
