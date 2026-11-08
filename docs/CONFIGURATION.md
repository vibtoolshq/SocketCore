# SocketCore Configuration Reference

**A reusable WebSocket core for real-time Node.js applications.** This reference documents SocketCore's standalone environment variables and the equivalent library configuration boundaries.

The standalone app reads settings from `process.env` in `app.js`; it does not load a `.env` file. Port, limits, heartbeat and timeout defaults are centralized in `engine/config.js`. Integer inputs are validated at startup. Unknown `limits`, `heartbeat`, and `timeouts` keys passed to the library API throw. The standalone app translates its environment variables into those library options; the package does not read environment variables itself.

For deployment guidance on TLS, secrets, workload sizing, monitoring, and items this package does not provide, see [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md).

## Authentication and Listener

| Variable                 | Default    | Behavior                                                                                                             |
| ------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKENS`            | Required   | Comma-separated tokens; trimmed, empty entries removed. Startup fails when none remain. Client sends `x-auth-token`. |
| `ADMIN_TOKENS`           | Empty      | Comma-separated tokens; each must also be in `AUTH_TOKENS`.                                                          |
| `PORT`                   | `8080`     | Integer >= 1; HTTP server listen port.                                                                               |
| `ALLOWED_ORIGINS`        | Empty list | Comma-separated exact origins. `*` allows every provided Origin. Requests without Origin are allowed.                |
| `WS_PER_MESSAGE_DEFLATE` | `false`    | Compression enabled only when the exact value is `true`.                                                             |

The app compares token header contents exactly; configured token entries are trimmed, while the received header is not trimmed by the app. The standalone app does not impose a WebSocket path or expose a path environment variable. Library consumers can set the optional `path` factory option to isolate engines sharing one HTTP server. `ALLOWED_ORIGINS` is an exact comma-separated list; whitespace around entries is trimmed. If the list contains `*`, the app enables wildcard Origin acceptance. An absent Origin is allowed regardless of the list. Origin validation is not authentication.

## Heartbeat and Callback/Shutdown Timeouts

| Variable                       | Default | Behavior                                                                                             |
| ------------------------------ | ------: | ---------------------------------------------------------------------------------------------------- |
| `HEARTBEAT_INTERVAL_MS`        | `30000` | Integer >= 0; zero disables heartbeat timer.                                                         |
| `HEARTBEAT_STALE_THRESHOLD_MS` | `45000` | Integer >= 0; older pong timestamps are terminated on heartbeat check.                               |
| `WS_ORIGIN_CHECK_TIMEOUT_MS`   |  `5000` | Positive integer; deadline for async origin-check callback. Timeout rejects upgrade with HTTP 503.   |
| `WS_AUTH_TIMEOUT_MS`           |  `5000` | Positive integer; deadline for async authentication callback. Timeout rejects upgrade with HTTP 503. |
| `WS_SHUTDOWN_DRAIN_TIMEOUT_MS` | `10000` | Positive integer; wait for WebSocket close handshakes before terminating remaining sockets.          |

Library authentication callbacks receive `authenticate(req, { signal })`; function-valued origin policies receive `(origin, req, { signal })`. The signal is aborted on the callback deadline and when `engine.stop()` begins. Existing callbacks that ignore trailing arguments remain compatible. The standalone app's built-in synchronous policies do not need to use the signal.

A timed-out callback still returns HTTP 503. Its `maxPendingUpgrades` work slot remains occupied until the underlying provider promise settles, so non-cooperative callback work is bounded by the configured admission limit. JavaScript cannot forcibly cancel arbitrary work that ignores the signal. `engine.stop()` aborts active callbacks and keeps the existing 503 stopping response. The standalone app uses a fixed 10-second metrics sampling interval when a library metrics hook is supplied; it has no metrics backend environment setting.

For library users, `timeouts.metricsIntervalMs` controls event-loop-lag sampling when at least one metrics callback is configured and `engine.start()` has been called. The standalone app does not expose this timeout as an environment variable; it uses the library default.

## Connection and Message Limits

| Variable                                |    Default | Behavior                                                                                                                                   |
| --------------------------------------- | ---------: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `WS_MAX_CONNECTIONS`                    |    `10000` | Integer >= 1; maximum managed connections.                                                                                                 |
| `WS_MAX_PENDING_UPGRADES`               |      `256` | Integer >= 1; concurrent upgrade checks plus timed-out provider work that has not settled.                                                 |
| `WS_MAX_MESSAGES_PER_SECOND`            |      `100` | Integer >= 1; token bucket per connection; violation closes with 1008.                                                                     |
| `WS_MAX_GLOBAL_MESSAGES_PER_SECOND`     |      `500` | Positive integer token bucket shared by the engine instance; violation closes the sending client with 1008.                                |
| `WS_MAX_CONCURRENT_MESSAGES_PER_CLIENT` |       `32` | Integer >= 1; violation closes with 1013.                                                                                                  |
| `WS_MAX_PAYLOAD_BYTES`                  |    `65536` | Integer >= 1; inbound WebSocket payload limit.                                                                                             |
| `WS_MAX_BUFFERED_BYTES`                 |  `1048576` | Integer >= 1; per-client socket-buffer threshold; slow client closes with 1013.                                                            |
| `WS_MAX_TOTAL_BUFFERED_BYTES`           | `67108864` | Positive integer aggregate of accepted sends awaiting callbacks (64 MiB). Over-limit send is rejected without disconnecting the recipient. |
| `WS_MAX_SUBSCRIPTIONS`                  |      `100` | Integer >= 1; distinct groups per client.                                                                                                  |
| `WS_MAX_GROUP_NAME_LENGTH`              |      `128` | Integer >= 1; maximum group-name length.                                                                                                   |

The library-only `limits.maxGlobalConcurrentMessages` setting defaults to `1024`, accepts a positive integer or `Infinity`, and bounds concurrently executing message-handler work across the engine instance. It is not exposed as a standalone environment variable; `app.js` uses the library default. When full, the engine closes the client that submitted additional work with 1013. A handler's slot remains occupied until its promise settles, even after its connection signal aborts.

The engine-wide message-rate and pending-buffer limits are active by default and can be overridden per app through environment variables or `createEngine({ limits })`. The default values are configurable guardrails, not a production capacity guarantee; tune them to expected client count, rates, payloads, fanout, and deployment budget. Library consumers may explicitly use `Infinity` to disable either limit; the standalone environment parser accepts positive integers only.

The standalone app's numeric parser accepts positive integer strings for resource limits and callback/shutdown timeouts. The heartbeat interval and stale threshold accept non-negative integers; setting `HEARTBEAT_INTERVAL_MS=0` disables the heartbeat timer. The library API supports `Infinity` for limit fields, but the standalone environment parser cannot be configured with the literal string `Infinity`.

## Validation and Example

Environment numeric values must be finite integers meeting their minimum; an unset/empty value uses the fallback. The library accepts explicit `Infinity` for supported limit fields, but the standalone environment parser does not accept the string `Infinity`.

```powershell
$env:AUTH_TOKENS = "client-token,admin-token"
$env:ADMIN_TOKENS = "admin-token"
$env:ALLOWED_ORIGINS = "https://app.example"
$env:WS_AUTH_TIMEOUT_MS = "5000"
$env:WS_MAX_GLOBAL_MESSAGES_PER_SECOND = "5000"
$env:WS_MAX_TOTAL_BUFFERED_BYTES = "268435456"
npm start
```

Do not commit real token values.

## Library-Only Configuration

When using `createEngine`, pass options directly; none of these are read from the environment automatically:

```js
const engine = createEngine({
  authenticate: async (req) => verifyApplicationCredential(req),
  path: "/ws",
  authorizeSubscription: async (identity, group, req) =>
    mayJoinGroup(identity, group, req),
  allowedOrigins: ["https://app.example"],
  limits: {
    maxConnections: 5000,
    maxGlobalMessagesPerSecond: 10000,
    maxTotalBufferedBytes: 128 * 1024 * 1024,
  },
  heartbeat: { heartbeatIntervalMs: 30000, staleThresholdMs: 45000 },
  timeouts: { authenticateMs: 3000, originCheckMs: 3000 },
  websocket: { perMessageDeflate: false },
});
```

The callback names above are application placeholders, not functions exported by the package. `limits`, `heartbeat`, and `timeouts` reject unknown keys and invalid values. The supported `websocket` setting documented here is `perMessageDeflate`; TLS and listener creation belong to the embedding application. The optional `path` filters which upgrade requests this engine handles; nonmatching requests pass to other server listeners, and the host owns any final unmatched-upgrade response.
