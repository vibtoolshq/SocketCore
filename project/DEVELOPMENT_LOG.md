## 2026-10-28 - Phase 3: Reusable Extension Boundaries - Complete

- Confirmed the transport core does not import/register sample business handlers; the standalone `app.js` composes them.
- Added a public-API integration test for two independent app configurations with distinct auth headers, origins, identities, handlers, and metrics callbacks.
- Documented public callback contracts and explicitly deferred store/pubsub/codec adapters because no consuming-app need is specified.
- Verification: `npm test` passed 12 tests, 0 failures; exact phase scope/results are recorded in the phase completion log.
- No transport behavior, protocol, dependency, UI, or application business feature was changed.

## 2026-10-28 - Phase 4: Scale Qualification - Complete (provisional local profile)

- Resumed from the latest closed session after a forensic match of the session-store history, private plan, project records, and current source. Phase 4 approval was explicit; the session had stopped during the load harness syntax check.
- Repaired the Python workload/report, moved the temporary Node server to `load-test/server.js` so `node --test` does not auto-discover it, and added close-event measurement through the existing metrics callback.
- The final report includes response/fanout ratios, reconnect wave outcomes, p50/p95/p99 latency, peak RSS/heap/CPU/active connections/buffer use/event-loop lag, error counts, and post-drain connection/buffer gauges.
- 1,000-client profile: 5,999/5,999 responses; 5,000/5,000 broadcast deliveries; p95/p99 3.567/48.384 ms; peak RSS 75.65 MiB; no client/admin errors.
- 2,000-client profile: 12,001/12,001 responses; 10,000/10,000 broadcast deliveries; p95/p99 7.584/178.432 ms; two 500/500 reconnect waves in 1.160 s and 1.441 s; 0 client/admin/server-log errors and 0 request timeouts; peak RSS 108.29 MiB and heap 34.24 MiB; final active connections/buffered bytes 0.
- Verification: Python 3.12 syntax check and relocated-harness smoke profile passed; final `npm test` passed 12 tests, 0 failures; final 2k profile passed all provisional local targets and the server exited 0.
- Updated user load guide, docs index/manifest, project overview, phase completion log, implementation status, and roadmap. No production dependency, protocol change, remote host, or production capacity claim was added.
- Residual limitations: synthetic loopback workload only; real client payload/rate mix, deployment target, TLS/proxy behavior, resource budgets, and production SLO remain unknown. No production-supported N is claimed.

## 2026-10-28 - Documentation Completeness Pass - Complete

- Reconciled all user guides with `app.js`, engine modules, built-in handlers, package metadata, and tests.
- Corrected command response examples and documented the current close metric; expanded configuration validation, origin/auth policy, lifecycle, handler/manager contracts, and troubleshooting.
- Added `docs/PRODUCTION_DEPLOYMENT.md` to separate implemented engine behavior from TLS, secrets, proxy, monitoring, supervision, and workload-sizing responsibilities of the embedding application/operator.
- Expanded load-test CLI/report documentation and kept the measured loopback results explicitly provisional; no production readiness or supported concurrency guarantee is stated.
- Updated docs index/manifest and synchronized private status/roadmap notes. No code, protocol, dependency, or deployment behavior changed.
- Verification: `npm test` passed 12 tests; Markdown local links and docs manifest inventory checked.

## 2026-10-28 - GitHub-Ready SocketCore Documentation - Complete

- Audited the repository Markdown inventory, package metadata, implementation guides, and supplied Vib Tools company/author master context.
- Added root `README.md` with SocketCore description/tagline, source-verified feature inventory, quick start, protocol/API examples, defaults, maturity caveats, contacts, and license status.
- Added `AUTHORS.md`, `CONTRIBUTING.md`, `SECURITY.md`, and `SUPPORT.md` with verified contact routes and no unsupported legal/executive titles, license claims, certifications, or response-time commitments.
- Branded the existing docs/project landing pages and guide headings consistently; preserved the package metadata name `configurable-websocket-engine` and user edits in the API/load guides.
- The repository has no `LICENSE` file; README/contribution docs explicitly identify this release blocker rather than selecting a license without owner approval.
- Search discoverability wording is descriptive and natural; no Google indexing/ranking guarantee is claimed.
- Verification: `npm test` passed 12 tests; local Markdown links and direct-child manifest inventories are checked before completion.

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
- At Phase 2 completion, per-IP/tenant protection remained deferred pending trusted-source assumptions and aggregate limits were disabled by default. Phase 8 later enabled configurable aggregate guardrails; no supported concurrency claim is made.

## 2026-10-28 - README Visual Redesign - Complete

- Reorganized the root SocketCore README around a GitHub-rendered animated hero, Mermaid architecture flow, quick start, and a capability-to-behavior-to-usage map.
- Added original `assets/socketcore-message-flow.gif` (960x380, 12 distinct frames, 140 ms per frame, looping) and its reproducible Pillow-based generator `assets/generate_message_flow.py`.
- Preserved verified package identity, protocol examples, configuration defaults, license status, author attribution, and the provisional-only load-study caveat. No CSS/JavaScript animation or copied artwork is used.
- Verification: GIF dimensions/frame count/duration/loop checked; README local links resolve; `npm test` passed 12 tests, 0 failures.

## 2026-10-31 - Remediation Phase 5: Registry Integrity and Upgrade Routing - Complete

- Rejected duplicate `connectionManager.add(clientId, ...)` calls with the existing `null` failure result before registry mutation; existing client and group ownership remain intact.
- Added optional library-level `path` pathname filtering. Missing `path` preserves existing behavior; nonmatching requests are left to other upgrade listeners, and the host owns final unmatched-upgrade handling.
- Added focused regression tests for duplicate-ID preservation, invalid path configuration, and two differently routed engines attached to one HTTP server.
- Updated the engine API/configuration guides and project overview. No standalone app environment variable, protocol, UI, authentication, or unrelated feature changed.
- Verification: focused Phase 5 tests passed 3/3; `npm test` passed 15/15.

## 2026-10-31 - Remediation Phase 6: Upgrade Callback Lifecycle - Complete

- Extended async authentication and function-valued origin callbacks with trailing `AbortSignal` options while preserving compatibility with callbacks that ignore extra arguments.
- Callback timeout aborts its signal and preserves HTTP 503. Engine stop aborts active callbacks and preserves the 503 stopping response.
- Retained each upgrade's `maxPendingUpgrades` work slot until the underlying callback promise settles, including after timeout; a non-cooperative provider therefore cannot cause unbounded concurrent callback work.
- Added tests for authentication timeout signal/accounting/recovery, origin timeout abort, and engine-stop cancellation/status.
- Updated API/config guides, project overview, and private phase/status/error records. No app environment settings, auth providers, message protocol, handler lifecycle, UI, or unrelated features changed.
- Verification: focused `test/phase2.test.js` passed 9/9; full-suite results are recorded in the private phase completion log.

