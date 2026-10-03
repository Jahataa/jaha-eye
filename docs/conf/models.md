# Model providers

Phase 1 default: **OpenAI-compatible** via Strands `OpenAIModel`.

## Global defaults (environment)

```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=http://localhost:11434/v1   # optional, for Ollama
```

## Per-agent settings (database)

Each agent row stores:

| Field | Example |
|-------|---------|
| `modelProvider` | `openai` |
| `modelName` | `gpt-4o-mini` |
| `modelBaseUrl` | null (use env) or custom URL |
| `modelTemperature` | `0.7` |

`AgentFactory` passes these to `OpenAIModel` with `clientConfig.baseURL` when set.

## Local models

Point `OPENAI_BASE_URL` or per-agent `modelBaseUrl` at any OpenAI-compatible server. No frontend changes required.

## Later

Additional providers (Anthropic, Bedrock, Ollama native) via Strands provider modules.
