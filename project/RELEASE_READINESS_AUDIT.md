# SocketCore — PU-07 Final Production Release Gate

**Audit date:** 2026-11-17 (Asia/Dhaka)
**Verdict:** **NO-GO — NOT PRODUCTION READY**
**Examined local baseline:** `main@55863d581903e64eec787d373524e878f7a31f7c` = local `origin/main`.
**Distribution license:** owner-approved [MIT](../LICENSE), added **locally only**.
**Authority:** documentation-only forensic review; **no** commit, push, tag, npm publish, release or live VPS action.

This report is a release **decision** based on the local working tree, dated source/tests and prior phase evidence. It is **not** a production deployment, live GitHub Actions result, external security assessment or supported WebSocket client-count certification. The local `HEAD` is the **older baseline**; new corrections and tests are uncommitted and cannot be claimed to exist on GitHub at that SHA.

## Executive gate: required evidence

| Gate | Observed result | Release status |
|---|---|---|
| Code and documentation consistency | PU-01 documentation fixes in local working tree; finite caps match engine; no runtime rewrite | **PASS LOCALLY**; remote unpublished |
| Project license and repository hygiene | Owner explicitly selected MIT; `LICENSE` and package/lock MIT match. `node_modules/` ignored; 20 vendor files staged for index-only removal. Prior isolated `npm ci` passed | **PASS LOCALLY**; changes uncommitted/unpushed |
| Security protocol and authorization | PU-04 6/6 local tests: Origin/auth HTTP 401/403/500, default-deny groups, roles, sanitized errors, WS 1008/1013 | **PASS LOCALLY** for tested Node `ws` policy; consuming-app credentials/group contract conditional |
| GitHub Actions / supply-chain | `.github/workflows/ci.yml` authored with pinned read-only actions, `npm ci`, Node 20/22/24/26, tests, high+ audit and fail-closed gate; earlier static YAML check and local npm audit passed | **BLOCKED**: workflow unpushed; **no** actual GitHub Actions run URL, SHA-specific matrix results or branch-protection evidence |
| WSS/TLS and real reverse proxy | PU-05 2/2 local `127.0.0.1` self-signed TLS proxy smoke cases passed | **BLOCKED**: no owner-selected public WSS domain, real CA chain/renewal, approved host/proxy configuration or production handshake/restart evidence |
| Production health, observability and operations | Engine supports metrics callbacks and bounded drain; test-owned `/health`/`/ready` and reconnect verified locally | **BLOCKED**: no real exporter, alert thresholds, supervisor, health/readiness endpoints, secret rotation, operator rollback or restart drill |
| Real 4 GiB VPS load / latency / CPU / RAM | Historical synthetic Windows WS loopback runs; PU-06 pure offline preflight 6/6 and draft template correctly BLOCKED | **BLOCKED**: no real 4 GiB WSS host, representative workload, approved p95/p99/error/CPU/RSS/lag/recovery SLO, trial, repeatability or measured supported concurrency |
| Release change control and rollback | MIT decision recorded; planning checklists exist | **BLOCKED**: no release-candidate SHA/approved tag, GitHub required checks, distribution choice, responsible operator sign-off, tested rollback and explicit release authorization |

**Decision rule:** Every required release gate must have actual green evidence. A single `BLOCKED`, `NOT RUN` or `UNKNOWN` gate means **NO-GO**. The current release gate fails multiple independent requirements. **Do not create a tag or publish an npm package.**

## F-01–F-13 finding-by-finding reconciliation

