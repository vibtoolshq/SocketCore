# `createEngine` Factory and Engine Lifecycle

**Module:** root `configurable-websocket-engine`. **Signature:** `createEngine({ authenticate, authorizeSubscription = async () => false, allowedOrigins = [], path, limits = {}, heartbeat = {}, timeouts = {}, websocket = {}, logger = console, metrics = {} } = {})`. **Returns:** a plain object with six named properties.

| Option | Required? | Runtime contract / default |
| --- | --- | --- |
| `authenticate` | **Yes** | `(req, { signal }) => object | Promise<object>`; a truthy non-array object is required; rejection/no identity denies upgrade |
| `authorizeSubscription` | No | `(identity, group, req) => boolean | Promise<boolean>`, defaults to async **false** |
| `allowedOrigins` | No | `[]` exact list, `"*"`, or `(origin, req, { signal }) => boolean | Promise<boolean>`. **Missing Origin is accepted** |
| `path` | No | Absolute URL pathname string without query/fragment; omitted means no path filter |
| `limits` | No | Shallow object of known positive integer or `Infinity` limits; see [defaults](../reference/configuration.md) |
| `heartbeat` | No | Shallow object of known non-negative millisecond integers |
| `timeouts` | No | Shallow object of known positive millisecond integers |
| `websocket` | No | `perMessageDeflate` forwarded to `ws`, defaults `false`; other fields are not forwarded |
| `logger` | No | Default `console`; optional `warn(message, safeDetails)` / `error(message, safeDetails)` |
| `metrics` | No | `increment(name, value?, attributes?)`, `gauge(name, value, attributes?)`, `observe(name, value, attributes?)`; callback errors isolated |

**Failures:** synchronous `TypeError` if authentication/authorization callback missing/wrong, invalid path, unknown/invalid limits/heartbeat/timeouts, or malformed metrics callbacks. Handler registration also validates functions. Runtime provider errors are converted into upgrade statuses as described in [errors](messages.md).

## Returned engine object

| Member and exact call | Return | Behavior / failure |
| --- | --- | --- |
| `engine.attach(server)` | `() => void` detach function | Adds `upgrade` listener to Node HTTP(S) server; same-server attach is idempotent. Attaching another server while attached throws. After stop throws |
| `engine.register(type, handler)` | `() => boolean` (unregister operation returns `Map.delete` outcome) | Replaces handler under type, registered as `handler(ctx, message)`. Non-function throws |
| `engine.start()` | `undefined` | Starts heartbeat and metrics timer. Does **not** listen on a port. Throws after stop |
| `engine.stop()` | `Promise<void>` | Idempotent; detach, abort active cooperative callbacks/handlers, stop metrics, drain WS clients (1001) and close internal WS server. No restart |
| `engine.connectionManager` | Plain object | [Connection manager reference](connections.md) |
| `engine.messageRouter` | Plain object | [Router reference](messages.md) |

The host calls `server.listen(...)` itself, and `await engine.stop()` **before** `server.close()`. Stopping the engine is terminal: make a new engine instance to restart. A path mismatch is ignored by this engine and **is not automatically rejected**; another upgrade listener or the host must handle it.

## Callback deadlines and cancellation

The origin callback is evaluated before authentication. `originCheckMs` and `authenticateMs` limit how long the engine waits. The `AbortSignal` passed as `{signal}` is aborted on timeout/stop. A non-cooperative provider promise can keep a pending-upgrade slot until **the provider settles**; JavaScript does not forcibly terminate its work. Socket removal/engine stop also aborts each connection handler's `ctx.signal`; asynchronously running handlers retain in-flight capacity until settled.

## Example: separate application policies

```js
const { createEngine } = require("configurable-websocket-engine");

const engine = createEngine({
  path: "/realtime",
  authenticate: (req, { signal }) =>
    signal.aborted ? null : (req.headers["x-auth-token"] === "local-only" ? { role: "client" } : null),
  allowedOrigins: ["https://app.example"],
  limits: { maxConnections: 250, maxPayloadBytes: 32 * 1024 },
  timeouts: { authenticateMs: 2500 },
});
engine.register("ping", (ctx) => ctx.reply({ type: "pong" }));
```

The example uses a demonstration token; production applications must provide proper credential lifecycle and transport. See [quickstart](../getting-started/quickstart.md) for a runnable listener.
