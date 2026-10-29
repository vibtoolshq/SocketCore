# Engine Library API

The package exports only `{ createEngine }` from its root CommonJS entry. Internal files such as `engine/config.js` and `engine/observability.js` are implementation details, not package subpath exports. The package does not create an HTTP listener; the embedding application owns server creation, TLS, routes, listen, and close.

## Factory Options

```js
const { createEngine } = require("configurable-websocket-engine");

const engine = createEngine({
  authenticate: async (req) => verifyRequest(req),
  metrics: {
    increment(name, value, attributes) {},
    gauge(name, value, attributes) {},
    observe(name, value, attributes) {},
  },
});
```

| Option                  | Default             | Behavior                                                                                                                         |
| ----------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `authenticate`          | Required            | Async-capable callback; return a non-null, non-array identity object to accept. Bounded by `timeouts.authenticateMs`.            |
| `authorizeSubscription` | Async deny          | Async `(identity, group, req)` callback; false/throw denies.                                                                     |
| `allowedOrigins`        | `[]`                | Exact origin array, `"*"`, or callback `(origin, req)`; callback bounded by `timeouts.originCheckMs`. Missing Origin is allowed. |
| `limits`                | `DEFAULT_LIMITS`    | Shallow override. Unknown keys and invalid values throw. Explicit `Infinity` is accepted for supported limits.                   |
| `heartbeat`             | `DEFAULT_HEARTBEAT` | Known keys only; non-negative integer milliseconds.                                                                              |
| `timeouts`              | `DEFAULT_TIMEOUTS`  | Known keys only; positive integer milliseconds.                                                                                  |
| `websocket`             | `{}`                | `perMessageDeflate` defaults to false.                                                                                           |
| `logger`                | `console`           | Logger; errors passed through engine helpers are reduced to safe `name`/`code` fields.                                           |
| `metrics`               | `{}`                | Optional `increment`, `gauge`, `observe` callbacks. Callback throws/rejections are isolated.                                     |

`limits`, `heartbeat`, and `timeouts` are shallow overrides. Unknown keys throw `TypeError`. Limit values must be positive integers or `Infinity`; heartbeat values must be non-negative integers; timeout values must be positive integers. The optional aggregate message and pending-send limits default to `Infinity`. The documented `websocket` setting is `perMessageDeflate`, default false; arbitrary WebSocket server options are not forwarded.

`allowedOrigins` accepts an array of exact origin strings, the string `"*"`, or an async-capable callback `(origin, req)`. A missing Origin is always allowed. An empty array therefore rejects every provided Origin while still allowing a request with no Origin header. This policy does not authenticate a client.

`authenticate(req)` must resolve to a non-null, non-array object identity or the upgrade is rejected. A rejected/throwing callback results in an upgrade error; a callback exceeding `timeouts.authenticateMs` receives an HTTP 503 rejection. The timeout cannot cancel arbitrary work already started by the callback.

The package does not expose config or observability subpaths; consumers configure the supported defaults and hooks through `createEngine`. See [CONFIGURATION.md](CONFIGURATION.md) for standalone environment mapping.

## Application Composition and Extension Contracts

Each application creates its own engine instance with its own `authenticate`, `allowedOrigins`, `authorizeSubscription`, `limits`, `timeouts`, `logger`, and optional `metrics` callbacks, then registers application-specific message handlers with `engine.register(type, handler)`. The transport core does not import the sample `command` or `status` handlers; `app.js` composes those handlers for the standalone sample app.

The Phase 3 integration test configures two independent servers with different credential headers, origins, identities, message types, and metrics collectors using the same public API. This demonstrates separate in-process app configuration; it is not a cross-process/shared-state adapter.

| Extension                  | Contract                                                                                     | Status                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Authentication             | `authenticate(req)` returns an identity object or rejects; callback has configured deadline. | Public factory callback.                                |
| Subscription authorization | `authorizeSubscription(identity, group, req)` resolves truthy to allow.                      | Public factory callback; default denies.                |
| Metrics                    | `increment(name, value, attributes)`, `gauge(...)`, `observe(...)`.                          | Public callback contract; no exporter/backend included. |
| Logging                    | Logger object with `warn`/`error`; safe helper emits error name/code only.                   | Public factory option; no logging backend included.     |
| Pubsub/store/codec         | No contract is exposed.                                                                      | Deferred until a named consumer requires one.           |

No database, Redis/NATS client, serialization dependency, or dynamic plugin mechanism is part of the current extension surface.

## Minimal Application Example

The following illustrates ownership boundaries. `verifyCredential` and the certificate loading mechanism are application responsibilities and are not provided by this package.

```js
const https = require("node:https");
const { createEngine } = require("configurable-websocket-engine");

const server = https.createServer(tlsOptions);
const engine = createEngine({
  authenticate: (req) => verifyCredential(req.headers.authorization),
  allowedOrigins: ["https://client.example"],
});

engine.register("status", async (ctx, message) => {
  ctx.reply({ type: "status", result: message.data ?? null });
});
engine.attach(server);
engine.start();
server.listen(8443);

async function shutdown() {
  await engine.stop();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
```

