# SocketCore Project Overview

**A reusable WebSocket core for real-time Node.js applications.**

## Verified Snapshot

This document describes SocketCore after remediation Phases 5-7 and the provisional Phase 8 guardrail/load trial on 2026-10-31. Phase 8 production/VPS qualification remains blocked pending target workload, deployment, resource-budget, and SLO inputs. SocketCore is a configurable Node.js WebSocket engine for authenticated real-time messaging. The package metadata name is `configurable-websocket-engine`, version `1.0.0`, CommonJS, Node.js `>=20`, with `ws` `^8.18.3`. Package root export is `createEngine`; the standalone app is `app.js`.

## Project Identity

- **Project name:** SocketCore.
- **Tagline:** A reusable WebSocket core for real-time Node.js applications.
- **Suggested repository description:** Reusable Node.js WebSocket engine for authenticated real-time messaging, configurable limits, backpressure, metrics hooks, and graceful shutdown.
- **Author attribution:** Md Nurnobi; see the verified profile and company contacts in the root [AUTHORS.md](../AUTHORS.md).
- **Organization:** Vib Tools; no unverified executive or legal title is implied.
- **License:** **MIT** — owner approved on 2026-11-17; root [`LICENSE`](../LICENSE) with `Copyright (c) 2026 Md Nurnobi`. `package.json` and the lockfile root metadata both declare MIT; the `ws` dependency keeps its independent third-party MIT license. F-06 licensing decision closed locally, not yet pushed.

This is a WebSocket transport engine and sample server, not a web page or REST API. No app-specific HTTP route or frontend page exists. Library consumers can optionally set an exact WebSocket upgrade pathname; the standalone app leaves path matching unrestricted.

## Source Inventory

