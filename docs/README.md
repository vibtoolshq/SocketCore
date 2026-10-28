# User Documentation

This tracked directory contains verified setup and usage instructions for the current WebSocket engine. It describes the behavior implemented in the repository; it does not promise functionality that is absent from the source.

## Guides

- [USER_GUIDE.md](USER_GUIDE.md): prerequisites, install/start steps, connecting, and basic message examples.
- [CONFIGURATION.md](CONFIGURATION.md): environment variables, defaults, validation, and origin/token behavior.
- [WEBSOCKET_PROTOCOL.md](WEBSOCKET_PROTOCOL.md): handshake results, message shapes, built-in handlers, extension context, limits, and errors.
- [ENGINE_API.md](ENGINE_API.md): using the package as a library, factory options, lifecycle methods, and exposed manager/router APIs.
- [MINIFEST.md](MINIFEST.md): direct directory inventory and document status.

## Accuracy

The implementation and tests are the source of truth. If a guide and current code disagree, verify the code and tests, then update the guide in the same task that changes behavior. Unknown behavior must be identified as unknown, not filled in by assumption.
