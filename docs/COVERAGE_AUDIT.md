# Developer Documentation Forensic Coverage and QA

**Audit date:** 2026-11-19. **Repository HEAD before documentation changes:** `ef2586daf83ba7f64bee830185699cf92acd9a64`, clean `main`. **Documentation-generation scope:** Markdown files under `docs/` only, without source/config/metadata/test/workflow edits. The later owner-authorized Git commit/push is a separate baseline-synchronization step, not part of the documentation-generation verification.

## Codebase inventory

| Item | Audited inventory / evidence |
| --- | --- |
| Tracked repository files | **54** tracked files inventoried via read-only Git index |
| First-party JavaScript implementation/tool files | **11** matching `app.js` plus `engine/`, `handlers/`, `load-test/`, `scripts/` JS paths |
| Core shipped runtime modules | **5**: `engine/index.js`, `config.js`, `connection-manager.js`, `message-router.js`, `observability.js` |
| Sample handlers | **2**: `handlers/command.handler.js`, `handlers/status.handler.js` (repository only) |
| Node test files | **9** `*.test.js` files; latest 1.0.0 CI Node suite contained **34 tests**, 4 Node versions |
| Additional test tooling | `test/load/clients.py`, pinned `test/requirements-load.txt`, `test/load/pu06-target-template.json` |
| Workflows | **2**: read-only `.github/workflows/ci.yml` and one-time `.github/workflows/publish-npm.yml` |
| Existing tracked docs before this task | **10** Markdown pages directly in `docs/` (the legacy inventory is misspelled `MINIFEST.md`) |
| Public npm root exports | **1**, exact `createEngine` |
| Returned engine surface | **4 methods** (`attach`, `register`, `start`, `stop`), **2 properties** (`connectionManager`, `messageRouter`) |
| Returned connection-manager surface | **13 methods**: `add`, `remove`, `get`, `size`, `sendTo`, `broadcast`, `subscribe`, `unsubscribe`, `publish`, `startHeartbeat`, `stopHeartbeat`, `closeAll`, `drain` |
| Returned router surface | **2 methods** (`register`, `dispatch`) and **1 Map property** (`handlers`) |
| Documented options | **10** top-level factory fields; **11** limits, **2** heartbeat settings, **4** timeout settings; `websocket.perMessageDeflate` |
| Implemented capabilities documented | **15 groups**: upgrade/path routing; Origin filtering; authentication; deadline/abort propagation; connections; JSON routing; registration; personalized sends; broadcast; authorized groups; token-bucket message caps; concurrency and buffered-send admission; heartbeat; safe logger/metrics hooks; graceful drain |

The `app.js` standalone HTTP server, handler factories, config helpers, observability helpers, offline load validator and CI/package scripts were audited as **repository implementation**, not as additional public npm exports.

## Audit-to-documentation matrix

| Source or requirement | Documentation |
| --- | --- |
| `package.json`, `package-lock.json`, npm `exports`, install behavior | [Installation](getting-started/installation.md), [Compatibility](reference/compatibility.md), [Release](development/release-process.md) |
| `engine/index.js` factory, upgrade, lifecycle, callbacks | [Factory and lifecycle](api/create-engine.md), [Execution flow](architecture/execution-flow.md) |
| `engine/config.js` defaults, strict validators | [Exact defaults](reference/configuration.md), [Original environment mapping](CONFIGURATION.md) |
| `engine/connection-manager.js` methods, groups, buffered bytes, drain | [Connection manager](api/connections.md), [Advanced usage](guides/advanced-usage.md) |
| `engine/message-router.js`, handler ctx, errors | [Message router/errors](api/messages.md), [Original protocol](WEBSOCKET_PROTOCOL.md) |
| `engine/observability.js` and callback contracts | [Advanced usage](guides/advanced-usage.md), [Debugging](development/debugging.md) |
| `handlers/status.handler.js`, `handlers/command.handler.js`, `app.js` | [Original protocol](WEBSOCKET_PROTOCOL.md), [Integration](guides/integration.md), [Configuration](reference/configuration.md) |
| Test files, OpenSSL fixture, Python loopback, offline validator | [Testing](development/testing.md), [Load testing](LOAD_TESTING.md) |
| CI/test artifacts and npm provenance | [CI testing](CI_TESTING.md), [Release](development/release-process.md), [npm release evidence](NPM_RELEASE_PREP.md) |
| MIT/security/contribution policies | [Contributing](development/contributing.md), [Compatibility](reference/compatibility.md), [Troubleshooting](help/troubleshooting.md) |
| Error handling and operational limitations | [API errors](api/messages.md), [Debugging](development/debugging.md), [Production deployment](PRODUCTION_DEPLOYMENT.md) |

