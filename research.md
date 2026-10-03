The key architectural decision is:
Strands is the agent runtime. Your application is the control plane. AG-UI is the live agent↔React communication protocol. PostgreSQL is the source of truth. Docker Compose packages the whole system.

That gives you a system where you can eventually manage any number of agents, see exactly what they are doing, start/stop them, inspect tools, runs, errors, logs, schedules, and eventually approve actions.
1. What I think you are actually building
You are describing something closer to:
                    ┌──────────────────────────────┐
                    │        AGENT CONTROL UI      │
                    │                              │
                    │ React / TypeScript           │
                    │                              │
                    │ Dashboard                    │
                    │ Agents                       │
                    │ Runs                         │
                    │ Tasks                        │
                    │ Tools                        │
                    │ Logs                         │
                    │ Settings                     │
                    └──────────────┬───────────────┘
                                   │
                            AG-UI / SSE
                                   │
                    ┌──────────────▼───────────────┐
                    │        CONTROL API            │
                    │                              │
                    │ Node.js / TypeScript         │
                    │                              │
                    │ Agent Registry               │
                    │ Run Manager                  │
                    │ Event Bus                    │
                    │ Scheduler                    │
                    │ Permissions                  │
                    └───────┬──────────┬───────────┘
                            │          │
                     PostgreSQL       Redis
                            │          │
                            │     Queue / Events
                            │          │
                ┌───────────▼──────────▼───────────┐
                │          AGENT WORKERS            │
                │                                  │
                │   Strands TypeScript SDK         │
                │                                  │
                │   Agent A                        │
                │   Agent B                        │
                │   Agent C                        │
                │   Agent D                        │
                └──────────────┬───────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │       MODELS        │
                    │                     │
                    │ OpenAI              │
                    │ Anthropic           │
                    │ Bedrock             │
                    │ Ollama/local        │
                    │ OpenAI-compatible   │
                    └─────────────────────┘

This is substantially more flexible than building a UI that directly launches arbitrary Node processes.
2. The most important discovery: Strands is already a very good foundation
Your choice of Strands makes sense.
The current TypeScript SDK requires Node.js 22+ and provides the agent loop, tools, streaming, structured output, model providers, cancellation, hooks and multi-agent capabilities. strandsagents.com
The old TypeScript SDK repository has been archived and moved into the strands-agents/harness-sdk monorepo, so your implementation should use the current package/documentation rather than the archived repository. GitHub
And this is particularly important:
Strands already exposes the events you need to build an agent dashboard.
It streams:
- lifecycle events
- model events
- tool events
- multi-agent events
- text output
- errors
- execution state
and its agent.stream() API returns an async generator of these events. strandsagents.com
Even better, Strands has lifecycle hooks specifically intended for:
- monitoring
- metrics
- logging
- validation
- tool execution monitoring
- multi-agent execution
- debugging strandsagents.com
So you should not invent your own agent instrumentation system.
Build your control plane around Strands' existing events/hooks.
3. AG-UI is the missing piece
This is probably the most important result of the research.
I would use AG-UI between your Node/Strands backend and React frontend.
AG-UI is explicitly designed as an event-based protocol between agent backends and user-facing applications. It supports lifecycle events, streaming text, tool calls, state synchronization, activity progress, subagents and human interaction. GitHub
Its event model includes things such as:
RUN_STARTED
RUN_FINISHED

TEXT_MESSAGE_START
TEXT_MESSAGE_CONTENT
TEXT_MESSAGE_END

TOOL_CALL_START
TOOL_CALL_ARGS
TOOL_CALL_END
TOOL_CALL_RESULT

STATE_SNAPSHOT
STATE_DELTA

ACTIVITY_SNAPSHOT
ACTIVITY_DELTA

SUBAGENT events
CUSTOM events
``` :chatgpt-content-reference{index="5"}


That's almost exactly the data model an Agent Control UI needs.

---

# 4. Why I would NOT build your own WebSocket event protocol

You could do:

```text
React
   ↓ WebSocket
Node API
   ↓
Strands

and invent:
{
  "type": "tool_started",
  "agentId": "...",
  "tool": "webSearch"
}

etc.
But I wouldn't.
You would eventually need:
agent_started
agent_stopped
agent_failed
tool_started
tool_progress
tool_completed
message_started
message_delta
message_completed
state_changed
approval_required
subagent_started
subagent_completed
run_cancelled
run_paused
...

AG-UI already provides the standardized event architecture for this class of problem. It is transport agnostic and can work over SSE, WebSockets and other transports. GitHub
So I'd make:
Strands events
      ↓
Event adapter
      ↓
AG-UI events
      ↓
