# Project Overview

## Verified Snapshot

This document describes the inspected project after Phase 3 on 2026-10-28. The package is `configurable-websocket-engine` version `1.0.0`, CommonJS, Node.js `>=20`, with `ws` `^8.18.3`. Package root export is `createEngine`; the standalone app is `app.js`.

This is a WebSocket transport engine and sample server, not a web page or REST API. No app-specific HTTP route, frontend page, or upgrade path check exists.

## Source Inventory

| Path                           | Responsibility                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `app.js`                       | Environment configuration, sample auth/origin/handlers, server lifecycle and signal shutdown.              |
| `engine/config.js`             | Shared port/limit/heartbeat/timeout defaults and option validation.                                        |
| `engine/observability.js`      | Internal metrics wrapper and safe logger helpers.                                                          |
| `engine/index.js`              | Public `createEngine` factory, bounded handshake callbacks, upgrade/message admission, metrics, lifecycle. |
| `engine/connection-manager.js` | In-memory clients/groups, sends, authorization, aggregate/per-client buffering, heartbeat and drain.       |
| `engine/message-router.js`     | JSON decoding, type dispatch, protocol errors, handler failure metric/log.                                 |
| `handlers/command.handler.js`  | Sample ping/echo/admin broadcast/client shutdown commands.                                                 |
| `handlers/status.handler.js`   | Sample status acknowledgement, admin snapshot and broadcast.                                               |
| `test/engine.test.js`          | Integration coverage for handshake, auth, groups, limits and cleanup.                                      |
| `test/phase1.test.js`          | Phase 1 config, subscription-authorization, and broadcast regression tests.                                |
| `test/phase2.test.js`          | Phase 2 timeout, drain, aggregate cap, send failure, metrics, and redaction tests.                         |
| `test/phase3.test.js`          | Proves two application configurations compose through public engine APIs without core specialization.      |
| `package.json`                 | Package metadata, exports, scripts, Node floor, dependency.                                                |

## Implemented Phase 1-3 Behavior

- Phase 1 centralized finite defaults and validation, enforced subscription authorization through both context and manager APIs, and fixed broadcast delivery count.
- Phase 2 added bounded origin/auth callbacks, pending-slot release on timeout, graceful async drain, optional global limits, injectable metrics, safe logging, and send-failure cleanup.
- Phase 3 verified that independent applications can configure auth headers, origins, identities, handlers and metrics through the same public `createEngine`/`register` APIs. Sample handlers remain outside transport core; `app.js` composes them.
- `npm test` passed 12 tests, 0 failures after Phase 3.

## Extension Boundaries and Remaining Work

The public root package export is `createEngine`; config/observability modules are internal. Supported extension callbacks include authentication, subscription authorization, logger and metrics. No external consumer requirements were supplied, so Phase 3 adds no store/pubsub/codec adapter or backend.

Per-IP/tenant limits remain deferred until a trusted proxy and tenant-identity contract are specified. The repository has no metrics backend, persistent store, load/soak tool, or production-qualified concurrency number. Optional aggregate limits being disabled by default is not capacity evidence. No UI exists.

User setup/protocol/API details are in `../docs/`; private phase scope and readiness decisions are in `../notes/PRODUCTION_READINESS_ROADMAP.md`.
