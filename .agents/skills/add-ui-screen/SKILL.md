---
name: add-ui-screen
description: Add a new React screen with route, feature folder, TanStack Query/Zustand/SSE split, and update docs/ui/.
---

# Add UI screen

## Steps

1. Add route in `apps/web/src/app/router.tsx`.
2. Create feature folder under `apps/web/src/features/<name>/`.
3. Server data → TanStack Query hooks in `features/<name>/queries.ts`.
4. UI-only state → Zustand if needed (dialogs, selection).
5. Live run data → SSE hook, not Query polling.
6. Add nav link in sidebar layout.
7. Update `docs/ui/screens.md` and `docs/ui/components.md`.

## Conventions

- Activity text over fake progress bars.
- shadcn-style components from `components/ui/`.
