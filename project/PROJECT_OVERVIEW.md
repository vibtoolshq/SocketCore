# Project Overview

## Verified Snapshot

This document describes the inspected project after Phase 4 on 2026-10-28. The package is `configurable-websocket-engine` version `1.0.0`, CommonJS, Node.js `>=20`, with `ws` `^8.18.3`. Package root export is `createEngine`; the standalone app is `app.js`.

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
| `load-test/server.js`          | Test-only loopback server composing the engine and sample handlers for scale measurements.                  |
| `test/engine.test.js`          | Integration coverage for handshake, auth, groups, limits and cleanup.                                      |
| `test/phase1.test.js`          | Phase 1 config, subscription-authorization, and broadcast regression tests.                                |
| `test/phase2.test.js`          | Phase 2 timeout, drain, aggregate cap, send failure, metrics, and redaction tests.                         |
| `test/phase3.test.js`          | Proves two application configurations compose through public engine APIs without core specialization.      |
| `test/load/clients.py`         | Async Python workload, response/fanout/reconnect checks, latency and resource report.                       |
| `test/requirements-load.txt`   | Pinned test-only Python WebSocket client dependency.                                                        |
| `package.json`                 | Package metadata, exports, scripts, Node floor, dependency.                                                |

## Implemented Phase 1-4 Behavior

- Phase 1 centralized finite defaults and validation, enforced subscription authorization through both context and manager APIs, and fixed broadcast delivery count.
- Phase 2 added bounded origin/auth callbacks, pending-slot release on timeout, graceful async drain, optional global limits, injectable metrics, safe logging, and send-failure cleanup.
- Phase 3 verified that independent applications can configure auth headers, origins, identities, handlers and metrics through the same public `createEngine`/`register` APIs. Sample handlers remain outside transport core; `app.js` composes them.
- Phase 4 adds a repeatable Python-client loopback profile and a close-event metric. The final 1k and 2k local profiles passed their provisional thresholds, including the 2k reconnect waves; the helper server is outside Node's automatic test discovery.
- `npm test` passed 12 tests, 0 failures after Phase 4.

## Phase 4 Local Scale Study

On Windows Server 2022 with Node `v26.12.0`, Python `3.12.0`, 4 logical CPUs, and 7.8 GiB installed RAM, the 1k profile recorded p95/p99 latency of 3.567/48.384 ms and 75.65 MiB peak RSS. The 2k profile recorded 12,001/12,001 responses, 10,000/10,000 broadcast deliveries, p95/p99 latency of 7.584/178.432 ms, 108.29 MiB peak RSS, 34.24 MiB peak heap, and successful 500-client reconnect waves in 1.160 s and 1.441 s. It ended with zero active connections and buffered bytes.

These are synthetic loopback results against provisional thresholds, not a production-supported concurrency guarantee. Application-specific traffic, deployment hardware, TLS/proxy path, production SLOs, and resource budgets are unknown.

## Extension Boundaries and Remaining Work

The public root package export is `createEngine`; config/observability modules are internal. Supported extension callbacks include authentication, subscription authorization, logger and metrics. No external consumer requirements were supplied, so Phase 3 adds no store/pubsub/codec adapter or backend.

Per-IP/tenant limits remain deferred until a trusted proxy and tenant-identity contract are specified. The repository has no metrics backend, persistent store, or production-qualified concurrency number. Optional aggregate limits being disabled by default is not capacity evidence. The local load harness does not test TLS, reverse proxies, remote hosts, or a consuming application's actual traffic profile. No UI exists.

User setup/protocol/API details are in `../docs/`; private phase scope and readiness decisions are in `../notes/PRODUCTION_READINESS_ROADMAP.md`.
