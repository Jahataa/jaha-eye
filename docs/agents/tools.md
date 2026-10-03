# Built-in tools

Phase 1 ships one built-in tool for demonstration.

## current_time

| Field | Value |
|-------|-------|
| id | `current_time` |
| name | Current Time |
| description | Returns the current date and time in ISO format |

Registered in `packages/agent-core/src/tools/current-time.ts`.

Enable via checkbox in the agent editor; stored in `Agent.tools` JSON array.

## Adding tools

Use the `add-strands-tool` skill. Tools are only instantiated in `AgentFactory`.

## Later

- MCP tool picker
- Filesystem, shell, web search tools
- Permission model (allow / deny / approval_required)
