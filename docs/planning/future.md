# Future capabilities

Detailed design notes for features labeled **Later** in docs and `.cursor/memory/project.md`. None of these exist in Phase 1 unless noted otherwise.

## Queue and worker (Phase 2)

Phase 1 runs Strands in-process inside the API. Long-running agents (45+ minutes) require fire-and-forget execution:

```
POST /api/agents/:id/run → { runId }   # HTTP returns immediately
Worker picks up job → Strands executes → events persist → SSE tail
```

Design the runner interface now so swap is straightforward:

```typescript
interface AgentRuntime {
  stream(...): AsyncIterable<AgentEvent>;
  cancel(runId: string): Promise<void>;
  getStatus(runId: string): Promise<AgentRunStatus>;
}
// Phase 1: StrandsRuntime (in-process)
// Phase 2: QueueAgentRunner (BullMQ)
```

### Redis role

| Store | Purpose |
|-------|---------|
| PostgreSQL | Permanent state (agents, runs, events) |
| Redis | Live coordination, job queue, distributed locks |

Do not use PostgreSQL LISTEN/NOTIFY as the primary high-frequency event bus.

## Schedules

**Phase 1 (shipped):** UI-ticked local cron. The `Schedule` table stores jobs; the browser `ScheduleTicker` fires them while the dashboard is open. The API exposes CRUD plus `POST /api/schedules/:id/fire` with atomic slot claim — it starts runs through existing services and never executes Strands directly. Missed fires while the UI is closed are skipped.

**Phase 2 (remaining):** worker-ticked cron and webhooks so jobs fire when the UI is closed, with optional timezone-aware scheduling and missed-fire policy. Flow becomes `Schedule → create AgentRun → queue → worker`.

Trigger types planned beyond Phase 1: webhook, agent-to-agent chain; persisted timezone as firing authority (Phase 1 shows IANA zone in the top bar for display only).

## Agent versioning (Phase 2)

Phase 1 edits agents in place. Later:

- `agents` + `agent_versions` tables
- Runs record `agentVersionId`
- Answer: "Which exact configuration produced this result?"

## Human approval (Phase 2)

Architecture should support approval gates even before the UI ships:

```
Agent proposes dangerous action → approval_required event → React dialog → approve/reject → agent continues
```

AG-UI and CopilotKit support HITL patterns; the control API remains the authority for dangerous actions.

## Tool permissions (Phase 5)

Per-tool policy on each agent:

| Tool | Permission |
|------|------------|
| `web_fetch` | allow |
| `filesystem.write` | approval_required |
| `shell.execute` | approval_required |
| `docker.execute` | deny |

Stored in agent configuration; enforced before tool invocation.

## MCP integration (Phase 2)

Strands supports MCP. The agent editor would show:

```
Native tools     ☑ web_fetch  ☑ http_request
MCP servers      ☑ GitHub  ☑ PostgreSQL  ☑ filesystem
```

MCP tools registered through `AgentFactory`, not ad hoc in routes.

## Local Agent Runner (Phase 5)

When agents need host access (filesystem, terminal, Mac apps):

```
Docker control plane (UI, API, Postgres, Redis)
        ↓ secure API
Local runner process (Strands + host tools)
```

Safer than giving the API container unrestricted host access. Two deployment modes:

- **A.** Agent runs inside Docker (easy deployment)
- **B.** Agent runs on host via local runner (host filesystem, shell, SSH)

## Observability (Phase 3)

### Langfuse

Self-hostable trace UI for tokens, costs, latency, generations. jaha-eye UI handles **control**; Langfuse handles **observability**. Do not duplicate Langfuse panels inside the operator console.

### OpenTelemetry

Instrument Strands execution → OTel collector → Grafana / Jaeger / Langfuse. Add without rewriting the application.

## Database tables (future)

Phase 1 core: `Agent`, `AgentRun`, `AgentRunEvent`, `Orchestration`, `Schedule`, `AppSettings`.

Additional tables planned:

| Table | Phase |
|-------|-------|
| `agent_versions` | 2 |
| `agent_approvals` | 2 |
| `agent_tool_executions` | 2 |
| `agent_sessions`, `agent_messages` | 2+ (product memory) |
| `agent_artifacts` | 3 |
| `agent_metrics` | 3 |
| `users`, `roles`, `permissions` | 2+ |

See [docs/src/database.md](../src/database.md) for the current schema.

## UI pages not yet built

| Route | Phase | Purpose |
|-------|-------|---------|
| `/schedules` | 1 | UI-ticked cron schedule management (Phase 2 adds worker/webhook triggers) |
| `/approvals` | 2 | Pending approval queue |
| `/settings` | 1 | Global LLM settings (API key, base URL, default model) |
| Model registry | 2 | Multi-provider model catalog beyond Settings defaults |
| `/tools` | 2 | Global tool catalog and permissions |
| `/agents/:id/versions` | 2 | Version history tab |

Current screens: [docs/ui/screens.md](../ui/screens.md).

## Multi-agent beyond orchestrations

Phase 1 orchestrations use an in-API DAG executor (not Strands Graph/Swarm). Each node is a real `AgentRun` with persisted events.

**Later:**

- Strands-native multi-agent patterns (supervisor, swarm) where they map to our run model
- Agents-as-tools (Slice E)
- Remote agents via A2A

Parent/child run UI (`parentRunId`, run tree, per-node timeline) already supports inspecting graph executions.

## What we are not building

- **Open WebUI replacement** — that is a chat interface; jaha-eye is an operator console. They can coexist.
- **Arbitrary shell from the browser** — always through the control API with authorization.
- **Progress percentages** — show activity text and known step counts only.
