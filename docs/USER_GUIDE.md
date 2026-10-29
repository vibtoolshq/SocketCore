# User Guide

This guide covers the standalone sample server and how to connect to it. It does not describe a browser UI, REST API, or HTTP health endpoint; none is implemented in this repository. For embedding the engine in another server, see [ENGINE_API.md](ENGINE_API.md). Deployment prerequisites and responsibility boundaries are in [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md).

## Requirements

- Node.js `>=20` (`package.json` declares this engine requirement).
- npm, to install the declared `ws` dependency and run package scripts.
- At least one authentication token supplied through `AUTH_TOKENS` before starting the app.
- A free listening port, or a different positive integer supplied through `PORT`.

## Install and Start

From the repository root:

```sh
npm install
```

Set an authentication token in the environment, then start the server. The app reads `process.env` directly and does not read `.env` files:

PowerShell:

```powershell
$env:AUTH_TOKENS = "replace-with-a-local-client-token"
npm start
```

POSIX shell:

```sh
AUTH_TOKENS='replace-with-a-local-client-token' npm start
```

The default listening port is `8080`. Set `PORT` to a different positive integer to change it. The app logs the listening port after the HTTP server begins listening. This standalone listener uses plain HTTP; it is intended for local use unless TLS is provided by an external trusted proxy. For direct HTTPS embedding, the application must create an HTTPS server and attach the engine to it.

To configure an admin token, it must also be included in `AUTH_TOKENS`:

```powershell
$env:AUTH_TOKENS = "client-token,admin-token"
$env:ADMIN_TOKENS = "admin-token"
npm start
```

Use a protected local secret store for development and a deployment secret manager or equivalent protected environment injection in real deployments. Do not commit credentials, place tokens in URLs, or log them. Every admin token must also be present in `AUTH_TOKENS`; startup fails otherwise.

## Connect

Connect to the server's WebSocket URL and send the `x-auth-token` handshake header. The app accepts an absent `Origin`; when the client sends `Origin`, it must exactly match `ALLOWED_ORIGINS`, unless the configured list includes `*`. The origin check is not authentication: all clients still need a valid token. See [CONFIGURATION.md](CONFIGURATION.md) for exact policy.

Example using the installed `ws` package from a Node.js client:

```js
const WebSocket = require("ws");

const socket = new WebSocket(process.env.WS_URL, {
  headers: {
    "x-auth-token": process.env.WS_TOKEN,
    ...(process.env.WS_ORIGIN ? { Origin: process.env.WS_ORIGIN } : {}),
  },
});

socket.on("message", (data) => {
  console.log(JSON.parse(data.toString()));
});

socket.on("open", () => {
  socket.send(JSON.stringify({ type: "status", data: { request: "health" } }));
});
```

The example's `health` request is not a special operation; it follows the normal status acknowledgement path and is echoed in the response. To request a client-count snapshot, use `data.request: "snapshot"` and authenticate with an admin token.

The server sends a `connected` message containing a generated `clientId` after the WebSocket upgrade succeeds. Invalid origin or authentication is rejected during the HTTP upgrade; see [WEBSOCKET_PROTOCOL.md](WEBSOCKET_PROTOCOL.md#upgrade-rejections). The standalone app does not check the URL path, so `WS_URL` must point to the server host/port but there is no built-in `/ws` route.

## Available Built-in Messages

Send each message as JSON with a string `type`:

```json
{ "type": "command", "name": "ping" }
```

```json
{ "type": "command", "name": "echo", "args": { "text": "hello" } }
```

```json
{ "type": "status", "data": { "request": "health" } }
```

`ping` and `echo` are available to any authenticated client. `status` normally acknowledges and echoes `data`. Admin-only operations, exact response envelopes, and error codes are in [WEBSOCKET_PROTOCOL.md](WEBSOCKET_PROTOCOL.md).

## Built-in Handler Examples

`command.ping` returns:

```json
{
  "type": "command",
  "name": "ping",
  "result": { "pong": true, "at": 1793217600000 }
}
```

`status` echoes its `data` under `echo` and includes `ack` and `serverTime`:

```json
{
  "type": "status",
  "data": {
    "ack": true,
    "serverTime": 1793217600000,
    "echo": { "request": "health" }
  }
}
```

The timestamp values above are examples in Unix milliseconds. The `health` request is not a health probe for the server process; it exercises the status echo handler only.

## Stop and Test

Stop the standalone app with Ctrl+C (SIGINT). The app also handles SIGTERM, stops accepting upgrades, waits for WebSocket close handshakes up to `WS_SHUTDOWN_DRAIN_TIMEOUT_MS`, terminates remaining clients, then closes the HTTP server. See [CONFIGURATION.md](CONFIGURATION.md) for the timeout default.

Run the repository's correctness tests with:

```sh
npm test
```

The package script runs Node's built-in test runner (`node --test`). The current suite has 12 tests covering selected configuration, handshake, authorization, publish, limit, timeout, shutdown, observability, and composition behavior. It is not a load test and does not mean every option has a dedicated test.

## Troubleshooting

| Symptom                                                      | Likely explanation                                                                           | Check                                                                                        |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| App exits with `AUTH_TOKENS must contain at least one token` | No non-empty token was configured.                                                           | Set `AUTH_TOKENS` in the same shell/process environment used to start the app.               |
| Upgrade returns `401`                                        | Missing/unknown token or token is not an exact match.                                        | Send `x-auth-token`; check whitespace and configured values without printing secrets.        |
| Upgrade returns `403`                                        | A supplied Origin is not in the exact allowlist.                                             | Compare scheme, host, and port with `ALLOWED_ORIGINS`; omitted Origin is treated separately. |
| Upgrade returns `503`                                        | Engine is stopping, admission is full, or an origin/auth callback timed out.                 | Check configured limits, callback duration, and lifecycle logs/metrics.                      |
| Client closes with `1008` or `1013`                          | A message-rate/concurrency policy was exceeded, or a slow-client limit was reached.          | Inspect close reason and configured limits; do not increase limits without workload testing. |
| A client cannot join a group                                 | The standalone app uses default-deny subscription authorization and exposes no join message. | Implement an application handler and authorizer through the library API.                     |

Do not treat an absent `/health` endpoint as a server failure: this package does not create one. Add deployment-owned readiness checks in the embedding application or platform.

## Current Limitations

- There is no built-in browser page, REST endpoint, durable storage, or built-in join/subscribe client message.
- The engine's default subscription authorization denies all subscriptions. The standalone app does not provide an override.
- The app creates a plain HTTP server; TLS configuration is not implemented in `app.js`.
- No specific deployment platform or proxy configuration is defined by this repository.
