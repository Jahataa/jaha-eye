# apps/api

Fastify control API with Zod validation.

## Authentication

All `/api/*` routes require `Authorization: Bearer <API_TOKEN>`. `GET /health` is public. The API binds to `127.0.0.1` by default. Unexpected server errors return `{ error: "Internal server error" }` without stack traces.

In dev, the Vite proxy injects the bearer token for browser `fetch` and SSE.

## Routes

### Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Effective LLM config (`hasApiKey`, `apiKeySource` from env only) |
| PATCH | `/api/settings` | Upsert base URL, default model, temperature (no API key) |
| POST | `/api/settings/test` | Probe `{baseUrl}/models` with env key; generic errors on failure |

Base URL resolution at run time: Settings row → `.env` fallback. API key: `OPENAI_API_KEY` only.

### Agents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Create agent (omitted `modelName` / `modelTemperature` filled from Settings) |
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

### Schedules

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/schedules` | List schedules |
| POST | `/api/schedules` | Create schedule (cron expression validated) |
| GET | `/api/schedules/:id` | Get schedule |
| PATCH | `/api/schedules/:id` | Update schedule |
| DELETE | `/api/schedules/:id` | Delete schedule |
| POST | `/api/schedules/:id/enable` | Set enabled |
| POST | `/api/schedules/:id/disable` | Set disabled |
| POST | `/api/schedules/:id/fire` | Claim slot and start run → `{ runId }` (202) |

Fire body: `{ slot: "YYYY-MM-DDTHH:mm" }` (local wall-clock minute). Returns **409** `{ skipped: true }` when that slot was already claimed (multi-tab safe). Rejects fire when the schedule or its agent/orchestration target is disabled. Uses schedule `input` when set; otherwise the entity `defaultRunInput` helpers. Parent runs get `trigger: schedule`; orchestration child node runs stay `manual`.

There is no server cron loop — the UI ticker calls `fire` while the console is open.

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

## Office (`OFFICE_ENABLED`, default on)

Mounted under `/api/office/*` when enabled. Uses `run-hooks` prompt composers and run-settled listeners; LLM router/classifier via `@jaha-eye/agent-core` `completeJson` (not Strands).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/office/tasks` | List office tasks |
| POST | `/api/office/tasks` | Router + create task (body: `department`, `text`, optional `team`, `agentId` pin, `at` schedule; rejects `at` &gt;60s in the past; rate limited) |
| GET | `/api/office/tasks/:id` | Task detail |
| POST | `/api/office/tasks/:id/approve` | Approve draft → full-tools run |
| POST | `/api/office/tasks/:id/reject` | Reject waiting draft → revise run + classify feedback |
| POST | `/api/office/tasks/:id/revise` | Revise with feedback + lesson classifier |
| GET/POST/PATCH/DELETE | `/api/office/skills` | Skill CRUD |
| GET/POST/PATCH | `/api/office/routines` | Routine CRUD |
| POST | `/api/office/routines/:id/fire` | UI-ticked fire (`{ slot }` local minute) |
| POST | `/api/office/tick` | Promote due scheduled tasks, late flag |
| GET | `/api/office/lessons` | Standing/one-off lessons |
| DELETE | `/api/office/lessons/:id` | Delete lesson |
| GET | `/api/office/brain` | Notes + link graph |
| GET | `/api/office/usage` | Rolling token usage + budget |

List orchestrations hides `hidden: true` rows (ephemeral team graphs).

## Run execution

`RunService.startRun()` (single agent):

1. Refuses when active (`queued` + `running`) runs for the agent ≥ `maxConcurrentRuns`.
2. Creates DB row (queued → running).
3. Returns runId immediately to client.
4. Executes `StrandsRuntime.stream()` in-process.
5. Persists each event before SSE broadcast.

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
