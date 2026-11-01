# Office configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OFFICE_ENABLED` | enabled | Set to `0`, `false`, or `off` to disable `/api/office/*` and run hooks |
| `OFFICE_ROUTER_MODEL` | `gpt-4o-mini` | Model for task router and feedback classifier |
| `OFFICE_TEAM_MAX` | `4` | Maximum parallel pieces in team mode (cap 8) |
| `BRAIN_EXPORT_DIR` | unset | When set, deliverable markdown files are written here |

Office routines and scheduled tasks follow the same **UI-ticked** Phase 1 rule as `/schedules`: they fire only while the dashboard is open.
