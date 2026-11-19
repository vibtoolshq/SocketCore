# SocketCore Documentation

**Current developer documentation starts at [index.md](index.md).** Use [MANIFEST.md](MANIFEST.md) for the complete navigable docs inventory and [COVERAGE_AUDIT.md](COVERAGE_AUDIT.md) for source-to-doc QA. This legacy index remains for compatibility with earlier repository links. The expanded `docs/` hierarchy is GitHub-only and is **not included** in the already-published npm 1.0.0 tarball.

**A reusable WebSocket core for real-time Node.js applications.**

SocketCore is a configurable Node.js WebSocket engine for authenticated real-time messaging, connection limits, backpressure, metrics hooks, and graceful shutdown. This tracked directory contains verified setup, protocol, API, deployment, and load-study references. Documentation describes implemented behavior and labels deployment capabilities that remain the host application's responsibility.

The root [README](../README.md) is the GitHub project overview. The [project records](../project/README.md) describe engineering history and source ownership.

## Guides

- [USER_GUIDE.md](USER_GUIDE.md): prerequisites, install/start steps, connecting, and basic message examples.
- [CONFIGURATION.md](CONFIGURATION.md): environment variables, defaults, validation, and origin/token behavior.
- [WEBSOCKET_PROTOCOL.md](WEBSOCKET_PROTOCOL.md): handshake results, message shapes, built-in handlers, extension context, limits, and errors.
- [ENGINE_API.md](ENGINE_API.md): using the package as a library, factory options, lifecycle methods, and exposed manager/router APIs.
- [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md): deployment responsibilities, security boundaries, workload sizing, and release checklist.
- [LOAD_TESTING.md](LOAD_TESTING.md): installing the isolated Python test client and running the local scale profile.
- [CI_TESTING.md](CI_TESTING.md): GitHub Actions Node matrix, Python loopback load, npm package checks, locked install, high+ dependency audit and status gate.
- [NPM_RELEASE_PREP.md](NPM_RELEASE_PREP.md): npmjs metadata, exact 11-file tarball, account/registry ownership blockers and release approval steps (no publish).
- [MINIFEST.md](MINIFEST.md): direct directory inventory and document status.

## Accuracy

The implementation and tests are the source of truth. If a guide and current code disagree, verify the code and tests, then update the guide in the same task that changes behavior. Unknown behavior must be identified as unknown, not filled in by assumption.
