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
| Schedules list | `['schedules']` | `GET /api/schedules` |
| Schedule detail | `['schedules', id]` | `GET /api/schedules/:id` |
| LLM settings | `['settings']` | `GET /api/settings` |

Mutations invalidate relevant queries after create/update/delete/run.

## Zustand (UI state)

`apps/web/src/stores/ui-store.ts`:

- Selected agent id (optional)
- `activity` — current run activity sentence for the top bar (`SYS // …`); set by `useRunStream`, cleared on unmount or terminal run
- `docsDrawer` — `{ slug, anchor? }` when the contextual docs slide-over is open; `openDocDrawer` / `closeDocDrawer`
- `docsSearchOpen` — command-palette doc search (also toggled from the top bar and `⌘K` / `Ctrl+K`)

Do not put server data in Zustand.

`apps/web/src/stores/office-store.ts`:

- `selectedAgentId` — desk selected on `/office`
- `webglAvailable` — set from the Three.js canvas; when false, the page shows the desk list fallback

On `/office`, the runs list uses adaptive polling (3s vs 15s) based on active run statuses.

Orchestration canvas editor keeps graph node/edge selection in local React state on the editor page.

## SSE (live execution)

`apps/web/src/hooks/use-run-stream.ts`:

- Connects to `GET /api/runs/:id/stream` for non-terminal runs.
- Appends events to local timeline state.
- Merges with persisted history from Query on mount.
- Handles orchestration parent events (`NODE_STARTED`, `NODE_FINISHED`, `NODE_ERROR`) for activity text when optional `agentNames` map is provided.
