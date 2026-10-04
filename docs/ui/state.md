# UI state model

## TanStack Query (server state)

| Data | Query key | Endpoint |
|------|-----------|----------|
| Agents list | `['agents']` | `GET /api/agents` |
| Agent detail | `['agents', id]` | `GET /api/agents/:id` |
| Orchestrations list | `['orchestrations']` | `GET /api/orchestrations` |
| Orchestration detail | `['orchestrations', id]` | `GET /api/orchestrations/:id` |
| Runs list | `['runs']` | `GET /api/runs` |
| Run detail | `['runs', id]` | `GET /api/runs/:id` (includes optional `children[]` for orchestration parents) |
| Run events (history) | `['runs', id, 'events']` | `GET /api/runs/:id/events` |
| LLM settings | `['settings']` | `GET /api/settings` |

Mutations invalidate relevant queries after create/update/delete/run.

## Zustand (UI state)

`apps/web/src/stores/ui-store.ts`:

- Selected agent id (optional)
- Dialog open/close flags
- `activity` — current run activity sentence for the top bar (`SYS // …`); set by `useRunStream`, cleared on unmount or terminal run

Do not put server data in Zustand.

Orchestration canvas editor keeps graph node/edge selection in local React state on the editor page.

## SSE (live execution)

`apps/web/src/hooks/use-run-stream.ts`:

- Connects to `GET /api/runs/:id/stream` for non-terminal runs.
- Appends events to local timeline state.
- Merges with persisted history from Query on mount.
- Handles orchestration parent events (`NODE_STARTED`, `NODE_FINISHED`, `NODE_ERROR`) for activity text when optional `agentNames` map is provided.
