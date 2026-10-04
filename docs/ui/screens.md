# Screens and routes

| Route | Screen | Purpose |
|-------|--------|---------|
| `/` | Dashboard | Counts (running, completed/failed today), active runs list |
| `/agents` | Agent registry | List agents; Run, Edit, Disable, Delete actions |
| `/agents/new` | New agent | Template picker, create agent form |
| `/agents/:id` | Agent editor | Edit name, description, model provider, prompt, grouped tools, default run input, max concurrent runs; Save, Run |
| `/orchestrations` | Orchestration registry | List saved graphs; Run, Edit, Delete |
| `/orchestrations/new` | New orchestration | Canvas editor with agent palette |
| `/orchestrations/:id` | Orchestration editor | Edit graph, metadata, default run input; Save, Run |
| `/runs` | Run history | Table of top-level runs with status, source (agent or orchestration), duration |
| `/runs/:id` | Run detail | Status, input, output, stop button, execution timeline |
| `/settings` | Settings | Global LLM config: base URL, API key, default model, temperature; Test connection |

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