## 2026-10-31 - Remediation Phase 7: Message Handler Lifecycle - Complete

- Added `limits.maxGlobalConcurrentMessages` with a finite default of 1,024 and library override support. It is not exposed as a new standalone environment variable.
- Added per-connection `ctx.signal`, aborted on WebSocket close/error and when `engine.stop()` starts. Existing `(ctx, message)` handler and wire protocol remain unchanged.
- When the engine-wide in-flight budget is full, the submitting client is closed with 1013 and a low-cardinality drop metric is emitted. The global work slot remains reserved until the underlying dispatch promise settles, even after disconnect/abort.
- Added focused tests for limit validation, disconnect/reconnect work accounting and recovery, and shutdown cancellation.
- Updated API/config/user guides, project overview, and private phase/status/error records. No app environment settings, auth behavior, protocol, UI, or unrelated features changed.
- Verification: focused tests passed 3/3; full-suite results are recorded in the private phase completion log.

## 2026-10-31 - Phase 8: Default-On Guardrails and Provisional Local Trial - Partial

- Enabled shared aggregate defaults: 500 inbound messages/second and 64 MiB total pending-send bytes. Each remains configurable per engine; library consumers can explicitly use `Infinity` to opt out.
- Added `--payload-bytes` to the existing test-only load harness, defaulting to a 1,024-byte application field in status requests/broadcasts and included in the JSON report.
- Ran the accepted provisional profile: 100 clients, 1 admin, 10-second client/admin intervals, 20 connects/second ramp, 60-second soak, and two 25-client reconnect waves.
- Result: 601/601 responses, 500/500 broadcasts, p95/p99 2.842/42.927 ms, 0 errors/timeouts, reconnect 25/25 twice; peak RSS/heap 52.64/9.43 MiB, peak sampled one-core CPU 127.87%, maximum sampled event-loop-lag mean 38.322 ms.
- Environment: local loopback, Windows Server 2022, Node `v26.12.0`, Python `3.12.0`, 4 logical CPUs, 8.39 GB installed RAM. Not the target 4GB VPS; the nonzero CPU sample confirms load is not zero.
- Verification: `npm test` passed 20/20; load harness syntax, CLI help, and provisional 100-client profile passed.
- No license-specific storage/workflows, UI, auth flow, message protocol, app environment settings, dependency, or deployment behavior changed.

## 2026-11-08 - Forensic Continuation and Status Reconciliation

- Compared the supplied closed-session transcript with current engine defaults, callback/handler safeguards, focused tests, load-test evidence, project records, and user-facing configuration/load guides.
- Confirmed Phases 5-7 are recorded complete; Phase 8 default-on guardrails and the provisional local profile are recorded complete, while production/VPS qualification remains blocked pending target workload, deployment/runtime/TLS-proxy topology, resource budget, and SLO.
- Corrected the project overview snapshot statement to include the Phase 8 provisional work and its blocked production qualification.
- The user confirmed retaining finite safety defaults and requested no new implementation when approved updates are complete. No runtime source, tests, protocol, UI, or deployment behavior changed.
- Verification limitation: this audit's test runner found no tests for the supplied Windows absolute paths; the prior 20/20 result remains the historical Phase 8 record and was not freshly reproduced.
- Production qualification remains blocked pending target VPS CPU/OS/Node/TLS-proxy topology, resource budget, representative production event/payload/fanout/churn, and production SLOs.

## 2026-11-08 - Production Readiness Audit

- Audited current engine modules, standalone composition, handlers, package metadata, tests, load-test guide/evidence, and project/deployment documentation.
- Fresh `npm test` run passed 20/20 tests, 0 failures, in approximately 0.99 seconds. This validates the current worktree's regression tests only; it is not a production load or deployment qualification.
- Corrected `docs/PRODUCTION_DEPLOYMENT.md` to distinguish the standalone app's unrestricted path behavior from the library's optional `path` filter.
- Readiness conclusion: the engine is usable as a transport component after per-app security/configuration and target-environment validation; this repository/sample deployment is not certified production-ready. No production workload/SLO, TLS/proxy run, target-host test, dependency/security scan, or cross-version Node matrix was established in this audit.
- No runtime, protocol, UI, application-business, or deployment behavior changed.

## 2026-11-17 — PU-01 Documentation Contract Reconciliation — Complete (local, uncommitted)

- **User-approved scope:** README and tracked project-doc corrections for F-01–F-05; matching config/API guides only if a genuine mismatch was found; scoped private notes. Previous branch baseline: `main@55863d581903e64eec787d373524e878f7a31f7c`, clean worktree, matched `origin/main`.
- **README.md:113:** Corrected aggregate pending-send cap from misleading “optional” wording to **enabled by default**, configurable and rejecting only the over-limit send without evicting the receiver (F-04).
- **README.md:115:** Corrected callback deadline wording. Timeout aborts callback signals; work from a non-cooperative provider retains the pending-upgrade slot **until the provider settles**, as implemented in `engine/index.js:186-194,448` (F-02).
- **README.md:197:** Fixed incorrect `Infinity` default claim. Actual defaults: 500 inbound messages/second, 64 MiB aggregate pending sends, and library global handler concurrency 1024; library explicit `Infinity` opt-out is still documented. Source: `engine/config.js:6,11-12` (F-01).
- **README.md:207:** Replaced stale 12-test “current” claim with as-of-2026-11-16 20-pass statement and instruction to rerun the suite (F-03).
- **project/PROJECT_OVERVIEW.md:44–49,67:** Labeled Phase-2 timeout accounting as historical and superseded by Phase-6 accounting. Replaced invalid `../notes/PRODUCTION_READINESS_ROADMAP.md` pointer with accurate statement that current private notes are ignored and not present on GitHub (F-05).
- **Focused post-patch audit:** Reviewed exact two-file tracked diff; `docs/CONFIGURATION.md` and `docs/ENGINE_API.md` independently describe active defaults and callback semantics correctly, so neither was touched. No broken local links in either edited public Markdown; `git diff --check` successful. Expected source SHA-256 unchanged: `engine/index.js 5676B55FC3F80A83C214ACAE14DDF37A47EB8D1B219FE3FCA9552E8089CE9B25`; `engine/config.js 44B1915D03430C71B9917E9605DB8C4BA1BBD4E6E2B3DA08E26392736A622E6D`.
- **One fresh full regression:** `npm test` executed on Windows local repo with Node `v24.22.1`: **20 passed, 0 failed, 0 skipped, exit code 0** (run 2026-11-17).
- **Scope integrity:** No `engine/`, `handlers/`, `app.js`, `test/`, package/dependency, workflow, auth, protocol, UI or deployment changes. No tracked files added/removed/renamed; `project/MINIFEST.md` and `docs/MINIFEST.md` do not need inventory edits.
- **Release/branch state:** Working changes intentionally left uncommitted; no Git commit, push, tag, CI run or production deployment authorized by this phase. These documentation repairs do **not** make SocketCore production-ready.
- **Finding closure:** F-01–F-05 **CLOSED locally**, pending any later remote publication; F-06–F-13 retain their previously documented decision/acceptance scope.
- **Progress:** PU-01 **COMPLETE (1/7)**; **6/7** implementation phases remaining. **Next: PU-02** governance, root-license owner decision and clean-install/dependency tracking; exact Scope Lock in `notes/PRODUCTION_UPDATE_ROADMAP.md`. Owner decision D-01 blocks full PU-02 closure if undecided.

