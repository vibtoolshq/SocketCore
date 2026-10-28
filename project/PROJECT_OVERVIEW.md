# Project Overview

## Verified Snapshot

This document describes the inspected project and the Phase 1 implementation completed on 2026-10-28. The package is `configurable-websocket-engine` version `1.0.0`, CommonJS, Node.js `>=20`, with `ws` `^8.18.3`. Package entry/export resolve to `engine/index.js`; the standalone app is `app.js`.

This is a WebSocket transport engine and sample server, not a web page or REST API. The app creates a plain Node HTTP server and attaches the WebSocket upgrade listener. No app-specific HTTP route, frontend page, or upgrade path check exists.

## Source Inventory and Ownership

| Path                           | Responsibility                                                                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.js`                       | Reads environment settings using shared defaults; configures token/origin policy and sample handlers; starts HTTP/engine; handles SIGINT/SIGTERM.   |
| `engine/config.js`             | Owns finite port, resource-limit, and heartbeat defaults; resolves/validates limit and heartbeat options.                                           |
| `engine/index.js`              | Exports `createEngine`; validates engine inputs; handles upgrades, authentication/origin checks, client message limits, registration and lifecycle. |
| `engine/connection-manager.js` | In-memory clients/groups; send/broadcast/subscription APIs; backpressure and heartbeat cleanup.                                                     |
| `engine/message-router.js`     | JSON decoding, type dispatch, fixed protocol error responses.                                                                                       |
| `handlers/status.handler.js`   | Sample status acknowledgement, admin snapshot, admin broadcast.                                                                                     |
| `handlers/command.handler.js`  | Sample ping, echo, admin broadcast and admin client shutdown.                                                                                       |
| `test/engine.test.js`          | Integration coverage for handshake, auth, group isolation, command role checks, limits, publish and cleanup.                                        |
| `test/phase1.test.js`          | Phase 1 tests for config validation, default-deny manager subscribe, and command broadcast count.                                                   |
| `package.json`                 | Package metadata, exports, scripts, Node floor, dependency.                                                                                         |

## Phase 1 Changes

- `engine/config.js` is the single source for the default port, engine limits, and heartbeat settings. The app, engine and manager use these shared defaults; direct manager defaults are finite.
- Limit/heartbeat resolvers reject invalid object shapes, unknown keys, and invalid values. Explicit `Infinity` remains accepted for supported engine limit overrides.
- Subscription authorization now applies through both handler context and direct connection-manager calls. Default behavior remains deny. Direct `connectionManager.subscribe` is asynchronous and returns `Promise<boolean>`.
- Command broadcast's `delivered` response now uses the connection manager's successful-send count. It means accepted socket sends, not client-side processing acknowledgement.
- `npm test` passed 4 tests, 0 failures after Phase 1.

## Connection and Access Behavior

The standalone app requires `AUTH_TOKENS`; `ADMIN_TOKENS` must be a subset. It reads `x-auth-token`; clients receive role `client`, admin tokens receive role `admin`. Requests without `Origin` are allowed. A provided Origin must exactly match `ALLOWED_ORIGINS`, unless wildcard is configured.

`createEngine` requires an async-capable authenticate callback returning a non-null, non-array object identity. The engine can attach to an external HTTP server in `noServer` mode. It assigns UUID client IDs and sends a `connected` message. Rate/concurrency limits apply per client. Heartbeat starts when `engine.start()` is called.

Subscriptions are denied by default. Applications must configure `authorizeSubscription`; they must also register a handler if clients need a join/subscribe message. Both context and direct manager subscribe calls call the authorizer.

## Built-in Sample Handlers

- `status` normally acknowledges and echoes data; admin can request a connection snapshot or broadcast status to other clients.
- `command` supports `ping`, `echo`, admin `broadcast`, and admin `shutdown-client`.
- Existing message types, JSON field shapes, and error codes are preserved by Phase 1. See `../docs/WEBSOCKET_PROTOCOL.md`.

## Resource Controls and Boundaries

Shared defaults/environment mapping are in `../docs/CONFIGURATION.md`. The implementation has total connection, pending-upgrade, payload, per-client rate/concurrency, per-socket buffered-byte, per-client subscription, and group-name limits. It does not have global/IP/tenant budgets, aggregate memory accounting, distributed state, persistent storage, TLS setup in the standalone app, load-qualified concurrency, or a frontend.

Phase 1 does not implement callback deadlines, shutdown drain, metrics, adapters or scale qualification. See `../notes/PRODUCTION_READINESS_ROADMAP.md` for the private phase plan and `../notes/PHASE_COMPLETION_LOG.md` for actual completion records.
