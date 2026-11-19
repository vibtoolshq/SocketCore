---
title: "Compatibility and Dependencies"
description: "Node.js versions, dependency constraints, exports and distribution behavior."
order: 2
draft: false
---

# Dependencies, Compatibility and Distribution

| Requirement | Actual source |
| --- | --- |
| Package | `configurable-websocket-engine@1.0.0` |
| JS module | CommonJS `main: engine/index.js`; `exports: {".":"./engine/index.js"}` |
| Declared Node support | `>=20` |
| Dependency | `ws: ^8.18.3`; repository lockfile resolved `8.22.0` at audit |
| Published package | 11-file whitelist: five runtime modules, LICENSE, README, package.json and three technical docs |
| License | MIT |
| Native bindings | No native binding identified in this package |
| TypeScript declarations | No published `.d.ts` or typed package interface found |
| CLI binary | None; `npm start`, `npm test`, `npm run verify:package` are **repository npm scripts**, not installed package executables |
| Optional Python | Python 3.12 in GitHub CI for repository-only `test/load/clients.py` benchmark with pinned websockets dependency; not required to use npm package |
| System services | No built-in database, cache broker, Redis, persistent queue, TLS certificate or HTTP hosting service |

**Verified CI matrix:** Node 20/22/24/26 on GitHub-hosted Ubuntu, 34 Node tests each for release candidate in [run 43951316943](https://github.com/vibtoolshq/SocketCore/actions/runs/43951316943). Windows Node 24 local regression also passed previously. This is **not** a claim that every OS/architecture or future Node update is tested. Node 20 is end-of-life as of this documentation audit although the package currently retains its declared `>=20` minimum.

**Published npmjs first release:** [package](https://www.npmjs.com/package/configurable-websocket-engine), [approved publishing workflow](https://github.com/vibtoolshq/SocketCore/actions/runs/43951626306). GitHub source and npm package differ in packaging scope: sample `app.js`, tests, workflows and this expanded documentation directory are **not** installed by npm 1.0.0.

**Browser interoperability:** The transport uses standards-based WebSocket but the standalone header-token example is **not** directly usable with a native browser `new WebSocket(url)`, which cannot set arbitrary `x-auth-token` headers. A host-defined browser credential contract must be designed and reviewed.

**Production sizing:** 100-client runner-local smoke tests verify a profile, not real 4 GiB VPS capacity, real proxy/TLS/monitoring or any official concurrent-user SLO.
