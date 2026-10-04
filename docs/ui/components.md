# UI components

## Layout (`components/layout/`)

| Component | Role |
|-----------|------|
| `AppShell` | Top bar + sidebar + main content area; sidebar includes Orchestrations nav |
| `HudTopBar` | Local clock, active-run count (top-level only), live activity line (`SYS // …`) |
| Sidebar callsign | `JAHA-EYE // ONLINE` with slow cyan pulse |

## Feature components

| Folder | Components |
|--------|------------|
| `components/dashboard/` | Instrument stat cards, active-run trace list |
| `components/agents/` | Agent list cards |
| `components/orchestrations/` | Orchestration list cards |
| `features/orchestrations/` | Canvas editor (`OrchestrationCanvas`, `OrchestrationNodeInspector`, node palette, side panel), graph node/edge types |
| `components/runs/` | Run table, run detail header, orchestration graph view, parent/child tree |
| `components/events/` | `EventTimeline` with vertical trace, cyan nodes, live scan row; tool results shown inline |

## Orchestration canvas

Built on `@xyflow/react`, styled to match the HUD (not default React Flow chrome):

| Component | Role |
|-----------|------|
| `OrchestrationCanvas` | Editor canvas: drag, connect, select nodes |
| `AgentNode` | Graph node with agent name + slug; hover Edit/Del controls in editor; inline agent swap picker when editing; status border on run detail |
| `GraphNodePalette` | Left panel listing agents to add to the graph |
| `OrchestrationSidePanel` | Name, slug, description, default run input, Save/Run |
| `OrchestrationNodeInspector` | Shared node detail panel: editor mode (system prompt, output variable, input template, preview) and run mode (consumed input, reply, variables) |

## UI primitives (`components/ui/`)

HUD-styled shadcn-style components:

| Component | Style |
|-----------|-------|
| `Card` | Sharp panel, 1px cyan border, corner brackets, inset glow |
| `Button` | Square corners; default/outline cyan brackets; `danger` red fill |
| `Badge` | Uppercase tracked label; `running` gets pulse animation |
| `Input`, `Textarea` | Share Tech Mono, square, cyan focus ring |

Built with Tailwind; no external shadcn CLI dependency in Phase 1.

## Orchestration node controls (editor)

On `/orchestrations/:id` and `/orchestrations/new`:

- **Hover / selected** — each canvas node shows compact `Edit` and `Del` buttons (HUD outline + danger styles).
- **Edit** — opens an inline agent picker under the node (same agent list as the left palette); choosing an agent swaps the node’s agent without changing node id or edges.
- **Delete** — removes the node and any connected edges from local graph state (side panel Delete and keyboard `Delete` on a selected node do the same).
- **Side panel** — orchestration metadata at top; when a node is selected, `OrchestrationNodeInspector` shows agent link, system prompt, output variable, input template, preview, plus Edit/Delete actions mirroring the node HUD.
- Run-detail canvas (`readOnly`) hides all edit controls; nodes only reflect execution status.

## HUD utilities (`index.css`)

- `.hud-kicker` — wide-tracked uppercase micro labels
- `.hud-figure` — tabular display numbers (Share Tech Mono)
- `.hud-mono` — monospace data text
- `.hud-pulse` — breathing glow for running states
- `.hud-scan-row` — vertical scan wash on live timeline rows
- `.hud-callsign-pulse` — slow text glow on sidebar callsign
