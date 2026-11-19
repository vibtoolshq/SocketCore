# Public API Reference

**The only supported npm package root export is `createEngine`.**

```js
const { createEngine } = require("configurable-websocket-engine");
```

Everything below is reached via **returned objects** from `createEngine`, not a separately exported package namespace.

| Public interface | Access path | Details |
| --- | --- | --- |
| Factory | `createEngine(options?)` | [Factory/options](create-engine.md) |
| Engine methods | `engine.attach/register/start/stop` | [Factory/options](create-engine.md) |
| Connection manager | `engine.connectionManager` | [Connections, sends, subscriptions](connections.md) |
| Message router | `engine.messageRouter` | [Router and handler context](messages.md) |
| Protocol errors | Incoming WS JSON messages / HTTP upgrade | [Message errors](messages.md) · [Wire reference](../WEBSOCKET_PROTOCOL.md) |

No exported TypeScript `.d.ts` declarations, public classes, constructors, enums, custom exception classes, CLI binary, Python SDK, database adapter or browser SDK were found in the package metadata or root module. The standalone `app.js` and sample `handlers/**` are repository examples, **not** npm subpath exports. Internal helper functions in `engine/config.js`, `engine/connection-manager.js`, `engine/message-router.js` and `engine/observability.js` must not be treated as stable `require("configurable-websocket-engine/…")` paths.

The implementation is JavaScript and does not enforce TypeScript compile-time shapes; shape descriptions here are inferred from runtime source and tests. See [coverage](../COVERAGE_AUDIT.md).
