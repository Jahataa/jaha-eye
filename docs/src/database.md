# packages/database

Prisma schema is the source of truth.

## Models

### Agent

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| name | string | Display name |
| slug | string | Unique URL slug |
| description | string? | Optional |
| status | enum | `active` \| `disabled` |
| modelProvider | string | e.g. `openai` |
| modelName | string | e.g. `gpt-4o-mini` |
| modelBaseUrl | string? | Override base URL |
| modelTemperature | float | Default 0.7 |
| systemPrompt | text | Agent instructions |
| tools | json | Array of tool ids |
| maxConcurrentRuns | int | Default 1 |

### Orchestration

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| name | string | Display name |
| slug | string | Unique URL slug |
| description | string? | Optional |
| status | enum | `active` \| `disabled` |
| graph | json | Nodes, edges, canvas positions (DAG) |
| defaultRunInput | string? | Default message when Run is clicked |

### AgentRun

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| agentId | uuid? | FK → Agent; null for orchestration parent runs |
| orchestrationId | uuid? | FK → Orchestration |
| graphNodeId | string? | Canvas node id for child runs |
| parentRunId | uuid? | Parent orchestration run for child rows; null on top-level runs |
| status | enum | queued, running, waiting, completed, failed, cancelled |
| trigger | enum | `manual` \| `schedule` (parent runs only; orchestration child runs stay `manual`) |
| input | json | Run input message (parent includes graph snapshot) |
| output | json? | Final output |
| error | json? | Error details |
| startedAt, completedAt | datetime? | Timestamps |

### AgentRunEvent

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| runId | uuid | FK → AgentRun |
| sequence | int | Monotonic per run |
| type | string | AG-UI event type |
| timestamp | datetime | Event time |
| payload | json | Full event payload |

### Schedule

Cron job targeting an agent or orchestration (separate table so one entity can have many jobs).

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| name | string? | Optional display name |
| enabled | boolean | Default true |
| targetType | enum | `agent` \| `orchestration` |
| agentId | uuid? | FK → Agent; cascade delete |
| orchestrationId | uuid? | FK → Orchestration; cascade delete |
| expression | string | 5-field cron (`min hour day month weekday`) |
| input | string? | Override run message; empty uses entity `defaultRunInput` |
| lastFiredAt | datetime? | Last successful fire time |
| lastFiredSlot | string? | Claimed local minute slot (`YYYY-MM-DDTHH:mm`) for idempotency |

### AppSettings

Singleton row (`id = "default"`) for global LLM configuration.

| Field | Type | Notes |
|-------|------|-------|
| id | string | Fixed `"default"` |
| llmApiKey | string? | Stored API key (never returned on GET) |
| llmBaseUrl | string? | OpenAI-compatible base URL |
| defaultModelName | string | Default for new agents (`gpt-4o-mini`) |
| defaultTemperature | float | Default for new agents (`0.7`) |

First GET returns effective env values without writing a row; first PATCH upserts the singleton.

## Commands

```bash
npm run db:generate
npm run db:migrate
```
