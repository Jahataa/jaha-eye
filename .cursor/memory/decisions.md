# Decision log

Short record of architectural decisions. Append new entries at the top.

## 2026-10-04 — Orchestration per-node variables and input templates

| Decision | Why |
|----------|-----|
| `outputVariable` + `inputTemplate` on graph nodes | Downstream agents receive templated user messages (e.g. `What time in ${City}?`) instead of raw upstream reply passthrough only |
| Shared `buildNodeMessage` / `resolveInputTemplate` in `@jaha-eye/shared` | Same message rules for API executor and UI preview; fail node on missing `${Var}` at runtime |
| Child summaries enriched on `GET /api/runs/:id` | Run-detail node inspector shows consumed input and reply without per-node fetches |
| System prompt stays agent-level only | Inspector reads linked agent; no per-node prompt override in Phase 1 |

## 2026-10-04 — Global LLM Settings in Postgres

| Decision | Why |
|----------|-----|
| `AppSettings` singleton row for LLM config | Operators configure API key, base URL, and defaults in the UI without editing `.env` |
| Settings → env fallback | Existing Ollama setups keep working until Settings is saved |
| `resolveLlmDefaults` per run in `AgentFactory` | Next run picks up Settings changes without API restart |
| GET never returns raw API key | Password field + `hasApiKey` / `apiKeySource` only |
| New agents copy Settings defaults at create time | Per-agent model fields remain the source of truth for runs |

## 2026-10-04 — Orchestration graphs: own DAG executor, not Strands Graph

| Decision | Why |
|----------|-----|
| First-class `Orchestration` model + in-API DAG executor | Each graph node is a real `AgentRun` with persisted events and SSE; Strands Graph/Swarm do not create our rows or honor persist-before-stream |
| Parent run + child runs via `parentRunId` | Operators inspect the live tree and per-node timelines; cancel parent stops all children |
| Graph snapshot on parent `input` | Old runs render correctly if the definition changes later |
| Topological waves with fail-fast | Simple parallel fan-out/fan-in; first node failure cancels remaining queued children |
| `composeNodeInput` v2 (upstream reply only) | Downstream nodes receive prior assistant text only; entry nodes fall back to agent `defaultRunInput` when orchestration input is empty |

## 2026-10-03 — Root `.env` for Prisma CLI

| Decision | Why |
|----------|-----|
| `dotenv-cli` on root `db:*` scripts | Prisma runs in `packages/database/`; loading repo-root `.env` avoids a manual copy step |

## 2026-10-03 — Phase 1 foundation

| Decision | Why |
|----------|-----|
| Strands + AG-UI via `StrandsAgent`, not `createStrandsApp` | Many agents behind one Fastify API; we own SSE and persistence |
| In-process runner (no worker/queue) | MVP speed; `AgentRuntime` interface allows swap later |
| Postgres-only Compose | Phase 1 needs no Redis |
| OpenAI-compatible default provider | Works with cloud OpenAI and local servers via `OPENAI_BASE_URL` |
| Persist events before SSE | Refresh rebuilds timeline from DB + live tail |
| `@jaha-eye/*` package scope | Consistent monorepo naming |
| Pin `@ag-ui/*` to `0.0.59` | `@ag-ui/aws-strands@0.3.0` requires `InterruptSchema` removed in `@ag-ui/core@1.x` |
| Strands peer deps explicit in agent-core | SDK optional peers (`openai`, `@opentelemetry/api`, MCP) are imported at load time |
| `.npmrc` legacy-peer-deps | Resolves zod 3/4 conflict between openai and Strands |

## 2026-10-03 — Phase 1 verification

Verified locally (Postgres via Compose, API on :4000):

- Agent CRUD and built-in `current_time` tool catalog
- Run start returns `{ runId }` immediately; events persist before SSE
- SSE stream replays persisted history on terminal runs
- Run reload via `GET /events` rebuilds timeline
- Model call fails with placeholder `OPENAI_API_KEY` (expected); Strands + AG-UI pipeline otherwise works
