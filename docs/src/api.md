# apps/api

Fastify control API with Zod validation.

## Routes

### Agents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Create agent |
| GET | `/api/agents/:id` | Get agent |
| PATCH | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete agent |
| POST | `/api/agents/:id/enable` | Set status active |
| POST | `/api/agents/:id/disable` | Set status disabled |
| POST | `/api/agents/:id/run` | Start run → `{ runId }` |

### Orchestrations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orchestrations` | List orchestrations |
| POST | `/api/orchestrations` | Create orchestration (graph validated as DAG) |
| GET | `/api/orchestrations/:id` | Get orchestration |
| PATCH | `/api/orchestrations/:id` | Update orchestration |
| DELETE | `/api/orchestrations/:id` | Delete orchestration |
| POST | `/api/orchestrations/:id/enable` | Set status active |
| POST | `/api/orchestrations/:id/disable` | Set status disabled |
| POST | `/api/orchestrations/:id/run` | Start parent run → `{ runId }` (202) |

Deleting an agent returns **409** if any orchestration graph references that agent.

### Runs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/runs` | List top-level runs only (`parentRunId = null`) |
| GET | `/api/runs/:id` | Get run; includes `children[]` when parent |
| POST | `/api/runs/:id/cancel` | Cancel via AgentRuntime; parent cancel stops children |
| GET | `/api/runs/:id/events` | Persisted event history |
| GET | `/api/runs/:id/stream` | SSE of AG-UI events |

Orchestration parent runs emit `RUN_STARTED`, `NODE_STARTED`, `NODE_FINISHED`, `NODE_ERROR`, and `RUN_FINISHED` / `RUN_ERROR`. Child runs use the normal agent event stream.

Running an orchestration returns **409** if any node agent is missing or disabled.

## Run execution

`RunService.startRun()` (single agent):

1. Creates DB row (queued → running).
2. Returns runId immediately to client.
3. Executes `StrandsRuntime.stream()` in-process.
4. Persists each event before SSE broadcast.

`OrchestrationService.startOrchestrationRun()` (graph):

1. Creates a parent `AgentRun` with graph snapshot in `input`.
2. Returns parent `runId` immediately (202).
3. Executes nodes in topological waves; each node is a child run via `executeRun`.
4. Persists parent node lifecycle events before SSE broadcast.
5. Fail-fast on first node failure; cancel parent cancels all non-terminal children.

## Dev

```bash
npm run dev -w @jaha-eye/api
```

Default port: 4000.
