# apps/web

Vite + React + TypeScript SPA.

## Key paths

| Path | Purpose |
|------|---------|
| `src/app/router.tsx` | React Router routes |
| `src/features/` | Feature modules (agents, runs, dashboard, office) |
| `src/features/office/` | Office console: task bar/board, calendar, brain (React Flow), 3D floor (lazy `OfficeScene`) |
| `src/stores/office-store.ts` | Office desk selection + WebGL availability |
| `src/hooks/use-run-stream.ts` | SSE consumer |
| `src/stores/ui-store.ts` | Zustand UI state |
| `src/lib/api.ts` | Fetch wrapper |
| `src/features/docs/` | In-app documentation viewer (`import.meta.glob` on repo `docs/`) |
| `src/features/graphify/` | Graphify operator screen — polls `/api/graphify/status`, Mermaid diagrams |

## Dev

```bash
npm run dev -w @jaha-eye/web
```

Vite proxies `/api` to the Fastify server.

Documentation markdown is bundled at build time from the monorepo `docs/` folder (no API). Run `npm run test -w @jaha-eye/web` for doc link/search unit tests.

See [docs/ui/](../ui/README.md) for screens and state.
