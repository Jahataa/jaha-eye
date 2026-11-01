# Office operator layer (Phase 1)

The Office layer adds a task-centric operator console on top of existing agent runs, orchestrations, and schedules. It does **not** replace `/agents`, `/runs`, or `/schedules`.

## Kill switch

Set `OFFICE_ENABLED=0` to skip hook registration and `/api/office/*` routes. Default: enabled.

## Run hooks

[`apps/api/src/services/run-hooks.ts`](../../apps/api/src/services/run-hooks.ts) provides:

- **Prompt composers** — mutate `AgentDefinition` before `StrandsRuntime.stream` (brief, skills, lessons, brain excerpts, draft/approve rules, safe-tool filter).
- **Run settled listeners** — async side effects after a run finishes (task state, brain note, usage).

When no office hooks are registered, composers are no-ops and behavior matches pre-Office jaha-eye.

## Task lifecycle

Office tasks (`office_tasks`) link to one or more `agent_runs` via `office_task_runs` with mode (`normal`, `draft`, `approve`, `revise`, `team`).

| Task status | Meaning |
|-------------|---------|
| `routing` | Reserved for async router (currently brief) |
| `scheduled` | Waiting for UI tick to promote |
| `running` | Linked run in progress |
| `waiting` | Draft completed; needs operator approve |
| `done` | Deliverable stored on task + optional brain note |
| `error` / `cancelled` | Run failed or operator rejected |

Router uses `@jaha-eye/agent-core` `completeJson` (OpenAI-compatible HTTP, no Strands).

## Approvals

**Draft mode is clock-only** (routine fires and scheduled tasks promoted by the UI tick). Manual bar and desk tasks always run in **normal** mode and write a brain note on success even when the router sets `needsOk`.

When a clock-fired run uses **draft mode**, the composer restricts tools to `safe` risk only and instructs no outbound actions. On completion, task → `waiting` with `draft` text. `POST /api/office/tasks/:id/approve` re-runs in approve mode; the deliverable note includes the draft plus an **AFTER YOUR OK** section. Reject re-runs as a revision of the draft (not cancel).

## Teams

Team tasks build a **hidden** orchestration DAG and call existing `startOrchestrationRun`. Parent run id is stored on the task as `teamParentRunId`.

## Routines

`routines` table + `OfficeRoutineTicker` (UI-ticked, same Phase 1 constraint as `/schedules`). Fires `POST /api/office/routines/:id/fire` with local minute slot claim.

## Brain

Deliverables write `brain_notes` rows (optional export via `BRAIN_EXPORT_DIR`). `GET /api/office/brain` returns notes + link graph for the Office brain tab (separate from Graphify code graph).

## Usage

`run_usage` records estimated tokens per run (chars/4 fallback). `GET /api/office/usage` aggregates rolling 5h / 24h windows.

## Config

| Variable | Purpose |
|----------|---------|
| `OFFICE_ENABLED` | `0` disables office routes/hooks |
| `OFFICE_ROUTER_MODEL` | Router/classifier model |
| `OFFICE_TEAM_MAX` | Max parallel team pieces (default 4) |
| `BRAIN_EXPORT_DIR` | Optional markdown export directory |

See [docs/conf/office.md](../conf/office.md).
