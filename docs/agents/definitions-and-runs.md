# Agent definitions and runs

## Agent (definition)

A row in the `Agent` table: name, model config, system prompt, enabled tools.

- Editing updates the row in place (versioning is **Later**).
- Status `disabled` prevents new runs.

## Run (execution)

A row in `AgentRun` created when you click Run or call `POST /api/agents/:id/run`.

| Status | Meaning |
|--------|---------|
| `queued` | Created, not yet started |
| `running` | Strands executing |
| `waiting` | Waiting for input (future) |
| `completed` | Finished successfully |
| `failed` | Error |
| `cancelled` | User stopped |

## Trigger

Phase 1: `manual` only. Schedules and API triggers are **Later**.

## Parent runs

`parentRunId` is nullable for future multi-agent orchestration. Unused in Phase 1 UI.
