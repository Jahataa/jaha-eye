# packages/shared

Shared Zod schemas and TypeScript types used by API, web, and agent-core.

## Modules

| File | Contents |
|------|----------|
| `agent.ts` | Agent CRUD schemas, AgentDefinition type |
| `run.ts` | Run schemas, status enums |
| `event.ts` | PersistedAgentEvent, AG-UI type helpers |
| `tool.ts` | Built-in tool catalog |
| `settings.ts` | LLM settings GET/PATCH/test schemas |
| `api.ts` | Request/response DTOs |

## Conventions

- Zod schemas are the single source of truth for validation.
- API parses with Zod; web imports inferred types.
- Enums match Prisma schema values exactly.
