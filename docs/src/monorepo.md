# Monorepo

- **Tooling:** npm workspaces + Turborepo
- **Node:** 22+
- **Scope:** `@jaha-eye/*`

## Commands

```bash
npm install              # all workspaces
npm run dev              # turbo dev (web + api)
npm run build            # build all
npm run test             # test all
npm run db:migrate       # Prisma migrate
```

## Workspace layout

```
apps/web
apps/api
packages/database
packages/shared
packages/agent-core
```

TypeScript project references extend from `tsconfig.base.json`.