## 2026-11-17 — PU-02: Repository Governance and Reproducible Dependency Hygiene — PARTIAL (F-07 fixed locally; F-06 blocked)

- **Authorization/Scope Lock:** Approved PU-02 F-06/F-07 only; preserve unfinished/uncommitted PU-01; no runtime/UI/backend/handler/protocol/auth changes, dependency upgrade, Git commit/push/tag or release. User expressly prohibited selecting any project license without their approval.
- **Entry:** `main` and local `origin/main` both `55863d581903e64eec787d373524e878f7a31f7c`. Existing PU-01 working tree modifications were `README.md`, `project/PROJECT_OVERVIEW.md`, `project/DEVELOPMENT_LOG.md`, all retained. Initially **20 tracked `node_modules` files**, root `.gitignore` only `notes/`.
- **F-07 fix:** Added `node_modules/` to `.gitignore` without altering `notes/`. Ran `git rm --cached -r -- node_modules`, resulting in **exactly 20 staged Git-index deletions**, zero still tracked under `node_modules/`, with the original local `node_modules/ws/index.js` present and its SHA-256 unchanged (`924564D5BE26D59B9682C4263F68320E48DDE7240BD2D1AD17EC305537429DD2`). No physical dependency file was deleted.
- **Lockfile/source metadata:** `package.json` still declares `ws ^8.18.3`; tracked `package-lock.json` v3 pins `ws@8.22.0` with npm integrity field. Neither package file was modified; no dependency upgrade.
- **Isolated verification:** In a disposable local Git clone of the frozen HEAD (outside the project), ran `npm ci --no-audit --no-fund --fetch-retries=1 --fetch-timeout=20000` successfully (**exit 0**; installed one package, `ws@8.22.0`). Ran `npm test` in that clean clone: **20 passed, 0 failed, 0 skipped, exit 0**, Node v24.22.1, ~1.95s Node test duration. Confirmed original package and lockfile hashes and installed ws file unchanged. Removed the temporary clone after the successful verification. No security audit was claimed; PU-03 covers CI/security.
- **Documentation corrections:** Root `README.md` Quick Start and `docs/USER_GUIDE.md` Install now recommend deterministic `npm ci` from the committed lockfile, explain that `npm ci` replaces node_modules in its own working directory, and reserve `npm install` for explicit dependency updates. `project/PROJECT_OVERVIEW.md` now inventories the tracked lockfile, root ignore policy, and clarifies the project-root license is **undecided**, distinct from the dependency's MIT license.
- **Focused forensic patch audit:** Reviewed index-only removals (20/20 dependency paths) and allowed unstaged docs/ignore changes; `git diff --check` and `git diff --cached --check` both exit **0**. No engine/app/handlers/tests or package file changed. Existing PU-01 docs corrections remain in the unstaged working tree. `project/MINIFEST.md` and `docs/MINIFEST.md` inventories unchanged (no direct child added/removed).
- **F-06 governance blocker:** Project-root `LICENSE` absent. User did **not** select proprietary/public/open-source distribution terms; no license was created or assumed. **F-06 remains BLOCKED pending owner decision D-01**. A package dependency's MIT license does not grant a license to SocketCore itself.
- **State:** F-07 **RESOLVED LOCALLY** (index removal staged; ignore/docs unstaged); F-06 **BLOCKED/OWNER DECISION**. Overall PU-02 **PARTIAL, not counted as complete**. **PU-01 COMPLETE (1/7), PU-02 PARTIAL, PU-03–PU-07 NOT STARTED (5); six phases not fully complete.**
- **Remote/release:** HEAD unchanged at `55863d5`. No Git commit, push, release, publish or GitHub Actions run. GitHub still contains the original tracked dependency files until future separately approved commit/push.
- **Next:** PU-03 optional independent GitHub Actions CI implementation after separate user approval. Planned `.github/workflows/ci.yml`: PR/push/manual triggers, read-only token, locked `npm ci`, Node version matrix, `npm test`, dependency security checks and CI evidence. F-06 still blocks **PU-02 full closure and PU-07 release** until owner selects terms; DO NOT silently mark licensing resolved.

## 2026-11-17 — PU-02 F-06 owner licensing decision approved — MIT (local)

- Owner explicitly requested MIT licensing and a free/open-source SocketCore project during PU-03 authorization; supersedes prior F-06/D-01 "license undecided" status.
- Added canonical root `LICENSE` (MIT, © 2026 Md Nurnobi based on tracked `AUTHORS.md` author attribution), `package.json` `license: MIT` and aligned `package-lock.json` root package metadata. No dependency version, scripts, exports, runtime behavior, wire protocol, access control or default configuration changed.
- Corrected root README, `CONTRIBUTING.md` and `project/PROJECT_OVERVIEW.md` licensing text, distinguishing this project license from `ws`'s independent MIT license.
- Local clean `npm ci` verified package/lockfile license parity and `ws@8.22.0`. F-06 **CLOSED LOCALLY**; prior PU-02 dependency hygiene F-07 remains preserved. PU-02 now **COMPLETE LOCALLY**, uncommitted/unpushed. Rights of third-party code remain separately governed.

## 2026-11-17 — PU-03 GitHub Actions CI implementation — LOCAL PATCH VERIFIED, LIVE RUN PENDING

