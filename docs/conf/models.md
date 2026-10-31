# Model providers

Phase 1 default: **OpenAI-compatible** via Strands `OpenAIModel`.

## Global defaults (Settings UI or environment)

Operators configure global LLM settings at `/settings` (base URL, default model, temperature in `AppSettings`). The API key is **environment only** (`OPENAI_API_KEY`).

```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=http://localhost:11434/v1   # optional, for Ollama
```

Resolution at run time: Settings row for base URL → `OPENAI_BASE_URL` env → OpenAI SDK default URL. API key: `OPENAI_API_KEY` only.

## Model base URL policy

All model base URLs (Settings, test connection, agent `modelBaseUrl`, and `AgentFactory`) must pass the shared URL policy in `@jaha-eye/shared`:

- `https` to public hosts only
- `http` only for loopback (`localhost`, `127.0.0.1`, `::1`) — e.g. local Ollama
- Rejects `file:`, private/link-local IPs, and metadata hostnames

Agent network tools (`http_request`, `web_fetch`) use a separate `HTTP_ALLOWED_HOSTS` allowlist and do not get the loopback `http` exception.

## Per-agent settings (database)

Each agent row stores:

| Field | Example |
|-------|---------|
| `modelProvider` | `openai` |
| `modelName` | `gpt-4o-mini` |
| `modelBaseUrl` | null (use Settings/env) or custom URL |
| `modelTemperature` | `0.7` |

`AgentFactory` validates `modelBaseUrl` before constructing `OpenAIModel`.

## Local models

Point `OPENAI_BASE_URL` or per-agent `modelBaseUrl` at a loopback OpenAI-compatible server (Ollama). Non-loopback `http` URLs are rejected.

## Later

- Full model registry (multiple providers, per-model metadata)
- Additional providers (Anthropic, Bedrock, Ollama native) via Strands provider modules
