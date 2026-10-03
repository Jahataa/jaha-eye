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

### Runs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/runs` | List runs |
| GET | `/api/runs/:id` | Get run |
| POST | `/api/runs/:id/cancel` | Cancel via AgentRuntime |
| GET | `/api/runs/:id/events` | Persisted event history |
| GET | `/api/runs/:id/stream` | SSE of AG-UI events |

## Run execution

`RunService.startRun()`:

1. Creates DB row (queued → running).
2. Returns runId immediately to client.
3. Executes `StrandsRuntime.stream()` in-process.
4. Persists each event before SSE broadcast.

## Dev

```bash
npm run dev -w @jaha-eye/api
```

Default port: 4000.