React

Your frontend then doesn't need to know anything about Strands.
That is a very important abstraction boundary.
5. Even better: Strands already has an AG-UI integration
This is where the research became particularly interesting.
There is already a Strands TypeScript AG-UI integration through:
@ag-ui/aws-strands

CopilotKit documents the Strands TypeScript integration and shows a StrandsAgent adapter. CopilotKit Docs
So instead of:
Strands
 ↓
your custom protocol
 ↓
React

you can potentially have:
Strands
 ↓
AG-UI adapter
 ↓
AG-UI
 ↓
React

That dramatically reduces custom infrastructure.
6. Where CopilotKit fits
I researched CopilotKit specifically because it is one of the strongest React layers around AG-UI.
It provides:
- React agent integration
- streaming
- shared state
- frontend tools
- human-in-the-loop
- generative UI
- agent state
- agent status
- AG-UI integration
For example, its useAgent() API exposes things such as:
agent.messages
agent.state
agent.isRunning
``` :chatgpt-content-reference{index="8"}


It also has direct Strands TypeScript integration. :chatgpt-content-reference{index="9"}

### But I would NOT make CopilotKit your entire application.

I would use:

```text
AG-UI
  +
selected CopilotKit components/hooks

where useful.
Your application is more than a Copilot/chat interface.
You need:
Agent registry
Agent configuration
Run management
Run history
Schedules
Logs
Metrics
Tools
Permissions
Settings
System status

CopilotKit isn't your database/control plane.
Your own application should own that.
7. The architecture I recommend
Frontend
React
TypeScript
Vite
React Router
TanStack Query
Zustand
Tailwind CSS
shadcn/ui
AG-UI client

I'd choose Vite + React rather than Next.js initially.
Why?
Because your UI is fundamentally an application/dashboard.
You don't need:
SSR
SEO
marketing pages
Next.js server actions

Your backend already exists.
So:
React SPA
     ↓
Node API

is cleaner.
You can always put a marketing site elsewhere.
8. Backend
I'd use:
Node.js 22+
TypeScript
Fastify
Zod
Prisma
PostgreSQL
Redis
BullMQ
Strands Agents SDK
AG-UI
OpenTelemetry

You could use Express because Strands itself documents Express streaming examples. strandsagents.com
But for a new control-plane service I would personally choose Fastify.
The important part isn't Express vs Fastify.
The important part is separating:
API
Agent runtime
Persistence
Queue
Event system

9. PostgreSQL
PostgreSQL should be your persistent source of truth.
Don't store important agent state only in memory.
I'd have approximately these tables:
agents
agent_versions

agent_runs
agent_run_events

agent_tools
agent_tool_executions

agent_schedules

agent_sessions
agent_messages

agent_approvals

agent_artifacts

agent_metrics

system_settings

Potentially:
users
roles
permissions

later.
10. Agent model
An agent shouldn't simply be:
{
  "name": "Research Agent"
}

I'd define something closer to:
interface AgentDefinition {
  id: string;

  name: string;
  slug: string;

  description?: string;

  status: "active" | "disabled";

  runtime: {
    framework: "strands";
    version: string;
  };

