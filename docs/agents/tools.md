# Built-in tools

Phase 1 ships six built-in tools: one custom and five from the Strands SDK vended catalog.

## Catalog

| id | name | category | risk | source |
|----|------|----------|------|--------|
| `current_time` | Current Time | utility | safe | custom — returns JSON with `isoUtc`, `local`, and `timezone` |
| `calculator` | Calculator | utility | safe | custom |
| `sleep` | Sleep | utility | safe | `@strands-agents/sdk/vended-tools/sleep` |
| `notebook` | Notebook | planning | safe | `@strands-agents/sdk/vended-tools/notebook` |
| `http_request` | HTTP Request | network | network | guarded fetch (`redirect: manual`) |
| `web_fetch` | Web Fetch | network | network | guarded fetch (`redirect: manual`) |

Registered in `packages/agent-core/src/tools/registry.ts`. Network tools use `HTTP_ALLOWED_HOSTS`, DNS resolution checks, and reject redirects.

Enable via checkbox in the agent editor; stored in `Agent.tools` JSON array.

## Network egress

**Default deny:** when `HTTP_ALLOWED_HOSTS` is unset or empty, `http_request` and `web_fetch` refuse every host.

To allow outbound research, set a comma-separated hostname allowlist (e.g. `httpbin.org,example.com`). Hostnames must resolve to public addresses — loopback, private, and link-local DNS answers are rejected even if the hostname is listed.

Redirects (3xx) are not followed.

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
