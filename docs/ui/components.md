# UI components

## Layout (`components/layout/`)

| Component | Role |
|-----------|------|
| `AppShell` | Top bar + sidebar + main content area |
| `HudTopBar` | Local clock, active-run count, live activity line (`SYS // …`) |
| Sidebar callsign | `JAHA-EYE // ONLINE` with slow cyan pulse |

## Feature components

| Folder | Components |
|--------|------------|
| `components/dashboard/` | Instrument stat cards, active-run trace list |
| `components/agents/` | Agent list cards |
| `components/runs/` | Run table, run detail header |
| `components/events/` | `EventTimeline` with vertical trace, cyan nodes, live scan row |

## UI primitives (`components/ui/`)

HUD-styled shadcn-style components:

| Component | Style |
|-----------|-------|
| `Card` | Sharp panel, 1px cyan border, corner brackets, inset glow |
| `Button` | Square corners; default/outline cyan brackets; `danger` red fill |
| `Badge` | Uppercase tracked label; `running` gets pulse animation |
| `Input`, `Textarea` | Share Tech Mono, square, cyan focus ring |

Built with Tailwind; no external shadcn CLI dependency in Phase 1.

## HUD utilities (`index.css`)

- `.hud-kicker` — wide-tracked uppercase micro labels
- `.hud-figure` — tabular display numbers (Share Tech Mono)
- `.hud-mono` — monospace data text
- `.hud-pulse` — breathing glow for running states
- `.hud-scan-row` — vertical scan wash on live timeline rows
- `.hud-callsign-pulse` — slow text glow on sidebar callsign
