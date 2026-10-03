---
name: record-project-memory
description: When a stack choice, boundary, or phase decision changes, append .cursor/memory/decisions.md, refresh .cursor/memory/project.md, and update the matching docs/ page.
---

# Record project memory

Use when an architectural or phase decision is made or changed.

## Steps

1. Append a dated entry to `.cursor/memory/decisions.md` (decision + why).
2. Update `.cursor/memory/project.md` if phase scope or stack changed.
3. Update the relevant doc under `docs/` (architecture, conf, or src).
4. Optionally write durable facts to Graphiti under group id `jaha-eye` — repo files remain source of truth.

## Do not store

- API keys, tokens, credentials
- Environment-specific secrets