| ID | Forensic disposition as of 2026-11-17 | Evidence / remaining requirement |
|---|---|---|
| **F-01** README aggregate default limits | **FIXED LOCALLY** | README now describes 500 messages/sec and 64 MiB default buffered cap, matching `engine/config.js`; no behavior change |
| **F-02** Timeout pending-upgrade slot lifecycle | **FIXED LOCALLY** | README/protocol text describes abort signal + capacity retained until provider Promise settles; matches `engine/index.js` |
| **F-03** Stale test-count statement | **FIXED LOCALLY** | README replaced old static count with dated test result and `npm test`; test growth recorded by later phase logs |
| **F-04** Default aggregate backpressure wording | **FIXED LOCALLY** | README corrected default-on caps and override wording |
| **F-05** Dead private notes pointer | **FIXED LOCALLY** | Project overview corrected nonexistent relative path and clarified ignored private notes |
| **F-06** Undecided distribution license | **FIXED LOCALLY** | Owner approved MIT; root `LICENSE`, package/lock metadata and contribution docs match. No remote publication |
| **F-07** Tracked `node_modules` and reproducible dependencies | **FIXED LOCALLY** | `.gitignore` ignores modules; 20 existing index-only staged removals; disposable `npm ci`/tests previously passed, developer installation retained |
| **F-08** No production TLS/WSS host configuration | **BLOCKED** | Sample `app.js` remains HTTP by scope. PU-05 tests a separate **test-only** local WSS reverse proxy, not a public service. Decide D-02/D-05 and verify actual deployment |
| **F-09** Static header-token client/auth lifecycle | **CONDITIONAL / INTEGRATION OPEN** | PU-04 local tests pass for application-provided Node client auth. No built-in token issuance/expiry/revocation or native-browser custom-header path. Decide D-03 and test the consuming application |
| **F-10** License admin/device/business workflow | **DEFERRED — OUT OF TRANSPORT ENGINE SCOPE** | Not a regression/security bug in SocketCore. No licensing DB, admin UI or device business feature added or claimed |
| **F-11** Real 4 GiB VPS throughput/resource/SLO | **BLOCKED — RELEASE CRITICAL** | PU-06 preflight is offline-only and intentionally blocks absent D-02/D-05/D-06/D-07/D-10; no target measurements or approved capacity claim |
| **F-12** CI/operations evidence | **PARTIAL / RELEASE BLOCKED** | CI workflow coded locally, security audit checked locally in PU-03; actual GitHub matrix, branch protection, monitoring/exporters, WSS supervision and rollback drill absent |
| **F-13** Subscription authorization defaults | **SECURE DEFAULT VERIFIED; CONSUMER POLICY CONDITIONAL** | Default-deny remains intact; PU-04 tenant isolation tests use a **test-provided** authorizer. No global allow-all or unapproved tenant admin system |

These categories mean exactly what they say: **locally fixed** is not **published**, and **conditional/deferred** is not a confirmed production runtime defect. Historical Phase 8 is still **PARTIAL**, because its 4 GiB target qualification is not complete.

## Local evidence and what it does not prove

- Historical local correctness suite had 20 tests; PU-04 added six security cases (26), PU-05 added two temporary TLS/proxy cases (28), PU-06 added six **offline-only** preflight cases (34). Fresh PU-07 final local regression: **34/34 passed, 0 failed/skipped, exit `0`** on Windows Node `v24.22.1` (2026-11-17, Node test runner 5028.352207 ms). The separate focused documentary/Git patch audit is recorded in the dated development and private forensic logs. This is **not** a real GitHub CI run or a protected production WSS test.
- PU-03 isolated `npm ci` succeeded using locked `ws@8.22.0`; prior local `npm audit --omit=dev --audit-level=high` found **0 vulnerabilities** at that time. These are not an actual GitHub Actions security job.
- PU-05 uses temporary self-signed certificates, loopback HTTPS/WSS, temporary local health/readiness and metrics hooks. It **does not** provide production TLS, Nginx/Caddy, cert renewal, metrics exporter or live operations.
- PU-06 preflight file `test/load/pu06-target-template.json` leaves all actual host/workload/SLO fields unset. Its `BLOCKED` exit `2` is the **expected** policy outcome. It does **not** generate production traffic or measure latency/CPU/RSS; Python load harness was unavailable in the PU-06 Windows environment and, even if installed, targets its own loopback WS server.
- Node 20 is retained in the proposed GitHub Actions matrix for backwards compatibility with the package's declared `>=20` floor, although it was EOL as of this audit; supported production Node policy needs an operator decision. All matrix versions remain **unverified on GitHub**.
- Existing security primitives (roles, Origin, callback deadline, default-deny groups, rate/concurrency/buffer caps) should not be changed to manufacture benchmark successes.

## Owner decisions and acceptance evidence required to change NO-GO

| Order | Owner/operation action | Evidence required before release |
|---|---|---|
| 1 | **D-02, D-03, D-04:** decide hosted standalone vs embedded library, actual client credential transport and whether tenant/group authorization is needed | Selected, security-reviewed consuming-app/topology/credential contract, not a guessed engine redesign |
| 2 | **D-05, D-10:** identify real target VPS, 4 GiB process budget, operating system, Node runtime, public WSS hostname, cert owner, reverse proxy, metrics/health/restart and rollback owners | Host/proxy inventory, TLS trust/renewal, trusted forwarding, running `wss://` with positive/negative handshake and drain/restart proof |
| 3 | **D-06, D-07:** approve representative request/broadcast/fanout/payload/churn/failure profile and numerical success, p95/p99, CPU/RSS/lag/recovery ceilings **before** testing | Bounded, separately authorized WSS target soak/ramp/reconnect/slow-client/overload/failure measurements and comparable rerun; sanitized raw results |
| 4 | **D-09:** separately approve a curated Git commit and GitHub push, run CI against that exact SHA | Real GitHub Actions run URL, green Node 20/22/24/26 jobs (or separately approved revised support matrix), dependency audit, required gate and branch protection decision. No release job triggered |
| 5 | Document release-candidate provenance and operator sign-off, and test the recovery plan | Approved candidate SHA/version/tag proposal, protected secrets, known limitations, tested previous-version fallback and operator sign-off; fresh final regression on exact candidate |
| 6 | **Only after every gate passes:** obtain a **separate explicit release authorization** | New written GO verdict and owner approval before any tag, GitHub Release, `npm publish` or deployment |

