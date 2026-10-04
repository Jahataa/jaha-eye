# Agent definitions and runs

## Agent (definition)

A row in the `Agent` table: name, model config, system prompt, enabled tools.

- Editing updates the row in place (versioning is **Later**).
- Status `disabled` prevents new runs.
- Cannot delete an agent referenced by any orchestration graph (API returns 409).

## Orchestration (definition)

A row in the `Orchestration` table: a saved DAG of existing agents.

- **Graph JSON**: nodes (`id`, `agentId`, `position`, optional `outputVariable`, optional `inputTemplate`), edges (`source`, `target`). Validated as a DAG on save (no cycles).
- Same agent may appear on multiple nodes. Isolated nodes are entry points and run in parallel.
- **Run** creates a parent `AgentRun` plus one child run per node; the graph is snapshotted on the parent `input` so old runs render correctly if the definition changes.

## Run (execution)

A row in `AgentRun` created when you click Run, run an orchestration, a schedule fires, or you call the run API.

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

`agentId` + `graphNodeId` + `parentRunId` pointing at the parent. Each child is a normal agent run via `executeRun`.

**Entry nodes** (no incoming edges) receive the orchestration run message when it is non-empty. When the orchestration has no default run input, the entry node’s agent `defaultRunInput` is used instead. `"Hello"` is sent only when both are empty.

**Downstream nodes** without an `inputTemplate` receive upstream assistant replies joined with blank lines (same as before). With an `inputTemplate`, the user message is built from the template; `${VarName}` placeholders are replaced from upstream nodes that set `outputVariable`.

**Output variables** — after a node completes, if `outputVariable` is set (e.g. `City`), its assistant reply is stored under that name for downstream templates. Missing template variables fail the node with a clear error.

**System prompt override** — each graph node may set `systemPrompt` to override the linked agent's instructions for that orchestration only. When empty, the agent's saved prompt is used.

**Run inspection** — `GET /api/runs/:id` child summaries include `inputMessage`, `outputReply`, and `outputVariables` so the run-detail node inspector needs no extra fetch per click.

Cancel on the parent cancels all non-terminal children.

## Trigger

| Value | Meaning |
|-------|---------|
| `manual` | Operator clicked Run or called the run API directly |
| `schedule` | Parent run started by a UI-ticked cron schedule (`POST /api/schedules/:id/fire`) |

Orchestration **child** node runs always have `trigger: manual` even when the parent was scheduled.

Schedules are persisted in the `Schedule` table. The browser ticker fires them only while the dashboard is open, using the operator machine's local clock. Missed times while the UI is closed are skipped — there is no server cron loop in Phase 1.

**Later:** worker-ticked cron (fire when UI is closed), webhooks, and other API triggers.

## Run list filtering

`GET /api/runs` returns top-level runs only (`parentRunId = null`). Child runs appear under the parent on run detail (`children[]`) or via the graph UI.