- **User approval / Scope Lock:** `notes/PRODUCTION_UPDATE_ROADMAP.md` PU-03 and `notes/PU-03_IMPLEMENTATION_AUDIT.md`; no Git commit/push/tag, release or deployment. All PU-01/PU-02 changes and 20 staged vendor untracks retained.
- **New workflow:** `.github/workflows/ci.yml`, triggers on PR to `main`, push to `main`, and manual `workflow_dispatch`. GitHub-hosted Linux Node `20,22,24,26` matrix; Node 20 kept for `engines.node >=20` backward compatibility though Node 20 is EOL. Official `actions/checkout` v7.0.1 SHA `3d3c42e5aac5ba805825da76410c181273ba90b1` and `actions/setup-node` v7.1.0 SHA `949feb2413d6458794dcd2491c4babbbce0c15c1`, both verified from official Git remote tags on 2026-11-17.
- **Workflow security:** read-only `contents: read` token, `persist-credentials: false`, `package-manager-cache: false`, no secrets/elevated `pull_request_target`, release or deploy. Finite job timeouts; concurrency cancellation; matrix `fail-fast: false`.
- **Workflow checks:** `npm ci --no-audit --no-fund`, `node --check` of 9 first-party JS entrypoints, `npm test` in each Node matrix job; independent Node 26 production dependency check `npm audit --omit=dev --audit-level=high`; fail-closed `ci-gate` summarizes upstream status and fails unless both jobs succeeded.
- **Documentation:** Added tracked `docs/CI_TESTING.md`, indexed it in `docs/README.md` and `docs/MINIFEST.md`; corrected root README CI overview and `CONTRIBUTING.md` CI reference.
- **One focused static YAML verification:** Parsed workflow with a cached local `js-yaml` parser; checked trigger keys, four Node matrix versions, pinned immutable action SHAs, read-only token, `npm ci`, `npm test`, security audit and fail-closed gate. **EXIT 0**.
- **One isolated local CI-equivalent run:** disposable local Git clone of frozen HEAD with current working `package.json` and `package-lock.json` overlay; `npm ci` **exit 0**, metadata/license `MIT` parity **pass**, installed `ws@8.22.0`, `node --check` **9/9 pass**, `npm test` **20 passed, 0 failed, exit 0**, `npm audit --omit=dev --audit-level=high` **0 vulnerabilities, exit 0**. Original installed ws/package/lockfile unchanged; temporary clone deleted. This validates one **Windows Node v24.22.1** environment, not the 4-version Linux GitHub matrix.
- **Phase readiness:** Implementation complete **locally**. No GitHub Actions run ID, status check or live matrix acceptance exists because commit/push expressly forbidden. Under documented PU-03 exit criteria, **mark PU-03 PARTIAL / LIVE CI ACCEPTANCE PENDING**, not production-ready or GitHub green. No actual GitHub branch-protection rule configured.
- **Counts:** PU-01 and PU-02 **COMPLETE LOCALLY (2/7)**; PU-03 **PARTIAL (implementation ready, GitHub run pending)**; PU-04..PU-07 **NOT STARTED (4)**. Five phases not fully closed; remaining F-08–F-13 production/security/operations gates as applicable, including F-12 live acceptance.
- **Next approved phase:** None implicitly. PU-04 tests and auth/protocol contract checks may begin only upon separate user approval; designed to preserve existing engine/UI/wire/auth default behavior and not add license business features. No commit/push/tag/release.

## 2026-11-17 — PU-04 Security Acceptance and Protocol Documentation — Local Regression PASS

- **Authorization/Scope:** User approved Phase PU-04 authentication, Origin, role/group authorization, WebSocket protocol and error-path negative acceptance tests, with exact Scope Lock and forensic patch audit. PU-01–PU-03 changes preserved. No authentication redesign, runtime/UI/backend feature, Git commit/push, tag/release or real network deployment authorized.
- **Baseline:** `main` and local `origin/main` both `55863d581903e64eec787d373524e878f7a31f7c`. Previous PU-01/02 tracked docs, MIT `LICENSE` and package metadata, PU-03 workflow and 20 **staged index-only vendor removals** were present and left untouched.
- **Only new test file:** `test/pu04-security.test.js` — 6 focused Node built-in `node:test` / existing `ws` local-loopback integration cases:
  1. `test/pu04-security.test.js:115`: Origin 403 precedes authentication; missing/invalid credentials 401; absent Origin contract acceptance; app-defined denial of new handshakes after credential revocation in its own test Set (does not terminate already accepted clients).
  2. `:147`: unexpected auth provider exception rejects upgrade HTTP 500 and sanitized engine log never includes the secret error marker.
  3. `:163`: default group subscription deny via both manager and context; test-only authorized tenant-group membership and publish separation; authorizer exceptions fail closed without leaking sensitive error text.
  4. `:213`: invalid JSON `BAD_JSON`, invalid/missing type `BAD_MESSAGE`, missing handler `UNKNOWN_TYPE`, thrown handler `HANDLER_FAILED`; raw exception message excluded from wire and engine logs.
  5. `:235`: non-admin status snapshot/broadcast and command broadcast/shutdown blocked with `FORBIDDEN`, unknown command yields `BAD_COMMAND`; protected target remains open; admin snapshot still succeeds.
  6. `:274`: per-client rate policy WS close **1008**, in-flight concurrency limit WS close **1013**, as already implemented.
- **Focused test command:** `node --check test/pu04-security.test.js` exit 0; `node --test test/pu04-security.test.js`: **6 passed, 0 failed, 0 skipped, exit 0**; test runner duration 477.917445ms.
- **Full suite:** `npm test` on Windows Node `v24.22.1`: **26 passed, 0 failed, 0 skipped, exit 0**, runner duration 2548.814723ms. This is local, not actual GitHub Actions, native browser, WSS proxy, credential lifecycle or target VPS acceptance.
- **Newly observed in-scope docs mismatch corrected (no code change):** `docs/WEBSOCKET_PROTOCOL.md:24,81` had incorrectly stated pending upgrade slots are released *at* timeout. Source `engine/index.js:186-194` instead holds a pending-upgrade slot until provider settlement while returning HTTP 503 and aborting cooperative callback signal. Corrected both references. Clarified `docs/WEBSOCKET_PROTOCOL.md:92` that engine-wide concurrent-message overload may also close with WS 1013. Clarified native browser cannot supply arbitrary `x-auth-token` handshake header, and engine has no native token issuance/rotation/revocation.
- **Deployment boundary:** `docs/PRODUCTION_DEPLOYMENT.md` now explicitly describes local PU-04 test coverage, Node `ws` client vs native browser limitation, static sample auth, group/tenant example and need for consuming-app credential decisions. No standalone production implementation or WSS/proxy verification added.
- **Project inventory:** `project/PROJECT_OVERVIEW.md` source inventory/implemented behavior updated with new test file and exact limitation. No direct-child additions/removals in `project/` or `docs/`; their respective `MINIFEST.md` inventory files remain accurate and unchanged.
- **F-09:** only **security contract acceptance partially verified for application-defined Node header clients**; sample `app.js:24-41,59-65` still uses static env tokens and no expiry/rotation/revocation. Browser credential design D-03 remains pending, **not fixed**.
- **F-13:** intentional default-deny subscription independently proven, authorized tenant-policy integration demonstrated in test only. No allow-all, no tenant database, no policy implementation was inserted in app. **Secured default verified; application subscription contract D-04 remains conditional**.
- **Behavior preservation:** Engine, handler modules, sample app, package/dependency versions, MIT license, UI, public API and WebSocket wire behavior unchanged; no Git push/commit/tag/release. GitHub CI remains source-implemented locally but has no actual live run; historical Phase 8 target VPS/WSS/SLO qualification remains pending.
- **Phase verdict:** PU-04 **LOCAL ACCEPTANCE COMPLETE**, with conditional browser/credential/deployment integration gates clearly OPEN. PU-01, PU-02, PU-04 locally complete (**3/7**); PU-03 source implemented but **PARTIAL pending real GitHub run**; PU-05–PU-07 NOT STARTED (**3**) — **4/7 not fully closed**. Release still NO-GO.
- **Next PU-05:** Under a *new* user approval and deployment-model decision D-02/D-05/D-10, scope WSS/TLS/real reverse-proxy upgrade, DNS/cert, trusted proxy headers, health/log/monitoring, credential injection/rotation ownership, drain/restart/smoke and operations runbook. **No unapproved change to engine, UI, protocol or security defaults.**

