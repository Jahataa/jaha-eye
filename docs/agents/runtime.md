# Agent runtime

Phase 1 executes agents **in-process** inside the API server.

## Chain

```
AgentFactory.create(definition)
       ↓
Strands Agent + StrandsAgent wrapper
       ↓
StrandsRuntime.stream(runId, input)
       ↓
AG-UI BaseEvent async generator
```

## Cancel

`StrandsRuntime.cancel(runId)` finds the per-thread Strands `Agent` and calls `agent.cancel()`.

## Later

`QueueAgentRunner` implementing the same `AgentRuntime` interface behind BullMQ.
