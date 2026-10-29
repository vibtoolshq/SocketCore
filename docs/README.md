# SocketCore Documentation

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
- [MINIFEST.md](MINIFEST.md): direct directory inventory and document status.

## Accuracy

The implementation and tests are the source of truth. If a guide and current code disagree, verify the code and tests, then update the guide in the same task that changes behavior. Unknown behavior must be identified as unknown, not filled in by assumption.
