# packages/agent-core

Agent runtime abstraction and Strands integration.

## Exports

| Module | Purpose |
|--------|---------|
| `AgentRuntime` | Interface: `run`, `stream`, `cancel`, `getStatus` |
| `StrandsRuntime` | In-process Strands implementation |
| `AgentFactory` | Builds Strands Agent from DB definition |
| `normalizeAgUiEvent` | Maps `BaseEvent` → persisted shape |
| `BUILTIN_TOOLS` | Registry of built-in tools |

## Usage (API only)

```typescript
const factory = new AgentFactory({
  resolveLlmDefaults: () => getEffectiveLlmConfig(), // Settings → env fallback
});
const runtime = new StrandsRuntime(factory);

for await (const event of runtime.stream(agentDef, runId, input)) {
  await persistEvent(event);
  broadcastSse(event);
}

await runtime.cancel(runId);
```

## Rules

- Sole importer of `@strands-agents/sdk` and `@ag-ui/aws-strands`.
- Uses `StrandsAgent` adapter, not `createStrandsApp`.
- `createStrandsAgent` is async; resolves LLM credentials per run via `resolveLlmDefaults`.
- `agentsByThread` map keyed by runId enables cancel via `agent.cancel()`.

See [docs/architecture/events.md](../architecture/events.md).
