# Project Records

This tracked directory records the verified design and development history of the WebSocket engine. Use it for engineering context, source ownership, implementation phases, and dated change records. It is distinct from `notes/`, which is personal, local, and ignored by Git.

## How to Use This Directory

- Read [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) before changing architecture, protocol behavior, access control, or resource limits.
- Update [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md) in the same task as each code change. Record the date, files or behaviors changed, phase steps, and verification result.
- Update `PROJECT_OVERVIEW.md` when implementation facts, feature behavior, or ownership change.
- Keep [MINIFEST.md](MINIFEST.md) synchronized with the direct contents of this directory.
- Write the private plan in `notes/` before starting implementation, as required by the root `AGENTS.md`.

## Current Scope

The repository is a CommonJS Node.js WebSocket transport engine using `ws`. The verified architecture and current feature behavior are in `PROJECT_OVERVIEW.md`; client-facing setup and protocol instructions are in `../docs/`.