**Rollback plan — NOT EXECUTED:** After an authorized deployment, keep a known-good prior application artifact/config and recorded database/secret compatibility; put the real proxy/app into maintenance or drain mode; restore the previous known-good artifact/config; restart through the approved supervisor; validate trusted WSS, health/readiness, auth and metrics; record failure/recovery timings. Specific host commands, backups and owner are **TBD**, not guessed. Neither a release nor a rollback was performed during PU-07.

## GH-01 — Scope Update for GitHub CI / npmjs Preparation (2026-11-17)

After the PU-07 documentation-only NO-GO audit, the user separately authorized **a GitHub Git commit/push, read-only Actions CI and npmjs package preparation only**. This does **not** authorize `npm publish`, GitHub Release/tag, production deployment, real VPS load or secret access. The GH-01 workflow now targets Node 20/22/24/26, all 34 Node regression/security/WSS fixture/preflight cases, safe GitHub-runner **100-client loopback** Python load, high+ dependency audit and an exact 11-file npm pack plus clean consumer import. `package.json` remains `configurable-websocket-engine@1.0.0` with MIT, npm repository metadata and strict `files` whitelist; `scripts/verify-npm-package.js` is read-only. The historical baseline observations above remain dated, not retroactively changed.

The actual GitHub Actions run URL/job conclusions must be recorded **after** the authorized push; do not claim this update alone proves CI succeeded. The connected PC currently returns `npm whoami` `ENEEDAUTH`; npm registry lookup for the unscoped package returned E404 (not proof of reserved name). See [npm release preparation](../docs/NPM_RELEASE_PREP.md). **Production WSS/4 GiB VPS and operator rollback gates remain NO-GO.**

## Phase closure and publication boundary

PU-07 closes **only the evidence reconciliation and NO-GO decision**, not the blocked production prerequisites. Source code, auth, UI, wire protocol, CI workflow and MIT license remain unchanged. This report and other PU-01–PU-07 patches are still **local/uncommitted/unpushed**. No remote CI result or actual production success has been invented.

**Final verdict: NO-GO.** Resume release consideration only after the missing CI, real WSS/ops, real target 4 GiB capacity/SLO and rollback/sign-off evidence has been obtained with separate owner approvals.

## NPM-01 subsequent publication update — supersedes historical CI/npm-release blockers (2026-11-17)

**Important temporal distinction:** This report's original PU-07 table above was a snapshot *before* the owner subsequently authorized GitHub push and npmjs package publication. Its historical statements “CI unpushed,” “no release tag” and “do not publish” were superseded **for the npm library release only** by later direct owner authorization. They must not be read as the current status.

- **GitHub source/CI now PASS:** `main` push and actual [CI run 43951316943](https://github.com/vibtoolshq/SocketCore/actions/runs/43951316943) for SHA `4f2fd08ab62bf11d42683f6c0ca9ade0c41575c6`, all eight jobs success: 4×34 Node tests, 100-client **loopback** Python profile, npm tarball consumer install, high+ dependency audit, fail-closed required gate.
- **npmjs library publication accepted:** Annotated tag `npm-v1.0.0` points to the same verified SHA. [GitHub Actions NPM-01 publish run 43951626306](https://github.com/vibtoolshq/SocketCore/actions/runs/43951626306) preflight and publisher jobs **SUCCESS**; npm CLI returned `+ configurable-websocket-engine@1.0.0` with signed provenance ([transparency evidence](https://search.sigstore.dev/?logIndex=3934380418)). Public npm registry metadata subsequently listed `1.0.0` as `latest` and MIT/provenance; initial anonymous tarball download was still delayed by npm first-publish scanning. Avoid duplicate `npm publish` while awaiting scan.
- **Still NO-GO for production hosting:** F-08 real public WSS/proxy/cert/health, F-11 approved 4 GiB target workload/CPU/RSS/latency/SLO, and F-12 **production operations and rollback** remain unaccepted. A publishable reusable npm library is not evidence that an actual VPS is production-ready. Native browser client credential and tenant authorization decisions also remain consumer-specific. No VPS deployment was performed.
- **Future security:** Avoid global always-write Bypass-2FA tokens for subsequent releases; prefer an npm Trusted Publisher OIDC configuration and scoped protections after first-publish ownership is established. The unrelated PyPI token visible in the user's screenshot should be revoked and rotated, not committed or reused for npm.

See [npm release details](../docs/NPM_RELEASE_PREP.md) for current registry evidence and the approved one-time tag-only workflow. This postscript is a dated supplement, not a claim that the original PU-07 production-host GO/NO-GO has passed.
