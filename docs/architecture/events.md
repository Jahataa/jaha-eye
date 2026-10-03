# Event pipeline

Strands execution produces AG-UI events via the `@ag-ui/aws-strands` `StrandsAgent` adapter.

## Flow

```
Strands Agent.stream()
       ↓
StrandsAgent.run(RunAgentInput)  →  AsyncGenerator<BaseEvent>
       ↓
Event normalizer (agent-core)    →  PersistedAgentEvent
       ↓
API persists AgentRunEvent       →  PostgreSQL
       ↓
API SSE stream                   →  React timeline
```

## Persistence rule

**Every event is written to `AgentRunEvent` before it is sent on SSE.**

This allows page refresh to rebuild the timeline from DB history plus live tail.

## AG-UI event types (examples)

| Type | Meaning |
|------|---------|
| `RUN_STARTED` | Run began |
| `RUN_FINISHED` | Run completed successfully |
| `RUN_ERROR` | Run failed |
| `TEXT_MESSAGE_START/CONTENT/END` | Model text streaming |
| `TOOL_CALL_START/ARGS/END/RESULT` | Tool invocation |
| `ACTIVITY_SNAPSHOT` | Current activity label |

The normalizer in `packages/agent-core/src/events/normalizer.ts` maps `BaseEvent` to the stored shape: `{ type, sequence, timestamp, payload }`.

## SSE endpoint

`GET /api/runs/:id/stream`

1. Replay persisted events (if any not yet sent).
2. Subscribe to live events for in-flight runs.
3. Close when run reaches terminal status.