- **PU-04 final patch scope audit (2026-11-17):** PASS — HEAD unchanged `55863d5`, 12 cumulative changed tracked Markdown/config-metadata paths all approved across PU-01–PU-04, 20 staged vendor-only untracks from PU-02, four expected untracked files (three PU-03 + one PU-04 security test); 0 unexpected changes. Seven original engine/handler/app source SHA-256 hashes unchanged, MIT and lockfile parity intact, `git diff --check` / cached check exit 0, tracked docs links and all 15 private notes links/fences valid. New test file has six tests. No Git commit/push/tag/release.

## 2026-11-17 — PU-05: WSS/Proxy/Readiness/Monitoring Operations — LOCAL PATCH VERIFIED, REAL TARGET BLOCKED

- **User authorization / scope lock:** Implement/verify PU-05 WSS/TLS, reverse proxy, health, monitoring and operations readiness; first audit target/deployment model, **no live VPS changes without separate explicit approval**, preserve all PU-01–PU-04 changes, unchanged existing engine/UI/auth/wire/protocol behavior; no Git commit/push/tag/release.
- **Baseline and environment:** Local `main` and `origin/main` remain `55863d581903e64eec787d373524e878f7a31f7c`; Windows development PC Node v24.22.1, npm v11.19.1, Git for Windows OpenSSL v3.5.9. No tracked `deploy/` or `ops/` production integration; standalone `app.js` uses plain HTTP (F-08), and library `createEngine` attaches to application-owned HTTP(S) server. Previous discussion contemplated embedding SocketCore into an existing HTTPS consumer application, but this is **not** an explicitly approved production SocketCore deployment. D-02 target model, D-05 target VPS/proxy/domain/resources, D-10 monitoring/supervision owner remain UNDECIDED. No live host was touched.
- **Only new test file:** `test/pu05-wss-proxy.test.js` (381 lines), Node built-in `node:test`, `http`/`https`/`net` and existing `ws` package, **loopback `127.0.0.1` only**. Each test generates an ephemeral 1-day self-signed test certificate with OpenSSL CLI, stores test private key under OS temp, removes it at end; **no certificate/key committed**. It includes a **test-only** HTTPS reverse proxy and separate plain HTTP WebSocket backend, not deployable Caddy/Nginx/server code.
- **Focused test 1:** strict client TLS certificate validation succeeds only when trust bundle explicitly contains test cert; default trust rejects untrusted cert without insecure overrides. Proxied WSS `/socket` upgrade, auth 401, disallowed Origin 403, wrong upgrade path 404, forged `X-Forwarded-*` header scrubbing and trusted `X-Forwarded-Proto: https` insertion, bidirectional data and ping/pong, metrics callback and sanitized log no token all passed. Engine unchanged.
- **Focused test 2:** fixture's `/health` reports test proxy liveness 200; fixture's `/ready` probes test backend readiness 200, returns 503 when backend unavailable; proxy rejects upgrade 503 while backend offline. `engine.stop()` drains original client with WS 1001; a **new** engine/backend can restart behind same local proxy and reconnect to WSS with working message exchange. Test helper routes are NOT added to SocketCore or `app.js`.
- **Focused verification:** `node --check test/pu05-wss-proxy.test.js` exit 0; `node --test test/pu05-wss-proxy.test.js` **2 passed, 0 failed, 0 skipped, exit 0**; Node runner duration 1557.372236 ms.
- **One full regression:** `npm test` **28 passed, 0 failed, 0 skipped, exit 0**, Windows Node v24.22.1; Node runner duration 3370.283933 ms. Original PU-04 6 security and historical 20 correctness tests remain green.
- **Public docs:** `docs/PRODUCTION_DEPLOYMENT.md` now records the exact test-only scope, local invocation, ephemeral key handling and explicit production runbook covering target topology choice, public TLS/cert renewal, proxy upgrade & forwarded-header trust, live accepted/rejected handshakes, credential issuance/rotation, separate health/readiness ownership, callback-to-exporter metrics, RSS/CPU/lag/connection/buffer alerts, bounded drain/restart, recovery and sanitized evidence. `docs/CI_TESTING.md` notes OpenSSL CLI fixture prerequisite. `project/PROJECT_OVERVIEW.md` inventories test harness and corrects the distinction between local WSS smoke and real host load. No additional docs/project direct child, so no MINIFEST updates required.
- **F-08 / F-12:** F-08 plain HTTP sample **not converted to WSS**, by Scope Lock; tested composable library behind temporary HTTPS proxy on loopback only. F-12 operational hooks **tested locally but no production metrics exporter, alerts, health routes, secret manager, supervisor or monitored host implemented**. Both real deployment acceptance gates **BLOCKED**, not CLOSED. F-09 browser auth contract and F-13 consuming-app tenant authorizer decisions unchanged. Real GitHub Actions PU-03 run remains pending because no push authorized.
- **Security/behavior preservation:** Engine/app/handlers/UI, MIME/wire message behavior, authentication defaults, token representation, MIT license, `package.json`, lockfile, previous workflows unchanged. No public ports, DNS/domain, Caddy/proxy, remote VPS or persistent cert/key modification. Existing PU-02 Git-index-only 20 vendor removals preserved and source dependencies remain installed locally.
- **PU-05 verdict:** **PARTIAL — local test-only smoke and deployment runbook completed, target environment acceptance BLOCKED D-02/D-05/D-10**. PU-01/PU-02/PU-04 locally complete (3/7); PU-03 live GitHub CI pending and PU-05 target WSS/ops pending; PU-06/PU-07 not started (4/7 not fully accepted). **Release remains NO-GO**.
- **Next PU-06:** Requires **new explicit approval**, verified real target 4 GiB VPS/topology, authorized WSS endpoint and client credential path, representative rates/payload/fanout/churn and owner-approved numerical latency/error/RSS/CPU SLOs; otherwise only prepare local load profiles and mark real qualification BLOCKED. Do not claim a supported concurrency number from loopback smoke tests, run against live VPS automatically or change engine configuration to improve synthetic scores.

