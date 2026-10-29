# SocketCore

**A reusable WebSocket core for real-time Node.js applications.**

SocketCore is a configurable Node.js WebSocket engine for authenticated real-time messaging. It provides connection management, JSON message routing, configurable admission and backpressure limits, heartbeat checks, metrics hooks, and bounded graceful shutdown, while leaving application-specific identity and message handlers to the host application.

> **Suggested GitHub repository description:** Reusable Node.js WebSocket engine for authenticated real-time messaging, configurable limits, backpressure, metrics hooks, and graceful shutdown.

## Features

- **Reusable engine API:** compose an engine with an existing Node.js HTTP or HTTPS server through `createEngine()` and `attach()`.
- **Required authentication hook:** every engine instance requires an `authenticate(req)` callback; the standalone sample uses the `x-auth-token` header.
- **Origin policy:** exact allowlists or an origin callback; absent `Origin` headers are allowed by the engine.
- **Message routing:** register handlers by JSON message `type`; malformed JSON, unknown message types, and handler failures receive structured errors.
- **Application-owned handlers:** the transport core is separate from the sample `command` and `status` handlers.
- **Subscription authorization:** async group authorization applies to both handler context and manager subscriptions; the default policy denies subscriptions.
- **Connection and payload limits:** finite defaults for managed connections, pending upgrades, frame payload size, client message rate, and concurrent messages.
- **Backpressure controls:** per-client socket-buffer limits are enabled by default; optional global message-rate and aggregate pending-send byte limits can be configured.
- **Heartbeat and liveness:** configurable ping interval and stale-pong threshold; setting the heartbeat interval to zero disables the timer.
- **Bounded callback timeouts:** origin and authentication callbacks have deadlines; timed-out callback Promises themselves cannot be forcibly cancelled.
- **Graceful shutdown:** stop accepting upgrades, close clients, wait for a bounded drain period, then terminate remaining sockets.
- **Metrics and safe logging hooks:** injectable callbacks for counters, gauges, observations, and logger methods; no metrics backend is bundled.
- **Local Python load harness:** repeatable loopback status, fanout, reconnect, latency, and resource measurements.

## Project Status

The package metadata reports version `1.0.0`, CommonJS, Node.js `>=20`, and the `ws` dependency. The public package export is `createEngine`. The technical package name in `package.json` remains `configurable-websocket-engine`; **SocketCore** is the project/repository brand used by these documents.

The repository includes a sample server and a provisional local load study, not a production capacity certification. The recorded 1,000- and 2,000-client loopback runs passed their provisional test thresholds on one Windows host. They do not establish a supported concurrency number for another host, network path, proxy, TLS setup, payload, or application workload. See [Load Testing](docs/LOAD_TESTING.md) and [Production Deployment](docs/PRODUCTION_DEPLOYMENT.md).

## Requirements

- Node.js `>=20`
- npm
- At least one non-empty `AUTH_TOKENS` value to run the standalone sample server

## Quick Start

From a checkout of this repository:

```sh
npm install
```

Set a local token and start the standalone HTTP server.

PowerShell:

```powershell
$env:AUTH_TOKENS = "local-client-token"
npm start
```

POSIX shell:

```sh
AUTH_TOKENS='local-client-token' npm start
```

The default listener is `http://localhost:8080` with WebSocket upgrades on that server. The app reads environment variables directly; it does not load a `.env` file. It uses plain HTTP and does not enforce a WebSocket URL path. Do not expose it directly to the public internet without supplying an appropriate TLS and deployment boundary.

### Admin Token

Admin tokens must also be listed in `AUTH_TOKENS`:

```powershell
$env:AUTH_TOKENS = "local-client-token,local-admin-token"
$env:ADMIN_TOKENS = "local-admin-token"
npm start
```

Use a secret manager or protected environment injection for real credentials. Do not commit or log token values.

## Connect

The standalone sample authenticates with `x-auth-token`. If you send an `Origin` header, it must exactly match an entry in `ALLOWED_ORIGINS`, unless wildcard is configured. A missing `Origin` is allowed and does not mean the client is authenticated.

```js
const WebSocket = require("ws");

const socket = new WebSocket("ws://localhost:8080", {
  headers: {
    "x-auth-token": process.env.WS_TOKEN,
    ...(process.env.WS_ORIGIN ? { Origin: process.env.WS_ORIGIN } : {}),
  },
});

socket.on("message", (data) => {
  console.log(JSON.parse(data.toString()));
});

socket.on("open", () => {
  socket.send(
    JSON.stringify({
      type: "status",
      data: { request: "health" },
    }),
  );
});
```

After the upgrade, the server sends a `connected` message containing a generated `clientId`. The `health` request above exercises the status echo handler; it is not an HTTP or process-health endpoint.

## Built-In Messages

The standalone app registers `status` and `command` handlers. A library consumer can register different handlers.

| Message                                  | Access               | Behavior                                                                        |
| ---------------------------------------- | -------------------- | ------------------------------------------------------------------------------- |
| `status`                                 | Authenticated client | Acknowledges the request and echoes `data`.                                     |
| `status` with `data.request: "snapshot"` | Admin                | Returns managed connection count and server time.                               |
| `status` with `data.broadcast: true`     | Admin                | Broadcasts status data to every other connection; sender gets no success reply. |
| `command` with `name: "ping"`            | Authenticated client | Returns a `pong` result with a Unix-millisecond timestamp.                      |
| `command` with `name: "echo"`            | Authenticated client | Returns supplied `args`, or `null`.                                             |
| `command` with `name: "broadcast"`       | Admin                | Sends args to other connections and returns the successful send count.          |
| `command` with `name: "shutdown-client"` | Admin                | Closes the named connection with code `1000`.                                   |

