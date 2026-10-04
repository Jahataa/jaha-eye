# Control plane

The control plane manages agent definitions and run lifecycle.

## Components

| Component | Role |
|-----------|------|
| **apps/web** | Dashboard, agent registry/editor, run timeline |
| **apps/api** | REST CRUD, run start/cancel, SSE streaming |
| **packages/database** | Prisma models: Agent, AgentRun, AgentRunEvent |
| **packages/agent-core** | AgentRuntime, factory, Strands adapter |

## Run lifecycle (Phase 1)

1. `POST /api/agents/:id/run` creates `AgentRun` (status `queued`), returns `{ runId }`.
2. API calls `AgentRuntime.stream()` in-process (status → `running`).
3. Each AG-UI event is persisted to `AgentRunEvent`, then pushed to SSE subscribers.
4. On completion: status → `completed` or `failed`; on cancel → `cancelled`.
5. Client refresh: `GET /events` for history + `GET /stream` for live tail.

## Security boundary

The browser never connects to agent workers directly. All run start/stop and event streaming go through the control API, which owns authorization.

**Later:** a local Agent Runner process on the host for filesystem/shell tools, connected via secure API — see [planning/future.md](../planning/future.md).

## Later (Phase 2)

- Separate worker process via BullMQ
- Redis for live event fan-out
- Schedules, retries, concurrency limits

Full roadmap: [planning/roadmap.md](../planning/roadmap.md).
