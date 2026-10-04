# Phased roadmap

Delivery is intentionally incremental. Phase 1 proves the operator UX; later phases add scale, safety, and observability.

## Phase 1 — Agent Control MVP (current)

**Stack:** React, Fastify, Strands, PostgreSQL, in-process runner.

| Feature | Status |
|---------|--------|
| Agent CRUD (create, edit, enable/disable, delete) | ✅ |
| Manual run start/stop | ✅ |
| Live AG-UI SSE timeline | ✅ |
| Event persistence (refresh rebuilds timeline) | ✅ |
| Six built-in tools + role presets | ✅ |
| OpenAI-compatible model provider | ✅ |
| Orchestration CRUD (saved agent DAGs) | ✅ |
| Canvas editor (`@xyflow/react`) | ✅ |
| Orchestration run (parent + child runs) | ✅ |
| Parent/child run graph UI | ✅ |
| Cancel parent stops all children | ✅ |

**Explicitly not in Phase 1:** Redis, BullMQ, separate worker, cron schedules, agent versioning, approvals, Langfuse, local host runner.

## Phase 2 — Platform scale

| Feature | Notes |
|---------|-------|
| Redis + BullMQ + worker process | `QueueAgentRunner` behind same `AgentRuntime` interface |
| Schedules (cron, webhook triggers) | Scheduler creates `AgentRun` rows; never executes agents directly |
| Retries and concurrency limits | Per-agent `maxRuns` enforcement |
| Agent versioning | Immutable versions; runs record `agentVersionId` |
| MCP tool picker | Native + MCP tools in agent editor |
| Human approvals | `approval_required` gate before dangerous tools |
| HITL / run resume | `waiting` status, `handoff_to_user` tool |

## Phase 3 — Observability

| Feature | Notes |
|---------|-------|
| OpenTelemetry instrumentation | Traces/metrics from Strands through collector |
| Langfuse (optional self-hosted) | Token usage, costs, latency, trace visualization |
| Run metrics panel | Duration, tokens, model, tool count on run detail |

## Phase 4 — Advanced orchestration

| Feature | Notes |
|---------|-------|
| Nested orchestrations | Graph inside a graph node |
| Conditional edges | Branch on node output |
| Cyclic graphs with guards | Requires careful cycle detection |
| Strands Graph/Swarm as optional pattern | Only if it maps cleanly to our run model |
| Supervisor / agents-as-tools (Slice E) | Custom per-edge prompt templates |

Note: basic parent/child runs and DAG orchestration shipped in Phase 1. Phase 4 covers richer graph semantics.

## Phase 5 — Local computer agents

| Feature | Notes |
|---------|-------|
| Local Agent Runner (host process) | Filesystem, shell, browser, SSH outside Docker |
| Per-tool permissions | allow / deny / approval_required |
| Docker vs host execution modes | Control plane in Docker; runner on Mac/Linux host |

## Implementation order (original research recommendation)

1. React + Vite → Fastify → Strands → PostgreSQL *(done)*
2. Redis + BullMQ + worker
3. Schedules + approvals + MCP
4. OpenTelemetry + Langfuse
5. Local runner + permission controls

See [future.md](future.md) for detail on **Later** items.