Production TLS, secret handling, graceful process signals, monitoring integration, and workload sizing are application/deployment responsibilities; see [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md).

## Metrics Contract

Callbacks receive `(name, value, attributes)`. Current metric names include `ws.connections.active` (gauge), `ws.connections.closed` (counter), `ws.upgrades.accepted`, `ws.upgrades.rejected`, `ws.messages.in`, `ws.messages.out`, `ws.messages.dropped`, `ws.messages.handler_failures`, `ws.messages.dispatch_failures`, `ws.send.failures`, `ws.buffered_bytes.total` (gauge), and `ws.event_loop_lag_ms` (observation). Not every metric callback is invoked with all three arguments; omitted values/attributes are `undefined` according to the event.

Attributes are low-cardinality reasons/status codes; tokens, request URLs, and identities are not labels. Event-loop-lag sampling runs only when at least one metrics callback is configured and the engine is started. The default sampling interval is 10 seconds (`timeouts.metricsIntervalMs`); the standalone app does not expose it as an environment variable.

The hooks do not include a metrics backend/exporter. The embedding application owns storage/export and must make its callback safe for its own environment.

## Lifecycle

| Member                    | Behavior                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `attach(server)`          | Attaches the HTTP `upgrade` listener and returns a detach function.                                                                                                             |
| `register(type, handler)` | Registers a message handler and returns an unregister function.                                                                                                                 |
| `start()`                 | Starts heartbeat and configured metrics sampling. Caller owns HTTP listen/TLS.                                                                                                  |
| `stop()`                  | Returns an idempotent `Promise`; detaches upgrades, drains clients up to `shutdownDrainMs`, terminates remaining sockets, stops heartbeat/metrics, then closes the `ws` server. |
| `connectionManager`       | Exposes connection lookup, sends, subscriptions, `drain(timeoutMs)`, and existing manager methods.                                                                              |
| `messageRouter`           | Exposes `register`, `dispatch`, and handler map.                                                                                                                                |

`attach(server)` may be called repeatedly with the same server and returns a detach function. Attaching the same engine to a different server while attached throws. After `stop()`, the engine cannot be restarted or reattached. The caller should await `stop()` before closing the underlying HTTP/HTTPS listener.

The engine uses `ws` `noServer` mode. It does not provide path routing or TLS setup.

## Connection Manager

| Method                             | Result and behavior                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `add(clientId, ws, identity = {})` | Adds client or returns `null` at connection cap.                                                                    |
| `remove(clientId)`                 | Removes client and memberships; returns boolean; pending send bytes are released.                                   |
| `get(clientId)` / `size()`         | Lookup record / active count.                                                                                       |
| `sendTo(clientId, payload)`        | Sends to one open socket; returns boolean. Strings are sent as-is; other values JSON serialize.                     |
| `broadcast(payload, filter?)`      | Returns successful `ws.send` invocation count, not client-side processing acknowledgement.                          |
| `subscribe(clientId, group, req?)` | Returns `Promise<boolean>` and applies `authorizeSubscription`; default authorizer denies.                          |
| `unsubscribe(clientId, group)`     | Removes group membership; returns boolean.                                                                          |
| `publish(group, payload, filter?)` | Returns successful send count to matching members.                                                                  |
| `drain(timeoutMs?)`                | Closes clients with 1001, waits for close events up to timeout, terminates/removes remaining clients, and resolves. |
| `closeAll()`                       | Immediate close/removal compatibility method; use `drain()` for shutdown.                                           |

The optional `filter` passed to `broadcast`/`publish` is called synchronously with each managed client record. `broadcast` sends to every matching connection; `publish` sends only to current group members. Both counts represent successful synchronous `ws.send` calls and do not confirm that recipients parsed or acted on the message.

## Handler Context and Message Routing

Handlers are registered as `engine.register(type, async (ctx, message) => { ... })`. `type` is the incoming JSON string's exact `type` value. The context provides:

| Member | Behavior |
| --- | --- |
| `ctx.clientId` | Generated connection identifier. |
| `ctx.identity` / `ctx.meta` | Authenticated identity object. |
| `ctx.client` | Managed connection record. |
| `ctx.reply(payload)` | Sends a JSON-serialized payload to this client; returns a boolean. |
| `ctx.subscribe(group)` | Promise resolving to whether the group subscription was authorized and created. |
| `ctx.unsubscribe(group)` | Removes this client's group membership; returns a boolean. |
| `ctx.publish(group, payload)` | Sends to group members; returns successful send count. |

The router returns protocol errors for malformed JSON, missing/non-string message type, and unknown handler type. Handler exceptions are logged through the safe logger helper and produce a generic `HANDLER_FAILED` response. Keep handler work bounded; message concurrency is limited per client, but handler execution is not automatically cancelled on disconnect.

`connectionManager.subscribe` is async since Phase 1. Callers must await its `Promise<boolean>`. The handler context passes the original upgrade request to the same authorizer path.
