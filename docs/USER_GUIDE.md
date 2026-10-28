# User Guide

This guide covers the current standalone server implementation. It does not describe a browser UI or HTTP API; neither is present in the inspected source.

## Requirements

- Node.js `>=20` (`package.json` declares this engine requirement).
- npm, to install the declared `ws` dependency and run package scripts.
- At least one authentication token supplied through `AUTH_TOKENS` before starting the app.

## Install and Start

From the repository root:

```sh
npm install
```

Set an authentication token in the environment, then start the server:

PowerShell:

```powershell
$env:AUTH_TOKENS = "replace-with-a-local-client-token"
npm start
```

POSIX shell:

```sh
AUTH_TOKENS='replace-with-a-local-client-token' npm start
```

The default listening port is 8080. Set `PORT` to a different positive integer to change it. The app logs the listening port after the HTTP server begins listening. Configuration is read directly from process environment variables; the source does not load a `.env` file.

To configure an admin token, it must also be included in `AUTH_TOKENS`:

```powershell
$env:AUTH_TOKENS = "client-token,admin-token"
$env:ADMIN_TOKENS = "admin-token"
npm start
```

Use real secrets from a suitable local secret store in real deployments. Do not commit credentials.

## Connect

Connect to the server's WebSocket URL and send the `x-auth-token` handshake header. The app accepts an absent `Origin`; when the client sends `Origin`, it must match `ALLOWED_ORIGINS`, unless the configured list includes `*`. See [CONFIGURATION.md](CONFIGURATION.md) for exact policy.

Example using the installed `ws` package from a Node.js client:

```js
const WebSocket = require("ws");

const socket = new WebSocket(process.env.WS_URL, {
  headers: { "x-auth-token": process.env.WS_TOKEN },
});

socket.on("message", (data) => {
  console.log(JSON.parse(data.toString()));
});

socket.on("open", () => {
  socket.send(JSON.stringify({ type: "status", data: { request: "health" } }));
});
```

The example's `health` request is not a special operation; it follows the normal status acknowledgement path and is echoed in the response. To request a client-count snapshot, use `data.request: "snapshot"` and authenticate with an admin token.

The server sends a `connected` message containing a generated `clientId` after the WebSocket upgrade succeeds. Invalid origin or authentication is rejected during the HTTP upgrade; see [WEBSOCKET_PROTOCOL.md](WEBSOCKET_PROTOCOL.md#upgrade-rejections).

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

`ping` and `echo` are available to any authenticated client. `status` normally acknowledges and echoes `data`. Admin-only operations and response formats are in [WEBSOCKET_PROTOCOL.md](WEBSOCKET_PROTOCOL.md).

## Stop and Test

Stop the standalone app with Ctrl+C (SIGINT). The app also handles SIGTERM, stops accepting upgrades, waits for WebSocket close handshakes up to `WS_SHUTDOWN_DRAIN_TIMEOUT_MS`, terminates remaining clients, then closes the HTTP server. See [CONFIGURATION.md](CONFIGURATION.md) for the timeout default.

Run the repository's tests with:

```sh
npm test
```

The package script runs Node's built-in test runner (`node --test`). The current integration test exercises selected handshake, authorization, publish, and payload-limit behavior; it is not a claim that every configured limit has a dedicated test.

## Current Limitations

- There is no built-in browser page, REST endpoint, durable storage, or built-in join/subscribe client message.
- The engine's default subscription authorization denies all subscriptions. The standalone app does not provide an override.
- The app creates a plain HTTP server; TLS configuration is not implemented in `app.js`.
- No specific deployment platform or proxy configuration is defined by this repository.
