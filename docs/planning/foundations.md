# Architectural foundations

These decisions shaped jaha-eye before and during Phase 1. They remain the guiding constraints.

## What we are building

An **operator console for many agents** — not a chat app. Operators define agents, start runs, inspect execution timelines, and stop runs. The UI revolves around **runs**, not chat sessions.

```
Agent (definition)          Run (execution)
├── model, prompt, tools    ├── input, output, errors
├── enabled/disabled        ├── persisted AG-UI events
└── orchestration nodes     └── parent/child graph (orchestrations)
```

## Strands as the runtime

The Strands TypeScript SDK (Node 22+) provides the agent loop, tools, streaming, cancellation, hooks, and multi-agent events. We build the control plane **around** Strands events and hooks — we do not invent a separate instrumentation layer.

The API never calls `new Agent()` directly. Everything goes through `AgentFactory` → `StrandsRuntime`.

## AG-UI as the UI protocol

AG-UI is the event-based protocol between agent backends and user-facing applications. It standardizes lifecycle, text streaming, tool calls, activity, and subagent events.

```
Strands event → normalizer → persist → AG-UI SSE → React timeline
```

The frontend never imports Strands types. This boundary lets the control plane eventually manage other runtimes without redesigning the UI.

### Why not a custom WebSocket protocol?

AG-UI already defines the event vocabulary (`RUN_STARTED`, `TOOL_CALL_*`, `TEXT_MESSAGE_*`, etc.). Inventing a proprietary protocol would duplicate that work and lock the UI to one backend shape.

### Why not `createStrandsApp`?

We run **many agents** behind one Fastify API with our own persistence and SSE. `StrandsAgent` + manual SSE gives us control over event ordering, DB writes, and orchestration parent events.

## CopilotKit

CopilotKit is a strong React layer on AG-UI (streaming, shared state, HITL patterns). We do **not** make it the entire application — jaha-eye owns the registry, run history, orchestration editor, and permissions. CopilotKit components may be adopted selectively later.

## Control plane vs data plane

| Control plane (Phase 1) | Data plane (Phase 1) |
|-------------------------|----------------------|
| React UI | Strands SDK in-process |
| Fastify API | Model providers |
| PostgreSQL | Built-in tools |
| Agent + orchestration definitions | Child runs via DAG executor |

**Later:** data plane moves to separate workers behind BullMQ/Redis.

## Security boundary

The browser never talks to agent workers directly.

```
Browser → Control API → authorization → AgentRuntime → Strands
```

Not: `Browser → arbitrary agent process`. Dangerous tools (filesystem, shell, SSH) require a separate local runner with explicit permissions — see [future.md](future.md).

## Observability split

| jaha-eye UI (control) | Langfuse / OTel (**Later**) |
|-----------------------|-----------------------------|
| Agents, runs, start/stop | Token usage, costs, latency |
| Configure, approve, retry | Traces, prompts, evaluations |

Do not duplicate Langfuse inside the operator console.

## Protocol-based ecosystem

Rather than inventing proprietary layers, align with existing protocols:

| Protocol | Role |
|----------|------|
| **AG-UI** | Agent ↔ user/UI |
| **MCP** | Agent ↔ tools/data (**Later** tool picker) |
| **A2A** | Agent ↔ agent (**Later** remote agents) |

## Anti-patterns to avoid

- Hard-coding every agent inside the Next.js/API layer
- Custom WebSocket event schemas when AG-UI exists
- `React → execute arbitrary shell command`
- Fake progress percentages — show **activity text** instead (`ACTIVITY_SNAPSHOT`, current step label)
- Storing live events only in memory — persist before SSE

## Technology stack (implemented)

| Layer | Choice |
|-------|--------|
| Frontend | React + TypeScript + Vite |
| UI | Tailwind + HUD-styled components |
| Client state | Zustand (UI only) |
| Server state | TanStack Query |
| Agent UI protocol | AG-UI over SSE |
| Backend | Node 22 + Fastify + Zod |
| Agent runtime | Strands TypeScript SDK + `@ag-ui/aws-strands` |
| Database | PostgreSQL + Prisma |
| Monorepo | npm workspaces + Turborepo |

**Later additions:** Redis, BullMQ, worker process, OpenTelemetry, Langfuse, MCP tool picker.

## References

- [Strands TypeScript SDK](https://strandsagents.com)
- [AG-UI Protocol](https://github.com/ag-ui-protocol/ag-ui)
- [@ag-ui/aws-strands](https://www.npmjs.com/package/@ag-ui/aws-strands)
