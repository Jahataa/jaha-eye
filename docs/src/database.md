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
| trigger | enum | manual (Phase 1) |
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

## Commands

```bash
npm run db:generate
npm run db:migrate
```