| Path                           | Responsibility                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.js`                       | Environment configuration, sample auth/origin/handlers, server lifecycle and signal shutdown.                                               |
| `engine/config.js`             | Shared port/limit/heartbeat/timeout defaults, including the global handler-work cap, and option validation.                                 |
| `engine/observability.js`      | Internal metrics wrapper and safe logger helpers.                                                                                           |
| `engine/index.js`              | Public `createEngine` factory, bounded/cancellable callbacks and handlers, optional path filter, global work admission, metrics, lifecycle. |
| `engine/connection-manager.js` | In-memory clients/groups, sends, authorization, aggregate/per-client buffering, heartbeat and drain.                                        |
| `engine/message-router.js`     | JSON decoding, type dispatch, protocol errors, handler failure metric/log.                                                                  |
| `handlers/command.handler.js`  | Sample ping/echo/admin broadcast/client shutdown commands.                                                                                  |
| `handlers/status.handler.js`   | Sample status acknowledgement, admin snapshot and broadcast.                                                                                |
| `load-test/server.js`          | Test-only loopback server composing the engine and sample handlers for scale measurements.                                                  |
| `load-test/pu06-preflight.js`  | Pure offline JSON readiness validator for owner-approved VPS/WSS/load/SLO inputs; never starts a load test or accesses the network. |
| `test/engine.test.js`          | Integration coverage for handshake, auth, groups, limits and cleanup.                                                                       |
| `test/phase1.test.js`          | Phase 1 config, subscription-authorization, and broadcast regression tests.                                                                 |
| `test/phase2.test.js`          | Timeout cancellation/accounting, drain, aggregate cap, send failure, metrics, and redaction tests.                                          |
| `test/phase3.test.js`          | Proves two application configurations compose through public engine APIs without core specialization.                                       |
| `test/phase5.test.js`          | Covers duplicate client IDs, invalid upgrade paths, and shared-server route isolation.                                                      |
| `test/phase7.test.js`          | Covers handler-signal cancellation and bounded global in-flight work.                                                                       |
| `test/pu04-security.test.js`    | PU-04 local security acceptance: handshake, roles, tenant isolation, generic protocol errors, redaction and rate/concurrency close codes. |
| `test/pu05-wss-proxy.test.js`  | PU-05 temporary TLS/WSS reverse-proxy loopback smoke: upgrade, cert trust, health/readiness, metrics, drain and restart; NOT a production proxy. |
| `test/load/clients.py`         | Async Python workload, response/fanout/reconnect checks, latency and resource report.                                                       |
| `test/load/pu06-target-template.json` | PU-06 data-only unapproved 4 GiB WSS deployment/workload/SLO readiness fields; deliberately no credentials or numerical SLO defaults. |
| `test/load/pu06-preflight.test.js` | PU-06 six offline Node tests for readiness blocking, unsafe URL/secret validation, workload/SLO sanity and CLI fail-closed behavior. |
| `test/requirements-load.txt`   | Pinned test-only Python WebSocket client dependency.                                                                                        |
| `package.json`                 | Package metadata, exports, Node floor, dependency and npmjs release whitelist/links.                                                        |
| `scripts/verify-npm-package.js` | Read-only exact npm pack dry-run manifest check; excludes development/CI/private files; never publishes. |
| `package-lock.json`            | Committed npm lockfile v3; resolves `ws@8.22.0` for reproducible installs.                                                                  |
| `.gitignore`                   | Keeps private `notes/` and generated `node_modules/` out of new Git tracking.                                                              |
| `.github/workflows/ci.yml`     | Read-only GitHub Actions CI: locked npm install, Node compatibility tests, dependency audit and required result gate (live run unverified). |

## Implemented Behavior

- Phase 1 centralized finite defaults and validation, enforced subscription authorization through both context and manager APIs, and fixed broadcast delivery count.
- Phase 2 introduced bounded origin/auth callback waits, the earlier timeout admission accounting, graceful async drain, optional global limits, injectable metrics, safe logging, and send-failure cleanup. **The earlier timeout-slot release policy was subsequently superseded by Phase 6**: timed-out provider work retains its pending-upgrade slot until it settles.
- Phase 3 verified that independent applications can configure auth headers, origins, identities, handlers and metrics through the same public `createEngine`/`register` APIs. Sample handlers remain outside transport core; `app.js` composes them.
- Phase 4 adds a repeatable Python-client loopback profile and a close-event metric. The final 1k and 2k local profiles passed their provisional thresholds, including the 2k reconnect waves; the helper server is outside Node's automatic test discovery.
- `npm test` passed 12 tests, 0 failures after Phase 4.
- Remediation Phase 5 rejects duplicate manager client IDs without mutating existing ownership and adds optional exact-path upgrade filtering for shared-server integrations. Three focused Phase 5 tests and the full 15-test suite pass.
- Remediation Phase 6 passes cooperative `AbortSignal`s to origin/auth callbacks, aborts them on timeout or engine stop, and retains the `maxPendingUpgrades` work slot until a timed-out provider settles. Existing 503 behavior is preserved; callback lifecycle tests and final suite results are recorded in the phase log.
- Remediation Phase 7 exposes a per-connection `ctx.signal`, aborts it on disconnect/error/engine stop, and bounds concurrent handler work across the engine with `limits.maxGlobalConcurrentMessages` (default 1024). Saturation closes only the submitting client with 1013; work remains counted until its promise settles. Focused tests pass 3/3; the full suite passes 20/20.
- Phase 8 enabled default-on aggregate guardrails of 500 inbound messages/second and 64 MiB pending sends, with per-engine overrides. A provisional 100-client/1KiB local loopback profile passed its delivery/latency targets; its 127.87% peak one-core CPU sample and non-target host mean it does not qualify the 4GB VPS.
- Production-update PU-04 adds **six local Node WebSocket security regression tests** for 401/403/500 handshake handling, missing Origin, protected group authorization, admin permissions, protocol error/redaction, and 1008/1013 close codes. Also corrected stale timeout slot-release wording in `docs/WEBSOCKET_PROTOCOL.md`. Engine, sample auth adapter, handlers, defaults and wire behavior are unchanged. Native-browser credentials and token rotation remain consuming-application responsibilities.
- Production-update PU-05 adds **two local HTTPS/WSS reverse-proxy integration tests** with ephemeral OpenSSL test-only certs on loopback: trusted/untrusted TLS, proxy path/Origin/auth decisions, sanitized forwarded headers, ping/pong, in-memory metric callbacks, test-owned readiness/liveness, graceful drain and WSS reconnect. It does **not** bundle production proxy/health/exporter/supervisor behavior, and real domain/host/WSS acceptance remains blocked by deployment decisions D-02/D-05/D-10. No engine/app/UI/auth/protocol changes.
- Production-update PU-06 adds an **offline-only** `load-test/pu06-preflight.js` and unapproved `test/load/pu06-target-template.json`, plus six negative/unit checks; it checks owner-approved topology, actual 4 GiB WSS host, workload and numerical SLO inputs but **never opens a socket or runs traffic**. No target host, workload, SLO or credentials were authorized; F-11/Phase 8 real 4 GiB capacity acceptance remains BLOCKED. Existing Python harness cannot test public WSS and was not run without Python.

## Phase 4 Local Scale Study

On Windows Server 2022 with Node `v26.12.0`, Python `3.12.0`, 4 logical CPUs, and 7.8 GiB installed RAM, the 1k profile recorded p95/p99 latency of 3.567/48.384 ms and 75.65 MiB peak RSS. The 2k profile recorded 12,001/12,001 responses, 10,000/10,000 broadcast deliveries, p95/p99 latency of 7.584/178.432 ms, 108.29 MiB peak RSS, 34.24 MiB peak heap, and successful 500-client reconnect waves in 1.160 s and 1.441 s. It ended with zero active connections and buffered bytes.

These are synthetic loopback results against provisional thresholds, not a production-supported concurrency guarantee. Application-specific traffic, deployment hardware, TLS/proxy path, production SLOs, and resource budgets are unknown.

## NPM-01 — Explicit One-Time npmjs Publication Approval (2026-11-17)

After the successful 34-test Node matrix, local GitHub runner load, npm consumer tarball smoke and full `Required CI gate` on GitHub commit `7380d50878fcbd03e8c504fefc7d09ebc928858e` (run 43947983458), the owner authorized an actual npmjs first publication of `configurable-websocket-engine@1.0.0` through a protected tag-only workflow. [`.github/workflows/publish-npm.yml`](../.github/workflows/publish-npm.yml) triggers **only** on `npm-v1.0.0`, verifies the exact tagged main SHA has a complete green CI push run, rechecks tests/whitelist/audit and uses existing Github org `NPM_TOKEN` for the **single publish step**, with provenance. The tag must not be pushed until the workflow-definition commit also passes its own GitHub CI. Actual npmjs registry publication and run result require subsequent verification; source code, UI, authentication and wire protocol are unchanged. Public library packaging is separate from real VPS hosting suitability.

## GH-01 — GitHub CI Publication and npmjs Packaging Preparation (2026-11-17)

User separately approved Git commit/push and execution of **read-only CI**, plus preparation (not publication) of the npmjs package. Current `package.json` retains `configurable-websocket-engine@1.0.0` with MIT, adds repository/bugs/homepage/keywords and strict `files` whitelist: engine runtime source, README, LICENSE and three API/protocol/configuration docs only. `scripts/verify-npm-package.js` checks dry-run contents and package/lock license/version parity. GitHub Actions additionally includes safely isolated **local runner** 100-client Python WebSocket profile, tarball install/import smoke and fail-closed required CI gate, alongside Node 20/22/24/26, security and WSS fixture tests. None of this is a 4 GiB production VPS qualification or permission to `npm publish`. Actual GitHub run and npm ownership/credentials are separate checks.

## PU-07 Final Release Gate (2026-11-17)

The documentation-only [production release audit](RELEASE_READINESS_AUDIT.md) reconciles F-01–F-13 and records an explicit **NO-GO**: corrected local docs/MIT/lockfile/security tests are not enough for release. GitHub Actions matrix has not run because the workflow is unpushed; there is no approved real WSS proxy/domain/operator readiness, no 4 GiB VPS workload/p95/p99/CPU/RSS SLO measurement and no tested rollback/operator sign-off. PU-07 is an **evidence-only NO-GO audit**; no engine, UI, authentication, protocol, package, CI, server or deployment change was made.

## Extension Boundaries and Remaining Work

The public root package export is `createEngine`; config/observability modules are internal. Supported extension callbacks include authentication, subscription authorization, logger and metrics. No external consumer requirements were supplied, so Phase 3 adds no store/pubsub/codec adapter or backend.

Per-IP/tenant **rate limits** remain deferred until a trusted proxy and tenant-identity contract are specified. The PU-04 tenant/group-isolation tests use a test-only, application-supplied subscription authorizer and do not add native tenant accounts, credential issuance, rotation, persistence or IP-policy features. The repository has no metrics backend, persistent store, or production-qualified concurrency number. Active aggregate defaults are guardrails, not capacity evidence. The Python load harness does not test TLS, reverse proxies, remote hosts, or a consuming application's actual traffic profile; separate PU-05 **loopback WSS proxy smoke tests** are only protocol/ops integration checks, not production host load qualification. PU-06 preflight validates **configuration completeness only**, not production performance. No license persistence/suspension/logout workflow or UI is implemented by this transport engine.

User setup, protocol, API, load-testing, and deployment guides are indexed in [../docs/README.md](../docs/README.md). Internal phase plans and readiness decisions are kept in the locally ignored `notes/` directory; those private files are **not** part of the public repository.
