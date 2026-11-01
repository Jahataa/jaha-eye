# Screens and routes

| Route | Screen | Purpose |
|-------|--------|---------|
| `/` | Dashboard | Counts (running, completed/failed today), active runs list |
| `/office` | Office | Task bar + board, approvals, usage gauge, floor/brain/calendar tabs, isometric desks |
| `/office/skills` | Office skills | CRUD for operator skills bound to agents or departments |
| `/agents` | Agent registry | List agents; Run, Edit, Disable, Delete actions |
| `/agents/new` | New agent | Template picker, create agent form |
| `/agents/:id` | Agent editor | Edit name, description, department (Office pod), model provider, prompt, grouped tools, default run input, max concurrent runs; schedules section; Save, Run |
| `/orchestrations` | Orchestration registry | List saved graphs; Run, Edit, Delete |
| `/orchestrations/new` | New orchestration | Canvas editor with agent palette |
| `/orchestrations/:id` | Orchestration editor | Edit graph, metadata, default run input; schedules section; Save, Run |
| `/schedules` | Schedules | List cron jobs (agent or orchestration target); create/edit, enable/disable, delete; next-fire preview in local time |
| `/runs` | Run history | Table of top-level runs with status, source (agent or orchestration), trigger (`manual` / `schedule`), duration |
| `/runs/:id` | Run detail | Status, input, output, stop button, execution timeline |
| `/settings` | Settings | Global LLM config: base URL, API key, default model, temperature, optional Office usage budget; Test connection |
| `/graphify` | Knowledge graph | Graphify status: stats, pipeline + Postgres ER diagrams, rebuild/update actions, activity log |
| `/docs`, `/docs/*` | Documentation | In-app viewer for repo `docs/` — section sidebar, search (`⌘K` / `Ctrl+K`), on-page TOC, prev/next |

## Office

- **Task bar** — `POST /api/office/tasks` with department, text, optional team mode; LLM router picks agent and plan.
- **Task board** — columns by task status; approve/reject/revise for draft flows; links to underlying runs.
- **Scene** — lazy-loaded Three.js isometric view (`OfficeScene` chunk); high-contrast desks, department pods (35% rug + wireframe edge), **corridors** between pods; in-scene name labels (hidden when zoomed out); department **lead** ring on desk; desk color from runs plus amber **waiting** when a task needs approval.
- **Desk panel** — tabs: Run, Tasks, Lessons, Brief; start runs, open SSE timeline, edit agent.
- **Brain tab** — dark-themed React Flow graph from `GET /api/office/brain` (operator notes, not Graphify code graph); empty and error states with retry / back to floor.
- **Calendar tab** — read-only week view: routine cron, scheduled office tasks, existing `/schedules` (UI-ticked Phase 1).
- **Tickers** — `OfficeRoutineTicker` + existing `ScheduleTicker` while the dashboard is open.
- **Polling** — runs ~3s/15s; office tasks ~5s; usage ~30s.
- **WebGL fallback** — desk list remains usable when WebGL is unavailable.

See [architecture/office.md](../architecture/office.md) and [conf/office.md](../conf/office.md).

## Orchestration editor

- **Left palette** — active agents from `GET /api/agents`; click or drag onto canvas to add nodes.
- **Canvas** — connect source → target edges; drag nodes to position; select and remove nodes.
- **Right panel** — name, slug, description, default run input; Save / Run (same pattern as agent editor).
- **Node inspector** — when a canvas node is selected, the panel shows agent link, read-only system prompt, editable output variable and input template, upstream variable hints, and an effective message preview.
- Graph JSON (nodes, edges, positions, per-node `outputVariable` / `inputTemplate`) is saved with the orchestration definition.

## Run detail (orchestration parent)

When `orchestrationId` is set on the run:

- **Live canvas** — read-only graph from the run input snapshot; node border reflects child run status.
- **Run tree** — parent row plus one row per graph node; click to select.
- **Node inspector** — Summary tab shows consumed input, assistant reply, and variables set; Events tab shows the selected child’s `EventTimeline` with SSE. Parent timeline remains below the graph area.
- **Stop** — cancels the whole graph via `POST /api/runs/:id/cancel`.

Single-agent runs keep the original layout (no canvas).

## Run detail timeline

Shows AG-UI events in order: run lifecycle, model calls, tool calls, text, errors.

- **Activity text** ("Searching…", "Researcher running…") instead of fake progress percentages.
- **Stop button** calls `POST /api/runs/:id/cancel`.
- **Live updates** via SSE on `/api/runs/:id/stream`.
