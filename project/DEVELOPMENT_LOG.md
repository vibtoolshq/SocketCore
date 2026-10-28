## 2026-10-28 - Phase 3: Reusable Extension Boundaries - Complete

- Confirmed the transport core does not import/register sample business handlers; the standalone `app.js` composes them.
- Added a public-API integration test for two independent app configurations with distinct auth headers, origins, identities, handlers, and metrics callbacks.
- Documented public callback contracts and explicitly deferred store/pubsub/codec adapters because no consuming-app need is specified.
- Verification: `npm test` passed 12 tests, 0 failures; exact phase scope/results are recorded in the phase completion log.
- No transport behavior, protocol, dependency, UI, or application business feature was changed.

# Development Log

## 2026-10-28 - Add tracked project records and user guides

### Phase 1: Inspect repository facts - Complete

- Read current `AGENTS.md`, `.gitignore`, and the local development notes before editing.
- Inspected package metadata, app startup/configuration, engine lifecycle, connection manager, router, handlers, and integration tests.
- Confirmed the repository currently has no frontend pages or application-specific HTTP routes in the inspected source.

### Phase 2: Create project and user documentation - Complete

- Added `project/README.md`, `project/MINIFEST.md`, `project/PROJECT_OVERVIEW.md`, and this dated development record.
- Added `docs/README.md`, `docs/MINIFEST.md`, `docs/USER_GUIDE.md`, `docs/CONFIGURATION.md`, `docs/WEBSOCKET_PROTOCOL.md`, and `docs/ENGINE_API.md`.
- Documented existing behavior only; noted the default-deny subscription authorization and absence of app-specific pages/routes.

### Phase 3: Require ongoing documentation and verify - Complete

- Updated root `AGENTS.md` to require project records, feature/page documentation, docs updates alongside relevant code changes, and factual source verification.
- `npm test` passed: 1 test passed, 0 failed.
- Verified local Markdown link targets, direct-file inventory in both `MINIFEST.md` files, and that `.gitignore` does not exclude `project/` or `docs/`.
- The workspace is not initialized as a Git repository, so tracked status could not be confirmed with Git; the ignore configuration permits both directories to be tracked.

## 2026-10-28 - Phase 1: Foundation and correctness - Complete

- Added `engine/config.js` as the shared source for finite port, resource-limit, and heartbeat defaults and validation.
- Routed standalone app and engine defaults through the shared config; direct connection-manager defaults are finite and direct options are validated.
- Applied async subscription authorization to both handler context and direct connection-manager calls; default-deny remains.
- Corrected command broadcast response to use the manager's successful-send count.
- Added config/authorization/broadcast regression tests; final `npm test` passed 4 tests with no failures.
- Updated `project/PROJECT_OVERVIEW.md` and the configuration, API, and protocol user guides. No unrelated feature/UI behavior was changed; no UI exists in this project.

## 2026-10-28 - Phase 2: Runtime Safety and Observability - Complete

- Baseline: local commit `81c3d7467c7ed980ac073d4a6612ea255ea232f1`; no remote/push.
- Added callback deadlines, bounded drain, optional aggregate message/buffer limits, safe metrics hooks, sanitized error logging, and send-failure accounting.
- `npm test` passed 11 tests, 0 failures.
- Updated configuration/API/protocol/user guides and project feature inventory. No unrelated UI/business feature changes were made.
- Per-IP/tenant protection remains deferred pending trusted-source assumptions; aggregate limits are optional and disabled by default; no supported concurrency claim is made.
