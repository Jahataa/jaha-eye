# Role presets

Role presets are **UI templates**, not a separate runtime type. Selecting a preset fills the agent editor with a suggested name, slug, system prompt, tool pack, and default run input. Saving writes a normal `Agent` row.

Presets are defined in `packages/shared/src/role-presets.ts` and exposed via `GET /api/role-presets`.

## Starter catalog

| id | name | tools |
|----|------|-------|
| `general` | General assistant | current_time, calculator, notebook |
| `researcher` | Web researcher | web_fetch, http_request, notebook, current_time |
| `api_operator` | API operator | http_request, notebook |
| `planner` | Planner | notebook, current_time |

## Seeding demo agents

Run the database seed to upsert preset agents by slug:

```bash
npm run db:migrate
npm run db:seed -w @jaha-eye/database
```

Slugs: `general-assistant`, `web-researcher`, `api-operator`, `planner`.

## Later

- Orchestrator preset (requires agents-as-tools, Slice E)
- Custom operator-defined presets stored in the database
