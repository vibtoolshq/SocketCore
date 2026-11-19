# Exact Library Configuration Defaults

Values below come from `engine/config.js` and `engine/index.js` at the audited revision. For standalone environment mapping, see [CONFIGURATION.md](../CONFIGURATION.md).

## `limits` — positive integer or `Infinity`

| Key | Default | Effect |
| --- | ---: | --- |
| `maxConnections` | 10000 | Managed active client ceiling |
| `maxPendingUpgrades` | 256 | Concurrent pending origin/auth upgrades, including timed-out provider work not settled |
| `maxMessagesPerSecond` | 100 | Per-client inbound token-bucket rate |
| `maxConcurrentMessagesPerClient` | 32 | Active handler work per client |
| `maxGlobalConcurrentMessages` | 1024 | In-flight handler work per engine |
| `maxPayloadBytes` | 65536 | Inbound WebSocket payload limit |
| `maxBufferedBytes` | 1048576 | Per-client pending socket buffer threshold |
| `maxSubscriptionsPerClient` | 100 | Maximum distinct groups per client |
| `maxGroupNameLength` | 128 | Maximum group-name string length |
| `maxGlobalMessagesPerSecond` | 500 | Engine-wide inbound token bucket |
| `maxTotalBufferedBytes` | 67108864 | Accepted outgoing send bytes pending callback (64 MiB) |

All keys are optional **shallow overrides**. Unknown keys and non-positive/non-integer values throw `TypeError`. `Infinity` is explicitly accepted for limits in the library API; disabling a safeguard is not a deployment recommendation. These are **defaults**, not measured capacity guarantees.

## `heartbeat` — non-negative integer milliseconds

| Key | Default | Effect |
| --- | ---: | --- |
| `heartbeatIntervalMs` | 30000 | Ping scan interval; 0 disables heartbeat timer |
| `staleThresholdMs` | 45000 | Terminate client whose last pong is older than threshold |

## `timeouts` — positive integer milliseconds

| Key | Default | Effect |
| --- | ---: | --- |
| `originCheckMs` | 5000 | Origin callback deadline |
| `authenticateMs` | 5000 | Identity callback deadline |
| `shutdownDrainMs` | 10000 | Wait for closing clients before forced termination |
| `metricsIntervalMs` | 10000 | Event-loop-lag sampling interval when metrics hooks enabled |

**Other top-level options:** `authenticate` is required; `authorizeSubscription` default async false, `allowedOrigins: []`, `path` optional, `websocket.perMessageDeflate: false`, `logger: console`, `metrics: {}`. `path` must be an absolute pathname beginning `/`, with no `?` or fragment; absent means the engine handles upgrades regardless of path.

```js
const { createEngine } = require("configurable-websocket-engine");
const engine = createEngine({
  authenticate: req => req.headers["x-auth-token"] === "local-only" ? { role: "client" } : null,
  allowedOrigins: ["https://example.test"],
  limits: { maxConnections: 400, maxGlobalMessagesPerSecond: 600 },
  heartbeat: { heartbeatIntervalMs: 15000 },
  timeouts: { authenticateMs: 3000, shutdownDrainMs: 5000 },
  websocket: { perMessageDeflate: false },
});
```

The host is responsible for actual TLS and authentication. The `websocket` object is **not** a general forwarding mechanism for arbitrary `ws` server options.

## Standalone-only environment

The repository's `app.js` (not shipped inside npm package) reads `AUTH_TOKENS`, `ADMIN_TOKENS`, `ALLOWED_ORIGINS`, `PORT`, `WS_PER_MESSAGE_DEFLATE`, `HEARTBEAT_INTERVAL_MS`, `HEARTBEAT_STALE_THRESHOLD_MS`, `WS_ORIGIN_CHECK_TIMEOUT_MS`, `WS_AUTH_TIMEOUT_MS`, `WS_SHUTDOWN_DRAIN_TIMEOUT_MS`, `WS_MAX_CONNECTIONS`, `WS_MAX_PENDING_UPGRADES`, `WS_MAX_MESSAGES_PER_SECOND`, `WS_MAX_GLOBAL_MESSAGES_PER_SECOND`, `WS_MAX_CONCURRENT_MESSAGES_PER_CLIENT`, `WS_MAX_PAYLOAD_BYTES`, `WS_MAX_BUFFERED_BYTES`, `WS_MAX_TOTAL_BUFFERED_BYTES`, `WS_MAX_SUBSCRIPTIONS`, and `WS_MAX_GROUP_NAME_LENGTH`. Their exact mapping and numeric parsing are in [the existing environment table](../CONFIGURATION.md). `app.js` does **not** expose `maxGlobalConcurrentMessages` or `metricsIntervalMs` as env variables, and does not load `.env` automatically.

No database connection-string or external secret-manager integration is implemented.
