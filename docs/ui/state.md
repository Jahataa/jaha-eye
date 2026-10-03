# UI state model

## TanStack Query (server state)

| Data | Query key | Endpoint |
|------|-----------|----------|
| Agents list | `['agents']` | `GET /api/agents` |
| Agent detail | `['agents', id]` | `GET /api/agents/:id` |
| Runs list | `['runs']` | `GET /api/runs` |
| Run detail | `['runs', id]` | `GET /api/runs/:id` |
| Run events (history) | `['runs', id, 'events']` | `GET /api/runs/:id/events` |

Mutations invalidate relevant queries after create/update/delete/run.

## Zustand (UI state)

`apps/web/src/stores/ui-store.ts`:

- Selected agent id (optional)
- Dialog open/close flags

Do not put server data in Zustand.

## SSE (live execution)

`apps/web/src/hooks/use-run-stream.ts`:

- Connects to `GET /api/runs/:id/stream` for non-terminal runs.
- Appends events to local timeline state.
- Merges with persisted history from Query on mount.
