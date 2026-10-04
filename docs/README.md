# jaha-eye documentation

Human-readable docs for the jaha-eye operator console. Coding agents should also read [AGENTS.md](../AGENTS.md) and [.cursor/memory/](../.cursor/memory/).

## Structure

| Folder | Layer |
|--------|-------|
| [architecture/](architecture/overview.md) | Cross-cutting system design |
| [planning/](planning/README.md) | Roadmap, foundations, future capabilities |
| [ui/](ui/README.md) | React dashboard |
| [conf/](conf/README.md) | Environment and deployment config |
| [src/](src/README.md) | Source packages and APIs |
| [agents/](agents/definitions-and-runs.md) | Agent definitions, runs, tools |

## Writing rules

- One layer per folder; architecture and agents cut across layers.
- Keep pages short; match the code exactly.
- Phase 2+ items are labeled **Later**, never described as if they exist.
- Update docs in the same pass as code changes.

## Planning

Architecture research and phased delivery: [planning/](planning/README.md) — [foundations](planning/foundations.md), [roadmap](planning/roadmap.md), [future](planning/future.md).
