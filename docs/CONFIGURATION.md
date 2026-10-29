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

The app compares token header contents exactly; configured token entries are trimmed, while the received header is not trimmed by the app. It does not impose a WebSocket path. `ALLOWED_ORIGINS` is an exact comma-separated list; whitespace around entries is trimmed. If the list contains `*`, the app enables wildcard Origin acceptance. An absent Origin is allowed regardless of the list. Origin validation is not authentication.

## Heartbeat and Callback/Shutdown Timeouts

| Variable                       | Default | Behavior                                                                                             |
| ------------------------------ | ------: | ---------------------------------------------------------------------------------------------------- |
| `HEARTBEAT_INTERVAL_MS`        | `30000` | Integer >= 0; zero disables heartbeat timer.                                                         |
| `HEARTBEAT_STALE_THRESHOLD_MS` | `45000` | Integer >= 0; older pong timestamps are terminated on heartbeat check.                               |
| `WS_ORIGIN_CHECK_TIMEOUT_MS`   |  `5000` | Positive integer; deadline for async origin-check callback. Timeout rejects upgrade with HTTP 503.   |
| `WS_AUTH_TIMEOUT_MS`           |  `5000` | Positive integer; deadline for async authentication callback. Timeout rejects upgrade with HTTP 503. |
| `WS_SHUTDOWN_DRAIN_TIMEOUT_MS` | `10000` | Positive integer; wait for WebSocket close handshakes before terminating remaining sockets.          |

The standalone app uses a fixed 10-second metrics sampling interval when a library metrics hook is supplied; it has no metrics backend environment setting. A callback timeout releases the pending-upgrade slot, but JavaScript cannot cancel an arbitrary promise. A timed-out auth/origin provider may continue its own work unless that provider supports cancellation.

For library users, `timeouts.metricsIntervalMs` controls event-loop-lag sampling when at least one metrics callback is configured and `engine.start()` has been called. The standalone app does not expose this timeout as an environment variable; it uses the library default.

## Connection and Message Limits

| Variable                                |               Default | Behavior                                                                                                                                   |
| --------------------------------------- | --------------------: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `WS_MAX_CONNECTIONS`                    |               `10000` | Integer >= 1; maximum managed connections.                                                                                                 |
| `WS_MAX_PENDING_UPGRADES`               |                 `256` | Integer >= 1; concurrent in-progress upgrade checks.                                                                                       |
| `WS_MAX_MESSAGES_PER_SECOND`            |                 `100` | Integer >= 1; token bucket per connection; violation closes with 1008.                                                                     |
| `WS_MAX_GLOBAL_MESSAGES_PER_SECOND`     | Disabled (`Infinity`) | Optional positive integer token bucket shared by the engine instance; violation closes the sending client with 1008.                       |
| `WS_MAX_CONCURRENT_MESSAGES_PER_CLIENT` |                  `32` | Integer >= 1; violation closes with 1013.                                                                                                  |
| `WS_MAX_PAYLOAD_BYTES`                  |               `65536` | Integer >= 1; inbound WebSocket payload limit.                                                                                             |
| `WS_MAX_BUFFERED_BYTES`                 |             `1048576` | Integer >= 1; per-client socket-buffer threshold; slow client closes with 1013.                                                            |
| `WS_MAX_TOTAL_BUFFERED_BYTES`           | Disabled (`Infinity`) | Optional positive integer aggregate of accepted sends awaiting callbacks. Over-limit send is rejected without disconnecting the recipient. |
| `WS_MAX_SUBSCRIPTIONS`                  |                 `100` | Integer >= 1; distinct groups per client.                                                                                                  |
| `WS_MAX_GROUP_NAME_LENGTH`              |                 `128` | Integer >= 1; maximum group-name length.                                                                                                   |

The two aggregate limits are disabled by default because this repository does not define the deployment workload/SLO. Set finite values for a deployment only after sizing expected clients, rates, payloads and fanout. Their disabled defaults are not evidence of production capacity or a recommendation to leave them disabled in production.

The standalone app's numeric parser accepts positive integer strings for resource limits and callback/shutdown timeouts. The heartbeat interval and stale threshold accept non-negative integers; setting `HEARTBEAT_INTERVAL_MS=0` disables the heartbeat timer. The library API supports `Infinity` for limit fields, but the standalone environment parser cannot be configured with the literal string `Infinity`.

## Validation and Example

Environment numeric values must be finite integers meeting their minimum; an unset/empty value uses the fallback. `Infinity` is an internal library default for the optional aggregate controls and cannot be entered as an environment value.

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

The callback names above are application placeholders, not functions exported by the package. `limits`, `heartbeat`, and `timeouts` reject unknown keys and invalid values. The supported `websocket` setting documented here is `perMessageDeflate`; TLS, listener creation, routes, and path validation belong to the embedding application.
