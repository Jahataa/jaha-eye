# UI components

## Layout (`components/layout/`)

| Component | Role |
|-----------|------|
| `AppShell` | Sidebar + main content area |
| `Sidebar` | Nav: Dashboard, Agents, Runs |
| `PageHeader` | Title + optional actions |

## Feature components

| Folder | Components |
|--------|------------|
| `components/dashboard/` | `StatsCards`, `ActiveRunsList` |
| `components/agents/` | `AgentList`, `AgentForm`, `AgentCard` |
| `components/runs/` | `RunList`, `RunDetail`, `RunControls` |
| `components/events/` | `EventTimeline`, `EventRow` |

## UI primitives (`components/ui/`)

shadcn-style: `Button`, `Card`, `Input`, `Label`, `Textarea`, `Badge`, `Checkbox`, `Table`.

Built with Tailwind; no external shadcn CLI dependency in Phase 1.