- **PU-05 final forensic audit:** PASS, 2026-11-17. Frozen HEAD and local `origin/main` unchanged at `55863d5`. Exactly 12 cumulative approved unstaged tracked paths, 20 prior PU-02 staged vendor-only untracks and 5 expected untracked files (including only new PU-05 `test/pu05-wss-proxy.test.js`); **0 out-of-scope paths**. Seven engine/app/handler source SHA-256 hashes unchanged; MIT, package/lock `ws@8.22.0`, PU-03 CI and PU-04 tests preserved. Both `git diff --check` commands exit 0, public/private Markdown links/fences valid (16 ignored notes); no generated test key directories remain. Focused **2/2** and full **28/28** tests exit 0; no real VPS/WSS/CI/release work, PU-05 real-target acceptance still BLOCKED.

## 2026-11-17 — PU-06: 4 GiB VPS Capacity/Failure Qualification — OFFLINE PREPARATION VERIFIED, TARGET BLOCKED

- **User approval & Scope Lock:** PU-06 target VPS/WSS/proxy workload, latency/CPU/RAM/reconnect/failure qualification; **audit decisions first** and if no approved target, implement **offline-safe load-test preparation only**; preserve PU-01–PU-05 and existing engine/UI/auth/protocol; no Git commit/push, VPS modification, tag/release.
- **Entry findings:** `main` and local `origin/main` both `55863d581903e64eec787d373524e878f7a31f7c`. Previous uncommitted PU-01/02 docs + MIT license/package metadata, PU-03 GitHub Actions workflow, PU-04/05 tests and 20 PU-02 staged **Git-index-only** vendor removals preserved. Local environment Windows Node v24.22.1 / npm v11.19.1. Python executable `python`/`py` **not available** on connected machine, so historical `test/load/clients.py` was **not run**.
- **Blocked owner decisions:** D-02 actual embedded-library vs standalone model; D-05 exact target 4 GiB VPS CPU/OS/Node, valid public WSS/proxy/cert/credentials and supervision; D-06 representative real payload/rate/connection/fanout/churn/failure workload; D-07 numerical p95/p99/error/CPU/RSS/event-loop lag/recovery budgets; D-10 health/exporter/rollback ownership. No approved target endpoint or SLO was supplied. PU-03 actual GitHub CI run and PU-05 real WSS/operations acceptance remain pending; therefore **NO live load test**.
- **New safe preparation only:** `test/load/pu06-target-template.json` data-only configuration with `null` unset target/workload/SLO and `DRAFT_UNAPPROVED`; `load-test/pu06-preflight.js` pure Node JSON validator **without network, server, client or VPS connections**, requires reviewed public WSS topology/4 GiB target, owner approval, workload and numeric SLOs; rejects unsafe WSS schemes/private/local hosts/query/credentials, embedded secret keys, invalid clients/reconnect/failure scenarios and incomparable resource/latency/SLO ranges. Its output never includes submitted credential or endpoint values, reports `BLOCKED` or `READY_FOR_MANUAL_REVIEW`, and **`mayRunLoad` always false**. It cannot execute a benchmark even if all fields validate.
- **Tests:** `test/load/pu06-preflight.test.js` adds six Node built-in unit/negative tests for unapproved template blocking, filled synthetic fixture **review-only**, unsafe URL/secret rejection, 4 GiB/workload/SLO validation, offline CLI fail-closed and invalid/missing inputs. No new npm packages, no remote URL visits. No real performance/latency/CPU/RAM/reconnect samples were collected or invented.
- **Focused verification:** syntax checks on new preflight and test file exit **0**; `node --test test/load/pu06-preflight.test.js` **6 passed, 0 failed, 0 skipped, exit 0**, duration_ms **528.34201**. `node load-test/pu06-preflight.js --check test/load/pu06-target-template.json` correctly reported **`BLOCKED`**, `mayRunLoad: false`, with expected **exit code 2** (blocked, not test failure); CLI wrapper checked exit code 2 explicitly and exited 0.
- **One full regression:** `npm test` on Windows Node v24.22.1 **34 passed, 0 failed, 0 skipped, exit 0**, duration_ms **4693.216317**. Existing historical 20 + PU-04 security 6 + PU-05 WSS/proxy 2 remain green. No Python load harness, no target VPS/WSS traffic, no production benchmark.
- **Public documentation:** `docs/LOAD_TESTING.md` now documents safe preflight use/exit codes, owner decisions for real 4 GiB WSS traffic and quantitative SLOs, never-run semantics and required actual host/resource evidence; clarifies original Python harness spawns its **own local `ws://127.0.0.1` server** and cannot test an external WSS proxy. `docs/PRODUCTION_DEPLOYMENT.md` links qualification gate; `project/PROJECT_OVERVIEW.md` adds 3 new file inventory entries and explicit F-11 local readiness vs host-capacity distinction. No `docs/` or `project/` direct child was added/removed, so their `MINIFEST.md` inventories remain accurate.
- **F-11/Phase 8:** 4 GiB real target capacity **NOT MEASURED — BLOCKED**. Local Node preflight checks configuration only, historical 100/1000/2000 synthetic profiles are **not new evidence** and cannot justify a supported connection count or production SLO. Phase 8 remains PARTIAL; PU-06 classification **PARTIAL (offline preparation complete; target qualification blocked)**. No engine, app, handlers, public API, token/auth, UI, defaults, protocols, CI workflow, MIT or dependency changes.
- **Status:** PU-01/02/04 fully locally complete **3/7**; PU-03 awaiting real GitHub CI, PU-05 awaiting actual WSS host acceptance, PU-06 awaiting target workload/SLO acceptance, PU-07 NOT STARTED — **4/7 not fully accepted**. Production release **NO-GO**.
- **PU-07 next:** Requires **separate** approval for forensic release-gate review; conduct document-only GO/NO-GO evidence audit if real GitHub CI and target VPS/SLO/operations evidence remain unavailable. Do NOT auto-commit/push/tag/release or report GO, and require owner sign-off/rollback plan plus a fresh actual protected-environment verification before release.

- **PU-06 final forensic patch audit (2026-11-17):** PASS. Git HEAD/local origin unchanged `55863d5`. 13 cumulative approved unstaged tracked paths, 20 previously staged Git-index-only vendor removals, 8 expected untracked files (3 new PU-06, 5 preserved previous phases), **0 unauthorized paths**. All 7 runtime source hashes unchanged; MIT/package lock `ws@8.22.0` and PU-03 workflow/PU-04–05 tests intact. Both `git diff --check` modes exit 0; tracked docs and 17 ignored notes relative links/fences all valid. Offline validator network-run guard and DRAFT template preserved. Focused 6/6 and full `npm test` 34/34 exit 0; unapproved template exits 2 **as intended**. No actual 4 GiB VPS performance or GitHub CI acceptance; release NO-GO.

## 2026-11-17 — PU-07 Final Production Readiness Forensic Gate — **NO-GO**

