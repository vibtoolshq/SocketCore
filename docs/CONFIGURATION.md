# Configuration Reference

The standalone app reads these names from `process.env` in `app.js`. It does not load a `.env` file. Unless noted, numeric values must be integers at least 1. Invalid values throw during startup.
The standalone app reads these names from `process.env` in `app.js`. It does not load a `.env` file. Defaults are centralized in `engine/config.js`; the app uses those constants as environment fallbacks. Unless noted, numeric values must be integers at least 1. Invalid values throw during startup.

## Required Authentication Settings

| Variable       | Required / default           | Behavior                                                                                                                                                                                        |
| -------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKENS`  | Required; no default         | Comma-separated tokens; values are trimmed and empty entries removed. Startup fails if none remain. Requests authenticate with the `x-auth-token` header.                                       |
| `ADMIN_TOKENS` | Optional; empty set if unset | Comma-separated tokens; values are trimmed. Every admin token must also occur in `AUTH_TOKENS`, or startup fails. These clients receive role `admin`; other valid tokens receive role `client`. |

Tokens are compared as exact strings after configuration entries are trimmed. The request header value itself is not trimmed by the app.

## Listener and Origin

| Variable          | Default    | Validation and behavior                                                                                                                                                                                                                             |
| ----------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`            | `8080`     | Integer >= 1. Used by `server.listen(PORT)`.                                                                                                                                                                                                        |
| `ALLOWED_ORIGINS` | Empty list | Comma-separated exact origin strings, trimmed and with empty entries removed. `*` anywhere in the list enables all origins. Requests with no `Origin` header are allowed. If an `Origin` is present and the list is empty, the request is rejected. |

`ALLOWED_ORIGINS` is an origin comparison, not a URL path rule. The app has no explicit WebSocket path restriction.

## Heartbeat

| Variable                       | Default | Validation and behavior                                                                     |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------- |
| `HEARTBEAT_INTERVAL_MS`        | `30000` | Integer >= 0. Zero disables the connection manager's heartbeat timer.                       |
| `HEARTBEAT_STALE_THRESHOLD_MS` | `45000` | Integer >= 0. Clients whose last pong exceeds this age are terminated on a heartbeat check. |

## Connection and Message Limits

| Variable                                |   Default | Behavior                                                                                                        |
| --------------------------------------- | --------: | --------------------------------------------------------------------------------------------------------------- |
| `WS_MAX_CONNECTIONS`                    |   `10000` | Maximum tracked connections. Integer >= 1.                                                                      |
| `WS_MAX_PENDING_UPGRADES`               |     `256` | Maximum concurrent in-progress upgrade checks. Integer >= 1. Excess upgrades are rejected as server busy.       |
| `WS_MAX_MESSAGES_PER_SECOND`            |     `100` | Per-client token-bucket message rate. Integer >= 1. Exceeding the rate closes the WebSocket with code 1008.     |
| `WS_MAX_CONCURRENT_MESSAGES_PER_CLIENT` |      `32` | Maximum simultaneously dispatched messages per client. Integer >= 1. Exceeding the limit closes with code 1013. |
| `WS_MAX_PAYLOAD_BYTES`                  |   `65536` | Maximum WebSocket message payload passed to `ws`. Integer >= 1.                                                 |
| `WS_MAX_BUFFERED_BYTES`                 | `1048576` | Maximum outgoing buffered bytes checked before sending. Integer >= 1. A slow client is closed with code 1013.   |
| `WS_MAX_SUBSCRIPTIONS`                  |     `100` | Maximum distinct groups per client. Integer >= 1.                                                               |
| `WS_MAX_GROUP_NAME_LENGTH`              |     `128` | Maximum group string length accepted by the connection manager. Integer >= 1.                                   |
| `WS_PER_MESSAGE_DEFLATE`                |   `false` | Compression is enabled only when the exact value is the string `true`; otherwise it is disabled.                |

The application-level numeric reader rejects non-integers and values below the minimum. The engine's direct API accepts `Infinity` for its resource limit options, but environment variables cannot configure `Infinity` through `app.js`.
The application-level numeric reader rejects non-integers and values below the minimum. The engine and direct connection-manager APIs accept explicit `Infinity` for supported limit options, but defaults are finite and environment variables cannot configure `Infinity` through `app.js`. The engine rejects unknown keys and invalid object shapes in `limits` and `heartbeat` options.

## Example

PowerShell:

```powershell
$env:AUTH_TOKENS = "client-token,admin-token"
$env:ADMIN_TOKENS = "admin-token"
$env:ALLOWED_ORIGINS = "https://app.example"
$env:PORT = "8080"
npm start
```

Do not put real token values in tracked documentation, source, or shell history intended for sharing.