Example request and response:

```json
{ "type": "command", "name": "ping" }
```

```json
{
  "type": "command",
  "name": "ping",
  "result": { "pong": true, "at": 1793217600000 }
}
```

Broadcast counts represent successful `ws.send` calls, not confirmation that recipients processed the message. Exact message schemas, access rules, errors, and close codes are in [WEBSOCKET_PROTOCOL.md](docs/WEBSOCKET_PROTOCOL.md).

## Configuration

The standalone application maps environment variables to engine options. Principal defaults are:

| Setting                              |              Default |
| ------------------------------------ | -------------------: |
| HTTP port                            |               `8080` |
| Maximum managed connections          |              `10000` |
| Maximum pending upgrades             |                `256` |
| Per-client messages per second       |                `100` |
| Concurrent messages per client       |                 `32` |
| Inbound payload                      |        `65536` bytes |
| Per-client buffered bytes            |      `1048576` bytes |
| Maximum subscriptions per client     |                `100` |
| Maximum group name length            |     `128` characters |
| Heartbeat interval / stale threshold | `30000` / `45000` ms |
| Origin/auth callback timeout         |   `5000` / `5000` ms |
| Shutdown drain timeout               |           `10000` ms |

The optional engine-wide message-rate and aggregate pending-send byte caps default to `Infinity` (disabled). Configure finite limits from representative workload measurements; defaults are not capacity promises. See [CONFIGURATION.md](docs/CONFIGURATION.md) for all environment variables and validation rules.

## Use as a Library

The package root exports `createEngine`. The application owns the HTTP/HTTPS server and its listen/TLS setup.

```js
const { createEngine } = require("configurable-websocket-engine");

const engine = createEngine({
  authenticate: async (req) => verifyApplicationCredential(req),
  allowedOrigins: ["https://client.example"],
  authorizeSubscription: async (identity, group) =>
    identity.allowedGroups?.includes(group) ?? false,
});

engine.register("status", async (ctx, message) => {
  ctx.reply({ type: "status", data: message.data ?? {} });
});

// `server` is the application's existing HTTP(S) server.
const detach = engine.attach(server);
engine.start();

async function shutdown() {
  await engine.stop();
  await closeHttpServer(server);
}
```

The function names shown inside callbacks (`verifyApplicationCredential`, `closeHttpServer`) are application-owned examples, not package exports. See [ENGINE_API.md](docs/ENGINE_API.md) for option contracts, lifecycle, metrics, and manager APIs.

## Limits and Errors

- Upgrade rejection statuses include `401` for invalid authentication, `403` for a disallowed Origin, `503` for capacity/stopping/callback timeout, and `500` for unexpected upgrade handling errors.
- Message errors include `BAD_JSON`, `BAD_MESSAGE`, `UNKNOWN_TYPE`, and `HANDLER_FAILED`; sample command handlers also return `BAD_COMMAND`, `BAD_ARGS`, `NOT_FOUND`, and `FORBIDDEN` where applicable.
- Close codes include `1000` for admin shutdown, `1001` for server shutdown, `1008` for rate policy violations, `1009` for oversized inbound payloads, and `1013` for overload/concurrency or slow-client cases.
- The standalone app does not configure a subscription authorizer or a built-in join message. Subscriptions are denied by default.
- No HTTP health endpoint, path router, subprotocol negotiation, token refresh, persistent store, distributed pub/sub, or metrics exporter is included.

## Tests and Load Study

Run the correctness suite:

```sh
npm test
```

The repository has 12 Node.js tests. Python load-test setup and the measured local results are documented in [LOAD_TESTING.md](docs/LOAD_TESTING.md). The 2,000-client loopback result passed the provisional profile on Windows Server 2022 with Node `v26.12.0`, Python `3.12.0`, 4 logical CPUs, and 7.8 GiB installed RAM. It is exploratory evidence for that synthetic test only, not a production SLO or supported-N guarantee.

## Security and Deployment

Use a strong application authentication provider, a browser Origin allowlist, finite workload limits, TLS, secret management, observability, and graceful process supervision appropriate to your deployment. The standalone sample uses plain HTTP, accepts a missing Origin, and does not enforce a path; the engine does not infer trusted client IPs from forwarded headers. Review [SECURITY.md](SECURITY.md) and [PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) before deployment.

## Documentation

- [User Guide](docs/USER_GUIDE.md)
- [Configuration](docs/CONFIGURATION.md)
- [WebSocket Protocol](docs/WEBSOCKET_PROTOCOL.md)
- [Engine API](docs/ENGINE_API.md)
- [Production Deployment Boundaries](docs/PRODUCTION_DEPLOYMENT.md)
- [Load Testing](docs/LOAD_TESTING.md)
- [Project Overview](project/PROJECT_OVERVIEW.md)
- [Contributing](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Support](SUPPORT.md)
- [Authors and Contacts](AUTHORS.md)

## Author and Organization

SocketCore is attributed to **Md Nurnobi** and **Vib Tools**. Author attribution and verified company contact channels are listed in [AUTHORS.md](AUTHORS.md). No founder, CEO, or legal-owner title is asserted.

## License

No `LICENSE` file is currently present in this repository. A license has not been specified here; do not assume permission to use, modify, or redistribute the code. The repository owner should select and add a license before describing SocketCore as open source.

## GitHub Topics

Suggested repository topics: `nodejs`, `websocket`, `real-time-messaging`, `connection-management`, `backpressure`, `graceful-shutdown`, `observability`, `python-load-testing`.

Descriptive documentation and topics can improve clarity and discoverability, but GitHub/Google indexing and search ranking depend on external systems and are not guaranteed by README wording. Google Search Console access and verification must be handled by the site/repository owner where applicable.