- **User authority and restrictions:** final F-01–F-13 release-gate reconciliation, evidence-based GO/NO-GO, source/UI/auth/protocol unchanged; documentation/checklist updates only; **no Git commit/push, live VPS, tag, publish or release**.
- **Baseline:** `main@55863d581903e64eec787d373524e878f7a31f7c` matched local `origin/main`. Preexisting PU-01–PU-06 uncommitted tracked docs, MIT metadata, prior security/TLS/offline preflight files and 20 staged **index-only** vendor removals preserved. No release-candidate commit or GitHub CI run is represented by the baseline SHA.
- **New tracked report:** `project/RELEASE_READINESS_AUDIT.md` with precise F-01–F-13 ledger, required gate table, NO-GO rationale, owner decision/acceptance order, rollback proposal **NOT EXECUTED**, and authorization boundary. Index updated `project/MINIFEST.md` and `project/README.md`; overview and root README link to public tracked audit. `notes/PU-07_IMPLEMENTATION_AUDIT.md` holds exact private scope/proof; status/phase/acceptance decision records updated. No source, test, workflow or deployment configuration edited.
- **F-01–F-05:** docs parity corrected locally PU-01; **F-06 MIT license approved + metadata** and **F-07 Gitignore/vendor-untracking + clean npm ci** complete locally PU-02. All still **uncommitted/unpushed**.
- **F-08:** public production WSS/TLS proxy unconfigured and untested; PU-05 loopback self-signed test-only proof does not count. **F-09:** local app header-token/role security covered PU-04, but native-browser credential lifecycle/token revocation not implemented or contractually decided. **F-10:** licensing/admin device workflow intentionally **out of transport engine scope**, not a mandatory feature.
- **F-11 / historical Phase 8:** approved real 4 GiB VPS WSS workload/p95/p99/CPU/RSS/lag, repeatability and failure recovery **NOT RUN**. PU-06 preflight is offline and intentionally BLOCKED pending D-02/D-05/D-06/D-07/D-10. No supported concurrency number.
- **F-12:** GitHub Actions read-only pinned CI workflow present in **local untracked** `.github/workflows/ci.yml`; **no actual CI job/run ID/status**, no applied branch protection, no production metrics exporter/health/alerts/process supervisor/rollback test. **F-13:** subscription default-deny verified by PU-04; real consuming-app tenant/group authorization remains conditional D-04.
- **Operations/release gates:** no approved deployment target, public TLS cert/renewal, operator owner, rollback drill, current release-candidate commit/tag, manual release approval or production sign-off. **Must remain NO-GO** even if local `npm test` passes.
- **Phase accounting:** PU-01, PU-02, PU-04 locally complete; PU-07 **evidence review COMPLETE with negative verdict** (4/7 review/work packages closed locally). PU-03 live CI, PU-05 real WSS/operations, PU-06 real VPS qualification **PARTIAL** (3/7), no release.
- **Verification:** final documentation/scope link audit and single `npm test` run to be appended once observed, no claimed GitHub run or external load.

- **PU-07 fresh final local regression:** Windows Node `v24.22.1`, `npm test` **34 passed, 0 failed, 0 skipped, exit 0**, Node test runner duration **5028.352207 ms**. Tests include six PU-04 security, two PU-05 WSS loopback and six PU-06 offline preflight cases; no actual GitHub Actions, real proxy, target VPS test or protected-environment trial occurred.
- **PU-07 focused final forensic patch audit:** Git HEAD/local `origin/main` remain `55863d581903e64eec787d373524e878f7a31f7c`. Cumulative previous phases + PU-07: **15 existing tracked modified paths**, all in permitted cumulative allowlist; **20 staged Git-index-only `node_modules/**` removals** preserved from PU-02; **9 expected untracked files**, including the new tracked-intended `project/RELEASE_READINESS_AUDIT.md`; **0 unauthorized tracked, staged or new paths**. `git diff --check` and `git diff --cached --check` both exit 0. All **seven** original engine/app/handler SHA-256 hashes unchanged; MIT LICENSE/package-lock `ws@8.22.0`, installed dependency and PU-03 CI workflow preserved; F-01–F-13 IDs present in tracked report. New project direct-child inventory 5 (manifest updated), docs 9 unchanged; verified **14 tracked Markdown** relative-link sets and **18 ignored private Markdown notes**, **0 invalid links/fences**. First text assertion was erroneously case-sensitive for the word “rollback”; corrected the **audit matcher** to case-insensitive, not source or report content; final check **PASS**. **No commit/push/tag/release/VPS modification.**
- **Final project disposition:** PU-07 **documentation audit locally completed with NO-GO**; PU-03 live CI, PU-05 real WSS/operations and PU-06 4 GiB VPS workload/SLO acceptance remain incomplete. Owner decisions/sign-off/rollback test outstanding; no production-ready claim.

## 2026-11-17 — NPM-01 Owner-Authorized One-Time npmjs Release (CI workflow stage)

- **Approval:** User explicitly requested npm publication through GitHub Actions and reports a GitHub organization `NPM_TOKEN` secret configured for public repositories. No token value was read or copied. **Target only** `configurable-websocket-engine@1.0.0`; no engine/auth/UI/protocol/VPS changes.
- **Workflow:** New `.github/workflows/publish-npm.yml`, tag-only trigger `npm-v1.0.0` (never normal main push), exact tagged source must be at main HEAD with **successful full CI push run**, locked install, full regression, npm package whitelist, high+ dependency security audit, name/version absence verification, final npm publish with `--access public --provenance --ignore-scripts` and secret injected **only to publishing step**. Provenance ID-token permission restricted to publisher job. npm registry publication to be verified by public registry query after workflow run. No GitHub Release or production WSS/VPS deployment.
- **Security:** Existing broad bypass-2FA granular npm token is planned for deprecation in January 2027; moving to npm trusted publishing OIDC and minimizing org secret access is recommended for future versions. Separate uploaded screenshot contains an exposed PyPI token; advise revocation/rotation, never reuse or expose. No credential data in repository or CI logs.
- **Expected proof:** publish workflow commit pushed, identical SHA full CI run successful, tagged event triggered, preflight and publishing jobs successful, official npmjs `npm view` and package URL confirming version. If any condition fails, record failure honestly; do not claim publication.

## 2026-11-17 — GH-01: Authorized GitHub CI and npmjs Packaging Preparation (NO npm publication)

