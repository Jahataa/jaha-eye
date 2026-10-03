# Screens and routes

| Route | Screen | Purpose |
|-------|--------|---------|
| `/` | Dashboard | Counts (running, completed/failed today), active runs list |
| `/agents` | Agent registry | List agents; Run, Edit, Disable, Delete actions |
| `/agents/new` | New agent | Create agent form |
| `/agents/:id` | Agent editor | Edit name, description, model, prompt, tools; Save, Run |
| `/runs` | Run history | Table of all runs with status, agent, duration |
| `/runs/:id` | Run detail | Status, input, output, stop button, execution timeline |

## Run detail timeline

Shows AG-UI events in order: run lifecycle, model calls, tool calls, text, errors.

- **Activity text** ("Searching…") instead of fake progress percentages.
- **Stop button** calls `POST /api/runs/:id/cancel`.
- **Live updates** via SSE on `/api/runs/:id/stream`.
