---
name: add-strands-tool
description: Register a new built-in Strands tool in AgentFactory, expose it as a checkbox in the agent editor, document in docs/agents/tools.md.
---

# Add Strands tool

## Steps

1. Implement tool in `packages/agent-core/src/tools/` using Strands `tool()` helper.
2. Register in `packages/agent-core/src/tools/registry.ts`.
3. Add tool id to `@jaha-eye/shared` tool catalog schema.
4. Expose checkbox in agent editor (`apps/web` features/agents).
5. Document in `docs/agents/tools.md`.

## Rules

- Tools are only instantiated inside `AgentFactory`, never in API routes or UI.