- **Owner authorizations:** User explicitly authorized committing/pushing SocketCore to `vibtoolshq/SocketCore`, running GitHub Actions for available tests, and preparing (not actually publishing) npmjs release. No `npm publish`, tag, GitHub Release, production VPS WSS/4 GiB load or deployment authorization was given.
- **Entry repo:** Local `main` and remote `origin/main` were `55863d581903e64eec787d373524e878f7a31f7c`; GitHub linked Primary account confirmed ADMIN/PUSH. Preserved PU-01–PU-07 code, MIT policy, 20 intended staged **index-only** vendor untracks and 34 Node tests. No engine/handler/app/API/auth/default/protocol behavior changed.
- **npmjs:** Preserved existing `configurable-websocket-engine@1.0.0` name and version (unscoped, not published) with MIT. Added repository/homepage/bugs/keywords, `files` whitelist and `verify:package` script. New `scripts/verify-npm-package.js` runs **read-only** npm pack dry-run, verifies package + lock license/version and requires **exactly 11 files**: README, LICENSE, package metadata, five `engine/*.js` and three runtime docs. No test/config/internal/CI/private notes in published tarball. Local `npm run verify:package` **PASS**, tarball ~23,279 bytes, no publication.
- **GitHub CI:** `.github/workflows/ci.yml` now has Node 20/22/24/26 matrix (all 34 tests + OpenSSL local WSS fixture), high+ production dependency audit, independent safe Ubuntu GitHub-runner Python 3.12 100-client/1 KiB 15s **loopback** test, npm packed-package clean consumer `createEngine` smoke, read-only `actions/upload-artifact` (7-day GitHub artifact, not npmjs release), and fail-closed `Required CI gate` requiring all. All actions pinned to verified SHA; no write permissions, secrets, `npm publish`, release job or external production load.
- **Docs:** `docs/CI_TESTING.md` rewritten to reflect current workflow, `docs/NPM_RELEASE_PREP.md` added and linked/indexed for npmjs ownership, no publish and authenticating later; `docs/LOAD_TESTING.md` GitHub loopback vs VPS explanation; `SECURITY.md` fixed outdated assertion that global caps default disabled (actual 500 messages/s & 64 MiB), without runtime change. Root README and project overview updated, docs manifest/index synchronized.
- **Local evidence:** YAML parse **PASS** (five jobs), `npm run verify:package` **PASS** (11 files), `npm test` **34 passed, 0 failed, 0 skipped, exit 0** Windows Node v24.22.1, `npm audit --omit=dev --audit-level=high` **0 vulnerabilities, exit 0**. Python loopback was **not** run locally (Python unavailable) — GitHub Actions executes it when authorized push triggers.
- **npm release blockers:** registry lookup `npm view configurable-websocket-engine` returned E404 (name not found at audit time; not guaranteed available), `npm whoami` returned ENEEDAUTH, no npm account/2FA/trusted publisher/ownership verified. Npm release not performed. Real external WSS/proxy, 4 GiB VPS workloads/SLO and operator monitoring/rollback remain NO-GO.
- **Git status / CI proof:** Actual publication SHA, GitHub run URL and all job results to be recorded **after** an authorized Git push; no run should be claimed green until inspected.

## 2026-11-17 — NPM-01 GitHub Tag and npmjs Publish Acceptance

- **Release tag:** `npm-v1.0.0` (annotated) successfully pushed; tag points to **`4f2fd08ab62bf11d42683f6c0ca9ade0c41575c6`**. Exact commit full GitHub CI [run 43951316943](https://github.com/vibtoolshq/SocketCore/actions/runs/43951316943) **8/8 jobs SUCCESS** (Node 20/22/24/26 x34 tests, safe 100-client local loopback, npm pack clean consumer, high+ audit, required CI gate).
- **Actual npm publish job:** `publish-npm.yml` tagged [run 43951626306](https://github.com/vibtoolshq/SocketCore/actions/runs/43951626306), both preflight and publisher jobs **SUCCESS**. CI used `secrets.NPM_TOKEN` only for `npm publish --access public --provenance --ignore-scripts` and logged `+ configurable-websocket-engine@1.0.0`, 11 files. Signed provenance published with [transparency log index 3934380418](https://search.sigstore.dev/?logIndex=3934380418). No GitHub Release, PyPI publication or production VPS action.
- **Registry propagation checkpoint:** Official unauthenticated npm registry initially HTTP 404 during scanning, later returned `versions: 0.0.0-stage,1.0.0`, `dist-tags.latest:1.0.0`, version MIT and provenance attestation; **actual tarball GET was still 404** on immediate fresh-cache consumer install. Treat npm publish as **accepted, public installation validation pending registry processing**, not a full install acceptance. npm's 2026 publish-time malware scanner can delay package install; **do not submit a duplicate publish**. Verify fresh-cache public `npm install configurable-websocket-engine@1.0.0` after processing.
- **Safety:** No source/engine/auth/protocol changes in NPM-01; package 1.0.0 release content fixed at tagged SHA. Future releases should use npm Trusted Publishing (OIDC) and restrict wide Bypass-2FA org token; the separate screenshot-exposed PyPI token should be rotated. **Public npm package release and production-host WSS/4 GiB VPS readiness are different gates; production infrastructure still NO-GO.**

## NPM-01 final public npmjs installation acceptance — 2026-11-17

**npm package publication and public consumer verification COMPLETE.** After the npm publish-time security scan finished, the registry at `https://registry.npmjs.org/configurable-websocket-engine/1.0.0` returned `name: configurable-websocket-engine`, `version: 1.0.0`, `license: MIT`, the public tarball URL and signed provenance `dist.attestations`. The public package's `latest` dist-tag is `1.0.0`. An **anonymous HTTP HEAD** request for the registry tarball returned **HTTP 200**.

A newly created disposable Windows Node 24 consumer directory, using a **completely fresh npm cache** and only `https://registry.npmjs.org/`, ran `npm install configurable-websocket-engine@1.0.0 --ignore-scripts --no-audit --no-fund`: **two packages installed successfully** (library + dependency). Public root import `require('configurable-websocket-engine')` exposed `createEngine` as a function. Inspection of the package's installed manifest via filesystem (not an unexported public `package.json` subpath) confirmed `1.0.0` and `MIT`. Output `PUBLIC_CONSUMER_IMPORT_PASS`, `FINAL_PUBLIC_NPMJS_CLEAN_INSTALL_PASS`, **exit code 0**. Disposable install/cache removed; no application or VPS changed.

The first immediate post-publish consumer check was too early: npm metadata appeared before tarball accessibility, consistent with GitHub's documented 2026 publish-time malware scanning. An intermediate verification script incorrectly imported the unexported `configurable-websocket-engine/package.json` subpath and failed `ERR_PACKAGE_PATH_NOT_EXPORTED`; this was a **verification script mistake**, not an installed package defect. The corrected public-root import and manifest filesystem check **passed**. Neither issue required republishing or altering the immutable version.

**Final npmjs package status: PUBLISHED & PUBLICLY INSTALLABLE** with signed GitHub provenance ([npm package page](https://www.npmjs.com/package/configurable-websocket-engine), [publish run 43951626306](https://github.com/vibtoolshq/SocketCore/actions/runs/43951626306), [Sigstore log index 3934380418](https://search.sigstore.dev/?logIndex=3934380418)). The npmjs **library** release is complete; real WSS/proxy/4 GiB VPS production deployment remains separately **NO-GO**. Future versions require fresh approval and migration from broad bypass-2FA tokens toward npm Trusted Publishing.