  model: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    baseUrl?: string;
  };

  systemPrompt: string;

  tools: AgentToolConfig[];

  configuration: Record<string, unknown>;

  concurrency: {
    maxRuns: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

But don't let this become the actual executable agent.
Instead:
Agent Definition
        ↓
Agent Factory
        ↓
Strands Agent instance

11. Agent Factory
This is one of the most important pieces of the architecture.
src/
  agents/
    registry/
    factory/
    runtime/

Conceptually:
async function createAgent(
  definition: AgentDefinition
): Promise<Agent> {

  const model = createModel(definition.model);

  const tools = await loadTools(
    definition.tools
  );

  return new Agent({
    model,
    systemPrompt: definition.systemPrompt,
    tools,
  });
}

Then your API never does:
new Agent(...)

directly.
Everything goes through:
AgentFactory

That makes dynamic agent management possible.
12. The Run is the most important database object
An agent and an agent run are different things.
For example:
Research Agent

may execute:
Run #1001
Run #1002
Run #1003
Run #1004

So:
agents
    │
    ├── runs
    ├── schedules
    ├── versions
    └── tools

A run should have:
interface AgentRun {
  id: string;

  agentId: string;

  status:
    | "queued"
    | "running"
    | "waiting"
    | "completed"
    | "failed"
    | "cancelled";

  trigger:
    | "manual"
    | "schedule"
    | "api"
    | "agent";

  input: unknown;

  output?: unknown;

  error?: {
    message: string;
    stack?: string;
  };

  startedAt?: Date;
  completedAt?: Date;

  createdAt: Date;
}

13. The UI should revolve around Runs
Your dashboard should make this obvious.
Something like:
┌───────────────────────────────────────────────────────┐
│ Agent Control                                          │
├─────────────┬─────────────────────────────────────────┤
│             │                                         │
│ Agents      │  Research Agent                        │
│             │                                         │
│ ● Research │  Status: RUNNING                        │
│ ● Writer   │                                         │
│ ● Coder    │  ████████████░░░░  67%                 │
│ ● Monitor  │                                         │
│             │  Current step                           │
│             │  Searching documentation...             │
│             │                                         │
│             │  ───────────────────────────────────   │
│             │                                         │
│             │  Execution timeline                     │
│             │                                         │
│             │  ✓ Agent started                        │
│             │  ✓ Search tool                          │
│             │  ✓ Retrieved 12 results                  │
│             │  ● Analyzing results                    │
│             │  ○ Generate report                      │
│             │                                         │
└─────────────┴─────────────────────────────────────────┘

14. The killer feature: Execution Timeline
I would make this one of the central components.
Instead of:
Agent is thinking...

show:
19:14:02  RUN_STARTED

19:14:03  MODEL_CALL
          GPT-5.x

19:14:05  TOOL_CALL
          web_search

19:14:06  TOOL_RESULT
          8 results

19:14:08  MODEL_CALL

19:14:12  TOOL_CALL
          read_document

19:14:15  TOOL_RESULT

19:14:17  SUBAGENT_STARTED
          ResearchAgent

19:14:32  SUBAGENT_FINISHED

19:14:33  FINAL_RESPONSE

That makes the UI useful as a developer/operator console, not just a chat window.
15. Your event architecture
I would create an internal event envelope:
interface AgentEvent {
  id: string;

  runId: string;
  agentId: string;

  timestamp: string;

  type: AgentEventType;

  sequence: number;

  payload: unknown;

  metadata?: {
    toolName?: string;
    model?: string;
    durationMs?: number;
    tokenUsage?: TokenUsage;
  };
}

Then:
Strands event
      ↓
Normalizer
      ↓
AgentEvent
      ↓
 ┌────┴────────┐
 ↓             ↓
Postgres      AG-UI
 ↓             ↓
history       live UI

This is extremely important.
It means the UI doesn't depend on the agent still running.
16. Don't use PostgreSQL as your live event transport
Postgres should persist events.
It shouldn't be your primary high-frequency event bus.
You can use PostgreSQL LISTEN/NOTIFY, and PostgreSQL supports exactly that publish/notification mechanism. PostgreSQL
But for your architecture I would use:
Redis

for ephemeral events / queues.
So:
PostgreSQL
    = permanent state

Redis
    = live coordination

17. Why Redis?
You'll eventually want:
queue agent
cancel agent
retry agent
schedule agent
limit concurrency
worker health
distributed locks
live events

Redis is useful here.
And BullMQ is a mature Node/TypeScript queue abstraction on top of Redis.
Architecture:
React
 ↓
API
 ↓
BullMQ
 ↓
Redis
 ↓
Worker
 ↓
Strands

18. But don't add a queue on day one if you don't need it
This is important.
For MVP:
React
 ↓
API
 ↓
Strands

can be enough.
But design the interfaces as if a worker exists:
interface AgentRunner {
  run(input: RunInput): Promise<RunResult>;
  cancel(runId: string): Promise<void>;
}

Then later:
DirectAgentRunner
QueueAgentRunner

can implement the same interface.
This avoids premature complexity.
19. Scheduling
Eventually:
Run every day at 08:00
Run every Monday
Run when another agent finishes
Run when webhook arrives
Run manually

So I'd model:
AgentSchedule

separately from:
AgentRun

Example:
{
  "agentId": "daily-news",
  "enabled": true,
  "type": "cron",
  "expression": "0 8 * * *",
  "timezone": "Europe/Sofia"
}

Scheduler:
Schedule
   ↓
create AgentRun
   ↓
queue
   ↓
worker

Never make the scheduler execute the agent directly.
20. Long-running agents
This is where the architecture needs to be future-proof.
Imagine:
Research Agent

takes:
45 minutes

You cannot depend on:
HTTP request
    ↓
wait 45 minutes

Instead:
POST /runs

       ↓

run created

       ↓

HTTP returns

{
  "runId": "abc123"
}

       ↓

worker executes

       ↓

events streamed to UI

This is the correct architecture.
21. Stop / Cancel
Strands already provides cancellation through agent.cancel(), including stopping model streaming and skipping pending tool executions. strandsagents.com
So your UI can have:
[ STOP AGENT ]

and:
POST /runs/:id/cancel

which eventually calls:
agent.cancel();

This is another reason Strands is a good fit.
22. Human approval
This should be part of the architecture even if you don't build it initially.
Example:
Agent
 ↓
"Delete 300 files"
 ↓
approval_required
 ↓
React
 ↓
┌──────────────────────────┐
│ Agent wants to execute:  │
│                          │
│ DELETE /production/...   │
│                          │
│ [ Reject ]   [ Approve ] │
└──────────────────────────┘
 ↓
Agent continues

AG-UI and CopilotKit already support human-in-the-loop interaction patterns. CopilotKit Docs
Your own backend should nevertheless remain the authority for dangerous actions.
23. Security boundary
This is especially important for your idea because you're talking about local agents.
An agent might eventually have:
filesystem
shell
browser
Docker
Git
SSH
API credentials
database access

So never expose your agent workers directly to the browser.
Always:
Browser
   ↓
Control API
   ↓
Authorization
   ↓
Agent worker

Not:
Browser
   ↓
Agent

24. Agent tools need permissions
I would eventually have:
interface ToolPermission {
  toolId: string;

  permission:
    | "allow"
    | "deny"
    | "approval_required";
}

Example:
filesystem.read      ALLOW
filesystem.write     APPROVAL
shell.execute        APPROVAL
docker.execute       DENY
web.search            ALLOW
database.read        ALLOW
database.write       APPROVAL

This turns the platform into an actual agent management system.
25. Local model support
Your idea of running the whole thing locally is very feasible.
The current Strands docs show model providers including OpenAI, Anthropic, Bedrock, Google, Ollama, llama.cpp and others in the provider matrix. strandsagents.com
The OpenAI provider is particularly useful because it can connect to OpenAI-compatible servers through a custom base URL. strandsagents.com
That means you can architect:
Agent UI
     ↓
Strands
     ↓
Model Adapter
     ↓
 ┌───────────────┬─────────────────┐
 │               │                 │
OpenAI         Ollama          llama.cpp
 │               │                 │
cloud           local            local

You don't want the frontend to care which one is being used.
26. Model configuration should therefore be database-driven
For example:
Models

OpenAI
  GPT-5.x

Anthropic
  Claude

Local
  Qwen

Local
  Llama

Local
  Mistral

Agent:
Research Agent
    ↓
Model: Local Qwen

Another:
Coding Agent
    ↓
Model: Claude

The agent definition chooses the model.
27. Observability: don't build all of it yourself
This is another area where the research produced a strong recommendation.
Look at Langfuse.
It is open source and self-hostable using Docker, and is specifically designed around AI traces, generations, tools, agents, token usage, latency and application traces. Langfuse
It can track:
Trace
 ├── Agent
 │    ├── Generation
 │    ├── Tool
 │    ├── Tool
 │    └── Generation

That's exactly what you eventually want.
28. Langfuse vs your UI
Don't duplicate Langfuse.
Use your UI for:
CONTROL

Agents
Runs
Start
Stop
Configure
Schedule
Approve
Retry
Deploy

Use Langfuse for:
OBSERVABILITY

Tokens
Costs
Latency
Traces
Prompts
Generations
Evaluations
Debugging

So:
                    ┌─────────────┐
                    │ React UI    │
                    │ CONTROL     │
                    └──────┬──────┘
                           │
                    Control API
                           │
                ┌──────────┴──────────┐
                │                     │
           Agent Runtime          Langfuse
                │                     │
             Strands               Traces

Langfuse itself can be self-hosted with Docker Compose and uses PostgreSQL plus additional infrastructure such as ClickHouse and Redis/Valkey, so I'd not include Langfuse inside your first MVP Compose stack unless you actually need its full observability UI. Langfuse
29. OpenTelemetry
I would still instrument your system with OpenTelemetry.
OpenTelemetry JS supports traces and metrics for Node.js/browser environments. OpenTelemetry
So your runtime becomes:
Strands
 ↓
OpenTelemetry
 ↓
OTel collector
 ↓
observability backend

You can later connect:
Grafana
Jaeger
Prometheus
Langfuse

without rewriting your application.
30. Don't confuse your project with Open WebUI
I also researched Open WebUI.
It's excellent if the goal is:
"I want a local AI interface where I can chat with models and connect agents."

It supports Docker, local models, OpenAI-compatible APIs and connecting autonomous agents. Open WebUI
But your idea is different.
You want:
"I want an operating console for my agents."

That's more like:
Agent Platform

rather than:
Chat interface

You could use Open WebUI alongside your platform, but I wouldn't make it the foundation.
31. Your UI should have these pages
I'd start with:
/
Dashboard
Running Agents       3
Queued Runs          7
Completed Today      42
Failed Today         2

┌─────────────────────────────┐
│ Active Runs                 │
│                             │
│ Research Agent     67%      │
│ Coding Agent       31%      │
│ News Agent         92%      │
└─────────────────────────────┘

/agents
Agent registry.
Research Agent
Coding Agent
Daily News
Website Monitor
Email Assistant

Actions:
Run
Edit
Disable
Duplicate
Delete
View

/agents/:id
Agent details.
Tabs:
Overview
Runs
Configuration
Tools
Schedules
Logs
Versions

/runs
Global execution history.
Run ID
Agent
Status
Trigger
Duration
Started
Completed

/runs/:id
This is the really important screen.
RUN #8f31

Research Agent

RUNNING

Input
────────────────────
Research AG-UI protocol
────────────────────

Timeline

✓ Agent started
✓ Model call
✓ Web search
✓ Web search
● Analyze results
○ Generate report

Right side:
Metrics

Duration
Tokens
Model
Tools
Cost

32. Agent editor
I'd eventually create:
Agent Editor

with:
┌─────────────────────────────────────────────┐
│ Agent                                       │
├─────────────────────────────────────────────┤
│                                             │
│ Name                                        │
│ [ Research Agent                         ]  │
│                                             │
│ Description                                 │
│ [ Research things on the internet        ]  │
│                                             │
│ Model                                       │
│ [ Local Qwen ▼ ]                            │
│                                             │
│ System Prompt                               │
│ ┌─────────────────────────────────────────┐ │
│ │ You are a research agent...             │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Tools                                       │
│ ☑ web_search                                │
│ ☑ read_file                                 │
│ ☐ shell                                     │
│                                             │
│             [ Save ] [ Test Agent ]         │
└─────────────────────────────────────────────┘

33. Agent versioning
Do not modify an agent in place without versioning.
Instead:
Research Agent

v1
v2
v3 ← active

Database:
agents
agent_versions

A run records:
agentId
agentVersionId

Therefore you can always answer:
"Which exact configuration produced this result?"

That's extremely important for debugging.
34. Agent execution lifecycle
I'd standardize it as:
CREATED
   ↓
QUEUED
   ↓
STARTING
   ↓
RUNNING
   ↓
WAITING_FOR_INPUT
   ↓
RUNNING
   ↓
COMPLETED

Alternative exits:
RUNNING
   ↓
FAILED

RUNNING
   ↓
CANCELLED

RUNNING
   ↓
WAITING_FOR_APPROVAL

35. Don't fake progress percentages
This is a subtle but important design point.
An LLM doesn't inherently know:
67%

So don't show:
████████░░ 80%

unless your workflow has known steps.
Instead show:
Current activity:

Searching documentation...

Step 3 of 6

when you actually know the workflow.
Otherwise:
RUNNING
Searching documentation...

is much more truthful.
AG-UI's activity/state concepts are well suited for this kind of progress representation. GitHub
36. Multi-agent support
Eventually you might have:
Research Manager
       │
       ├── Web Researcher
       ├── Documentation Researcher
       └── Analyst

The UI should therefore support:
Parent Run
   │
   ├── Child Run
   ├── Child Run
   └── Child Run

Database:
agent_runs
    parent_run_id

Then UI:
Research Manager
│
├── Research Agent
│    ├── Search
│    └── Analyze
│
├── Documentation Agent
│
└── Writer Agent

This becomes incredibly useful.
Strands itself supports multi-agent orchestration patterns, and its streaming events include multi-agent coordination. strandsagents.com
37. Repository structure
I would create this:
agent-control/
│
├── apps/
│   │
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── agents/
│   │   │   │   ├── runs/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── schedules/
│   │   │   │   └── settings/
│   │   │   ├── lib/
│   │   │   └── stores/
│   │   └── package.json
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── events/
│   │   │   ├── auth/
│   │   │   └── server.ts
│   │   └── package.json
│   │
│   └── worker/
│       ├── src/
│       │   ├── agents/
│       │   ├── runtime/
│       │   ├── tools/
│       │   ├── execution/
│       │   └── worker.ts
│       └── package.json
│
├── packages/
│   │
│   ├── database/
│   │   ├── prisma/
│   │   └── src/
│   │
│   ├── shared/
│   │   └── src/
│   │
│   ├── agent-core/
│   │   └── src/
│   │
│   ├── agent-events/
│   │   └── src/
│   │
│   ├── agent-tools/
│   │   └── src/
│   │
│   └── config/
│       └── src/
│
├── docker/
│
├── docker-compose.yml
├── docker-compose.dev.yml
│
├── .env.example
├── package.json
├── turbo.json
└── README.md

38. Monorepo
Given your existing preference for npm workspaces/Turborepo, I'd use:
npm workspaces
+
Turborepo

The architecture naturally benefits from shared packages:
@agent-control/shared
@agent-control/events
@agent-control/database
@agent-control/agent-core
@agent-control/tools

39. API
I would define the API around resources.
Agents
GET    /api/agents
POST   /api/agents

GET    /api/agents/:id
PATCH  /api/agents/:id
DELETE /api/agents/:id

POST   /api/agents/:id/run
POST   /api/agents/:id/enable
POST   /api/agents/:id/disable

Runs
GET    /api/runs

GET    /api/runs/:id

POST   /api/runs/:id/cancel
POST   /api/runs/:id/retry

Events
GET /api/runs/:id/events

or preferably an AG-UI streaming endpoint.
Schedules
GET    /api/agents/:id/schedules
POST   /api/agents/:id/schedules
PATCH  /api/schedules/:id
DELETE /api/schedules/:id

40. Live communication
For live execution:
POST /api/runs

returns:
{
  "runId": "run_123"
}

Then React connects:
GET /api/runs/run_123/stream

and receives:
AG-UI events

This is cleaner than keeping the POST request open.
41. Event persistence
Every important event should be stored.
Example:
{
  "id": "evt_123",
  "runId": "run_123",
  "sequence": 17,
  "type": "tool_call_start",
  "timestamp": "2026-10-03T19:14:32Z",
  "payload": {
    "tool": "web_search",
    "arguments": {
      "query": "AG-UI protocol"
    }
  }
}

Then the UI can reconnect.
That's critical.
Imagine:
Agent running
     ↓
Mac sleeps
     ↓
Browser reconnects

The UI should reconstruct the run from:
PostgreSQL event history
+
live events

42. Docker Compose
Your initial stack should be intentionally small:
agent-control-web
agent-control-api
agent-control-worker
postgres
redis

Something like:
services:

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      api:
        condition: service_healthy

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/agent_control
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/agent_control
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:18
    environment:
      POSTGRES_DB: agent_control
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql

  redis:
    image: redis:latest
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:

I would make production credentials configurable through .env.
43. One complication: local agents vs Docker agents
This is something you should decide early.
You said:
"on my local machine an agent"

There are two meanings:
A. Agent runs inside Docker
Docker
 └── worker
      └── Strands

Easy deployment.
B. Agent needs access to host machine
For example:
filesystem
terminal
Docker
SSH
browser
Mac applications

Then the architecture becomes:
Docker Control Plane
        ↓
Local Agent Runtime
        ↓
Mac

I strongly recommend supporting both.
44. Local Agent Runner
Create a small process:
agent-runner

which can run outside Docker.
Architecture:
                         Docker
┌──────────────────────────────────────────────┐
│                                              │
│ React                                         │
│ API                                           │
│ PostgreSQL                                    │
│ Redis                                         │
│                                              │
└───────────────────┬──────────────────────────┘
                    │
                 secure API
                    │
             ┌──────▼──────┐
             │ Local Runner│
             │             │
             │ Strands     │
             │ Tools       │
             │ Filesystem  │
             │ Shell       │
             └─────────────┘

That is much safer than giving your main API container unrestricted access to the host.
45. Think of this as a control plane/data plane
This terminology will help enormously.
Control plane
UI
API
Database
Scheduling
Authentication
Agent definitions
Run management
Permissions

Data plane
Agent workers
Strands
Tools
Models
Browser
Shell
Filesystem
MCP

So:
              CONTROL PLANE

       React
         ↓
       API
         ↓
    PostgreSQL
         ↓
      Redis


              DATA PLANE

     Worker / Runner
          ↓
       Strands
          ↓
        Tools
          ↓
       Models

This is the architecture I'd build around.
46. MCP fits naturally
Strands supports MCP, and MCP is the right abstraction for many external tools.
So your tools could be:
Native Strands tools
MCP tools
HTTP tools
Local tools
Frontend tools

Your Agent Editor could eventually display:
TOOLS

Native
☑ web_search
☑ file_reader

MCP
☑ GitHub
☑ PostgreSQL
☑ filesystem

Frontend
☑ request_approval

This gives you an extensible platform.
47. The architecture I would NOT use
I would avoid:
React
 ↓
Next.js API
 ↓
Agent

with every agent hard-coded inside the application.
Also avoid:
React
 ↓
WebSocket
 ↓
random agent process

And definitely avoid:
React
 ↓
execute arbitrary shell command

The first approach becomes impossible to manage as the number of agents increases.
48. MVP vs Phase 2 vs Phase 3
Don't build everything at once.
Phase 1 — Agent Control MVP
Build:
React
Node
Strands
PostgreSQL
Docker Compose

Features:
Create agent
Edit agent
Delete agent
Run agent
Stop agent
View run
Live streaming
Run history
Tool events
Errors

That's enough to prove the concept.
Phase 2 — Real platform
Add:
Redis
BullMQ
Worker
Schedules
Retries
Concurrency
Agent versions
MCP
Approvals

Phase 3 — Observability
Add:
OpenTelemetry
Langfuse
Metrics
Token usage
Costs
Latency
Trace visualization
Evaluation

Phase 4 — Multi-agent
Add:
parent/child runs
agent-to-agent
delegation
swarm visualization
agent graphs

Phase 5 — Local computer agents
Add:
local runner
filesystem
shell
browser
Docker
SSH
MCP

with permission controls.
49. What I would use
Here's my final technology recommendation:
Layer	Choice
Frontend	React + TypeScript
Build	Vite
UI	shadcn/ui + Tailwind
Client state	Zustand
Server state	TanStack Query
Agent UI protocol	AG-UI
Optional agent UI framework	CopilotKit
Backend	Node.js + TypeScript
API	Fastify
Validation	Zod
Agent runtime	Strands TypeScript SDK
Database	PostgreSQL
ORM	Prisma
Queue	BullMQ
Queue backend	Redis
Streaming	AG-UI / SSE
Tool protocol	MCP
Observability	OpenTelemetry + Langfuse
Containers	Docker
Local orchestration	Docker Compose
Monorepo	npm workspaces + Turborepo
Testing	Vitest + Playwright


50. The most important architectural rule
I would write this into the project documentation:
The Agent Control Plane must never depend directly on a specific agent implementation.

Instead:
Agent
   ↓
Agent Adapter
   ↓
Agent Runtime Interface
   ↓
Control Plane

Your first adapter:
StrandsAdapter

Later:
ClaudeAgentAdapter
OpenAIAgentAdapter
CustomAgentAdapter
RemoteAgentAdapter

That means your UI could eventually manage:
Strands Agent
Claude Agent
OpenAI Agent
Python Agent
Remote Agent
Docker Agent
MCP Agent

without redesigning the UI.
51. The abstraction I'd give the AI coding agent
This is the core interface I'd have it implement:
interface AgentRuntime {
  initialize(): Promise<void>;

  run(input: AgentRunInput): Promise<AgentRun>;

  stream(
    input: AgentRunInput
  ): AsyncIterable<AgentEvent>;

  cancel(
    runId: string
  ): Promise<void>;

  getStatus(
    runId: string
  ): Promise<AgentRunStatus>;

  shutdown(): Promise<void>;
}

And:
interface AgentDefinition {
  id: string;

  name: string;

  version: number;

  description?: string;

  model: ModelConfig;

  systemPrompt: string;

  tools: ToolDefinition[];

  settings: AgentSettings;
}

Then:
StrandsRuntime implements AgentRuntime

That is the foundation I'd build around.
52. The UI component architecture
I'd structure React like:
components/
│
├── layout/
│   ├── Sidebar
│   ├── Topbar
│   └── PageContainer
│
├── agents/
│   ├── AgentCard
│   ├── AgentList
│   ├── AgentEditor
│   ├── AgentStatus
│   └── AgentTools
│
├── runs/
│   ├── RunList
│   ├── RunDetails
│   ├── RunTimeline
│   ├── RunStatus
│   ├── RunMetrics
│   └── RunControls
│
├── events/
│   ├── EventTimeline
│   ├── ToolCallEvent
│   ├── ModelEvent
│   ├── AgentEvent
│   └── ErrorEvent
│
├── dashboard/
│   ├── Stats
│   ├── ActiveRuns
│   └── RecentRuns
│
└── approvals/
    ├── ApprovalCard
    └── ApprovalDialog

53. The React state model
Don't put everything in Zustand.
Use:
TanStack Query
    ↓
server/database state

Zustand
    ↓
UI state

AG-UI
    ↓
live execution state

For example:
Agent definitions
      → TanStack Query

Run history
      → TanStack Query

Selected agent
      → Zustand

Modal open/closed
      → Zustand

Current run stream
      → AG-UI

Agent live status
      → AG-UI

That's cleaner.
54. The really nice part
Imagine you eventually have:
localhost:3000

and see:
AGENT CONTROL

┌─────────────────────────────────────────────┐
│ 5 AGENTS                                    │
│                                             │
│ 🟢 Research Agent          RUNNING          │
│ 🟢 Daily News              RUNNING          │
│ ⚪ Code Reviewer            IDLE             │
│ ⚪ Website Monitor          IDLE             │
│ 🔴 Backup Agent             FAILED           │
└─────────────────────────────────────────────┘

Click:
Research Agent

and get:
CURRENT RUN

Researching Strands Agents

✓ Initialized
✓ Searching docs
✓ Reading SDK documentation
● Comparing agent UI frameworks
○ Generating report

Click:
Comparing agent UI frameworks

and inspect:
Tool: web_search

Input:
"AG-UI React agent protocol"

Duration:
2.14 sec

Result:
...

Then:
[ STOP ]

and the Strands cancellation mechanism terminates it.
That's the product you are describing.
55. One thing I would change from your original idea
You said:
"create, update, and track the progress of my agents"

I'd separate:
Agent management
from
Agent execution.
Because:
Agent

is a definition.
Run

is an execution.
So:
Agent
 ├── Configuration
 ├── Tools
 ├── Model
 ├── Prompt
 ├── Versions
 └── Schedules

Run
 ├── Input
 ├── Events
 ├── Tool calls
 ├── Output
 ├── Errors
 └── Metrics

This distinction will make the whole project much easier to reason about.
56. My recommended final architecture
If I were starting the repository today, I'd build:
                    ┌──────────────────────────┐
                    │       React UI            │
                    │                          │
                    │ Dashboard                │
                    │ Agents                   │
                    │ Runs                     │
                    │ Timeline                 │
                    │ Tools                    │
                    │ Schedules                │
                    │ Approvals                │
                    └────────────┬─────────────┘
                                 │
                            AG-UI / SSE
                                 │
                    ┌────────────▼─────────────┐
                    │       Control API         │
                    │       Node / TS           │
                    │                          │
                    │ Agent Registry            │
                    │ Run Manager               │
                    │ Scheduler                 │
                    │ Permissions               │
                    └──────┬─────────┬─────────┘
                           │         │
                    PostgreSQL      Redis
                           │         │
                           │      BullMQ
                           │         │
                    ┌──────▼─────────▼──────┐
                    │       Workers         │
                    │                       │
                    │  Strands Runtime      │
                    │                       │
                    │  Agent A              │
                    │  Agent B              │
                    │  Agent C              │
                    └──────────┬────────────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
              OpenAI       Local LLM       MCP
              Anthropic    Ollama/etc.     Tools
              Bedrock

And around all of it:
OpenTelemetry
     ↓
Langfuse / Grafana / Jaeger

57. One particularly useful conclusion from the research
The ecosystem has moved toward a protocol-based architecture:
MCP
 ↓
Agent ↔ Tools/Data

A2A
 ↓
Agent ↔ Agent

AG-UI
 ↓
Agent ↔ User/UI

AG-UI itself explicitly describes this separation: MCP handles agent-to-tool/data interaction, A2A handles agent-to-agent interaction, and AG-UI handles agent-to-user interaction. GitHub
That is exactly the architecture I would take advantage of rather than inventing another proprietary protocol.
What I would build first
The first implementation should be deliberately small:
React + Vite
        │
        │ AG-UI
        ▼
Node/Fastify API
        │
        ▼
Strands TypeScript
        │
        ├── OpenAI
        └── local OpenAI-compatible model

PostgreSQL

Then:
Phase 2:
Redis + BullMQ + Worker

Then:
Phase 3:
Schedules + approvals + MCP

Then:
Phase 4:
OpenTelemetry + Langfuse

This gives you a usable system early without committing yourself to a giant platform before you've tested the core UX.
And I would specifically use the current Strands TypeScript SDK + AG-UI integration rather than writing a custom Strands-to-React protocol. The current Strands SDK already exposes the streaming/hooks/cancellation primitives needed, while AG-UI gives you the standardized event/state layer on the frontend. strandsagents.com
Sources / current references
- Strands Agents TypeScript SDK
- Strands TypeScript Quickstart
- Strands Streaming
- Strands Hooks
- AG-UI Protocol
- AG-UI Events
- CopilotKit + Strands TypeScript
- Langfuse self-hosting
- Langfuse observability
If your goal is to hand this directly to an AI coding agent, the next logical artifact is a complete implementation specification: monorepo tree, exact packages, PostgreSQL/Prisma schema, REST/AG-UI API contracts, event schema, Strands adapter, React screens/components, Dockerfiles, docker-compose.yml, .env.example, and a phased implementation checklist that a coding agent can execute sequentially.
