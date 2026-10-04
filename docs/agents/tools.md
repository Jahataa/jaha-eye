# Built-in tools

Phase 1 ships six built-in tools: one custom and five from the Strands SDK vended catalog.

## Catalog

| id | name | category | risk | source |
|----|------|----------|------|--------|
| `current_time` | Current Time | utility | safe | custom — returns JSON with `isoUtc`, `local`, and `timezone` |
| `calculator` | Calculator | utility | safe | custom |
| `sleep` | Sleep | utility | safe | `@strands-agents/sdk/vended-tools/sleep` |
| `notebook` | Notebook | planning | safe | `@strands-agents/sdk/vended-tools/notebook` |
| `http_request` | HTTP Request | network | network | `@strands-agents/sdk/vended-tools/http-request` |
| `web_fetch` | Web Fetch | network | network | `@strands-agents/sdk/vended-tools/web-fetch` |

Registered in `packages/agent-core/src/tools/registry.ts`. Network tools pass through a host allowlist guard when `HTTP_ALLOWED_HOSTS` is set.

Enable via checkbox in the agent editor; stored in `Agent.tools` JSON array.

## Network egress

Set `HTTP_ALLOWED_HOSTS` to a comma-separated list of allowed hostnames (e.g. `httpbin.org,example.com`). When unset, all hosts are allowed and a startup warning is logged.

See [environment](../conf/environment.md).

## Explicitly excluded (later)

- `bash`, `file_editor` — require sandbox + approval; not attached to the in-process API
- `handoff_to_user` — requires HITL / run resume UI (Slice C)
- `stop` — optional experimental tool
- `a2a_client` — remote agent fleet (later)

## Adding tools

Use the `add-strands-tool` skill. Tools are only instantiated in `AgentFactory`.

## Later

- MCP tool picker
- Per-tool permissions (allow / deny / approval_required)
