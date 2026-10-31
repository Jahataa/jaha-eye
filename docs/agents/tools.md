# Built-in tools

Phase 1 ships seven built-in tools: two custom network/search tools and five from the Strands SDK vended catalog (plus custom utility tools).

## Catalog

| id | name | category | risk | source |
|----|------|----------|------|--------|
| `current_time` | Current Time | utility | safe | custom — returns JSON with `isoUtc`, `local`, and `timezone` |
| `calculator` | Calculator | utility | safe | custom |
| `sleep` | Sleep | utility | safe | `@strands-agents/sdk/vended-tools/sleep` |
| `notebook` | Notebook | planning | safe | `@strands-agents/sdk/vended-tools/notebook` |
| `http_request` | HTTP Request | network | network | guarded fetch (`redirect: manual`) |
| `web_fetch` | Web Fetch | network | network | guarded fetch (`redirect: manual`) |
| `web_search` | Web Search | network | network | custom — SearXNG JSON API (`SEARXNG_URL`) |

Registered in `packages/agent-core/src/tools/registry.ts`. `http_request` and `web_fetch` use `HTTP_ALLOWED_HOSTS`, DNS resolution checks, and reject redirects. `web_search` calls only the configured SearXNG base URL (not subject to `HTTP_ALLOWED_HOSTS`).

Enable via checkbox in the agent editor; stored in `Agent.tools` JSON array.

## Web search (SearXNG)

Self-hosted [SearXNG](https://docs.searxng.org/) runs from [`docker-compose.tools.yml`](../../docker-compose.tools.yml) (port `127.0.0.1:8888`). `npm run local:start` brings it up with Postgres.

Typical research flow:

1. **`web_search`** — find candidate pages (titles, URLs, snippets).
2. **`web_fetch`** — read chosen URLs (requires `HTTP_ALLOWED_HOSTS=all` or an allowlist that includes result hosts).

Configure `SEARXNG_URL` and `SEARXNG_SECRET` in `.env`. JSON search requires `search.formats` to include `json` in [`docker/searxng/settings.yml`](../../docker/searxng/settings.yml).

## Network egress

**Default deny:** when `HTTP_ALLOWED_HOSTS` is unset or empty, `http_request` and `web_fetch` refuse every host.

To allow outbound research, set `all` or a comma-separated hostname allowlist (e.g. `technopolis.bg,www.technopolis.bg`). Hostnames must resolve to public addresses — loopback, private, and link-local DNS answers are rejected even if the hostname is listed.

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
