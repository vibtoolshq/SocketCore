# Engine Library API

The package exports `{ createEngine }` from `engine/index.js` as CommonJS. This guide describes the API after Phase 1 (2026-10-28).

## Factory and Configuration

```js
const { createEngine } = require("configurable-websocket-engine");

const engine = createEngine({
  authenticate: async (req) => verifyRequest(req),
});
```

`authenticate` is required. It receives the HTTP upgrade request; return a non-null, non-array object identity to accept, or a falsy value to reject. The library does not prescribe token/JWT logic.

| Option                  | Default                               | Behavior                                                                                                                                              |
| ----------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authorizeSubscription` | async deny                            | Async `(identity, group, req)` callback; false/throw denies.                                                                                          |
| `allowedOrigins`        | `[]`                                  | Exact string array, `"*"`, or async-capable `(origin, req)` callback. Missing Origin is allowed.                                                      |
| `limits`                | Shared defaults in `engine/config.js` | Shallow object override; unknown keys and invalid values throw. Supported direct engine limit values may be positive integers or explicit `Infinity`. |
| `heartbeat`             | Shared defaults in `engine/config.js` | Known keys only; values must be non-negative integers.                                                                                                |
| `websocket`             | `{}`                                  | `perMessageDeflate` defaults to false.                                                                                                                |
| `logger`                | `console`                             | Logger used for warnings/errors.                                                                                                                      |

`engine/config.js` exports `DEFAULT_PORT`, `DEFAULT_LIMITS`, `DEFAULT_HEARTBEAT`, `resolveLimits`, and `resolveHeartbeat`. The standalone app reads environment values and uses these shared defaults. See [CONFIGURATION.md](CONFIGURATION.md).

## Lifecycle and Registration

| Member                    | Behavior                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `attach(server)`          | Attaches the HTTP `upgrade` listener; returns a detach function. Reattaching to a different server throws.                     |
| `register(type, handler)` | Registers a message handler and returns an unregister function.                                                                |
| `start()`                 | Starts manager heartbeat. It does not listen on the HTTP server.                                                               |
| `stop()`                  | Idempotently stops upgrades, closes managed clients, stops heartbeat, and closes `ws` server. It is not a drain-and-await API. |
| `connectionManager`       | Exposes manager methods described below.                                                                                       |
| `messageRouter`           | Exposes `register`, `dispatch`, and handler map.                                                                               |

The caller owns HTTP server creation/listen/TLS. The engine uses `ws` `noServer` mode and does not provide path routing.

## Connection Manager

| Method                                                | Result and behavior                                                                                                                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add(clientId, ws, identity = {})`                    | Adds a client or returns `null` at the limit.                                                                                                                               |
| `remove(clientId)`                                    | Removes client and group memberships; returns boolean.                                                                                                                      |
| `get(clientId)` / `size()`                            | Lookup record / current count.                                                                                                                                              |
| `sendTo(clientId, payload)`                           | Sends to one open socket; returns boolean. Strings send as-is; other values JSON serialize.                                                                                 |
| `broadcast(payload, filter?)`                         | Sends to matching clients; returns successful `ws.send` invocation count. It does not prove client processing.                                                              |
| `subscribe(clientId, group, req?)`                    | **Phase 1 API change:** returns `Promise<boolean>` and applies `authorizeSubscription` using the client's identity, group, and optional request. Default authorizer denies. |
| `unsubscribe(clientId, group)`                        | Removes membership; returns boolean.                                                                                                                                        |
| `publish(group, payload, filter?)`                    | Sends to group members; returns successful send count.                                                                                                                      |
| `startHeartbeat()` / `stopHeartbeat()` / `closeAll()` | Start/stop heartbeat; close and remove all clients.                                                                                                                         |

The handler context exposes `ctx.subscribe(group)`, which passes the original upgrade request to the same manager authorization path. Rejection, authorization throw, or client removal while authorization is pending returns false. Existing callers that expected synchronous boolean return from `connectionManager.subscribe` must now await the promise.

## Message Router

`messageRouter.dispatch(ctx, raw)` decodes JSON and dispatches by string `type`. Malformed JSON, invalid envelope, unknown type and handler exceptions use the current fixed error responses documented in [WEBSOCKET_PROTOCOL.md](WEBSOCKET_PROTOCOL.md#router-errors).
