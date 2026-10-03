# Docker Compose

Phase 1 includes **Postgres only**. API and web run via `npm run dev` on the host.

```bash
docker compose up -d
```

## Service

| Service | Image | Port | Database |
|---------|-------|------|----------|
| `postgres` | postgres:16 | 5432 | `jaha_eye` |

Default credentials: `postgres` / `postgres` (see `.env.example`).

## Later

Phase 2 may add Redis, worker containers, and optional Langfuse stack. Not in current Compose file.
