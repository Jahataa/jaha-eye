# Agent definitions and runs

## Agent (definition)

A row in the `Agent` table: name, model config, system prompt, enabled tools.

- Editing updates the row in place (versioning is **Later**).
- Status `disabled` prevents new runs.
- Cannot delete an agent referenced by any orchestration graph (API returns 409).

## Orchestration (definition)

A row in the `Orchestration` table: a saved DAG of existing agents.

- **Graph JSON**: nodes (`id`, `agentId`, `position`), edges (`source`, `target`). Validated as a DAG on save (no cycles).
- Same agent may appear on multiple nodes. Isolated nodes are entry points and run in parallel.
- **Run** creates a parent `AgentRun` plus one child run per node; the graph is snapshotted on the parent `input` so old runs render correctly if the definition changes.

## Run (execution)

A row in `AgentRun` created when you click Run, run an orchestration, or call the run API.

| Status | Meaning |
|--------|---------|
| `queued` | Created, not yet started |
| `running` | Strands executing (or DAG executor scheduling nodes) |
| `waiting` | Waiting for input (future) |
| `completed` | Finished successfully |
| `failed` | Error |
| `cancelled` | User stopped |

### Single-agent run

`agentId` set, `orchestrationId` and `parentRunId` null. One Strands execution, normal AG-UI event stream.

### Orchestration parent run

`orchestrationId` set, `agentId` null, `parentRunId` null. The in-API DAG executor schedules child runs in topological waves. Parent emits `RUN_STARTED`, `NODE_*`, `RUN_FINISHED` / `RUN_ERROR`. Parent `output` aggregates sink-node replies (nodes with no outgoing edges).

### Orchestration child run

`agentId` + `graphNodeId` + `parentRunId` pointing at the parent. Each child is a normal agent run via `executeRun`. Entry nodes receive the orchestration message; downstream nodes receive composed input from upstream assistant replies.

Cancel on the parent cancels all non-terminal children.

## Trigger

Phase 1: `manual` only. Schedules and API triggers are **Later**.

## Run list filtering

`GET /api/runs` returns top-level runs only (`parentRunId = null`). Child runs appear under the parent on run detail (`children[]`) or via the graph UI.