## Validation results

- **Executed working example:** Node HTTP server + library `createEngine({path,authenticate,allowedOrigins})` + Node `ws` client + `echo` handler; verified sequence `connected` → `echo`, generated clientId, unregister result, graceful stop. Result: `DOCS_QUICKSTART_PROGRAMMATIC_ROUNDTRIP_PASS`.
- **Executed public API introspection:** `require(".")` exports exactly `createEngine`; returned engine keys `attach`, `register`, `start`, `stop`, `connectionManager`, `messageRouter`; all **13** manager method names and `register/dispatch/handlers` router names checked. Result: `DOCS_API_SURFACE_PASS`.
- **Existing CI evidence (not rerun by this writing task):** [1.0.0 candidate GitHub Actions run](https://github.com/vibtoolshq/SocketCore/actions/runs/43951316943) passed 34 Node tests across Node 20/22/24/26, safe 100-client loopback load, package install and high+ dependency audit. Successful [npm publication](https://github.com/vibtoolshq/SocketCore/actions/runs/43951626306) and prior clean consumer installation are separate release evidence.
- **Final docs internal link and scope checks:** recorded after the final validation step; do not infer a passing result before it is actually run.

## Existing docs corrections and intentional preservation

1. Added a consistent developer-only documentation homepage, accurate `MANIFEST.md`, API reference and navigation; kept legacy `MINIFEST.md` available with a corrected pointer.
2. Added a current npm release verification note to [NPM_RELEASE_PREP.md](NPM_RELEASE_PREP.md) because its older, dated initial 404/scanning observations must not be mistaken for the final install outcome.
3. Kept the npm-**packaged** `ENGINE_API.md`, `CONFIGURATION.md` and `WEBSOCKET_PROTOCOL.md` unchanged to avoid conflating newly written repository docs with already published npm 1.0.0 content.
4. No unsupported classes, Python SDK, TypeScript declaration files, CLI binary, production WSS server, Redis/pubsub adapter, database or server health endpoint were documented as public functionality.

## Unverified boundaries

- No real 4 GiB VPS connection/capacity SLO, external production reverse proxy configuration, certificate renewal, or live monitoring/rollback acceptance was performed as part of this task.
- Browser-native authentication must be implemented by the consuming application; `x-auth-token` in the sample cannot be sent by native browser WebSocket.
- The client application, external credential issuer, production topology and tenant authorization design are not in the repository scope. Do not fabricate their contracts.
- This expanded GitHub documentation is not automatically present in the published **11-file npm 1.0.0 tarball**. Publishing a future version containing additional docs would require separately authorized package metadata/release changes, which this task does **not** make.

## Final verification — executed 2026-11-19

- **Documentation inventory:** **33 Markdown files** in `docs/`, including **23 newly created Markdown files** and **3 previously existing Markdown files edited** (`README.md`, legacy `MINIFEST.md`, `NPM_RELEASE_PREP.md`). Existing published technical references `ENGINE_API.md`, `CONFIGURATION.md`, `WEBSOCKET_PROTOCOL.md` were not modified. New hierarchy contains **7** section directories.
- **Link and Markdown check:** **163 relative links** resolved to existing local targets; **88 code-fence markers** had **0 unbalanced fences**; **0 broken paths**. `git diff --check` passed. `MANIFEST.md` is the new authoritative navigation inventory; `MINIFEST.md` remains as a clearly labeled historical alias.
- **Documentation-generation scope audit (before synchronization):** 26 changed/new tracked-or-untracked paths **all under `docs/`**, 0 non-doc changes; repository HEAD then `ef2586daf83ba7f64bee830185699cf92acd9a64`. No tag, release, build configuration, package metadata or source modification; subsequent Git synchronization was separately authorized.
- **Runtime examples:** Public `createEngine` module shape, 6 engine keys, 13 connection manager methods, 3 router entries verified by runtime introspection; end-to-end Node HTTP+WebSocket echo connected/echo round-trip, generated client ID, handler unregistration and graceful stop **PASS**.
- **One final regression:** `npm test` **34 tests passed, 0 failed, 0 skipped, 0 cancelled, exit code 0** (Node v24.22.1, Windows; duration_ms 5311.637094). This run includes security, WSS/TLS loopback and offline preflight tests; it is **not** a real public WSS/VPS capacity or operations acceptance.
- **Evidence limits:** Examples that depend on host-created TLS material and `verifyCredential` placeholders were reviewed for source contract accuracy but **not** executed against real domains or production secrets. Previous Linux CI and npmjs publication are separately linked historical results; no fresh CI was triggered by this docs-only task.
