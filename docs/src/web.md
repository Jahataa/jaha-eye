# apps/web

Vite + React + TypeScript SPA.

## Key paths

| Path | Purpose |
|------|---------|
| `src/app/router.tsx` | React Router routes |
| `src/features/` | Feature modules (agents, runs, dashboard) |
| `src/hooks/use-run-stream.ts` | SSE consumer |
| `src/stores/ui-store.ts` | Zustand UI state |
| `src/lib/api.ts` | Fetch wrapper |

## Dev

```bash
npm run dev -w @jaha-eye/web
```

Vite proxies `/api` to the Fastify server.

See [docs/ui/](../ui/README.md) for screens and state.
