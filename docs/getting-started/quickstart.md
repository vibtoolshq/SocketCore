---
title: "Authenticated WebSocket Quickstart"
description: "Run a minimal Node WebSocket server and exchange echo messages."
order: 2
draft: false
---

# Quickstart: Authenticated WebSocket Echo

This is a minimal **Node.js-only** example. It uses the public root `createEngine` factory and the application's own HTTP server. It is not a public Internet deployment, and it does not expose a real credential system.

In a clean Node application, install the engine and an explicit `ws` test-client dependency:

```sh
npm install configurable-websocket-engine@1.0.0 ws
```

Create `server.cjs`:

```js
const http = require("node:http");
const { createEngine } = require("configurable-websocket-engine");

const server = http.createServer();
const engine = createEngine({
  path: "/socket",
  allowedOrigins: ["http://localhost"],
  authenticate: (req) =>
    req.headers["x-auth-token"] === "local-demo-only" ? { role: "developer" } : null,
});

engine.register("echo", (ctx, message) => {
  ctx.reply({ type: "echo", value: message.value });
});
engine.attach(server);
engine.start();
server.listen(8080, "127.0.0.1", () => {
  console.log("SocketCore demo listening on ws://127.0.0.1:8080/socket");
});

async function shutdown() {
  await engine.stop();
  await new Promise((resolve) => server.close(resolve));
}
process.on("SIGINT", () => { void shutdown(); });
```

Run `node server.cjs`. In a second terminal run a **Node** client (the same folder):

```js
const WebSocket = require("ws");
const ws = new WebSocket("ws://127.0.0.1:8080/socket", {
  headers: { Origin: "http://localhost", "x-auth-token": "local-demo-only" },
});
ws.on("message", (bytes) => {
  const message = JSON.parse(bytes.toString());
  console.log(message);
  if (message.type === "connected") ws.send(JSON.stringify({ type: "echo", value: "hello" }));
  if (message.type === "echo") ws.close();
});
```

The first server message has `{ type: "connected", clientId: "..." }`; the next is `{ type: "echo", value: "hello" }`. A missing/wrong token receives HTTP **401** before upgrade. A disallowed Origin receives HTTP **403**. The sample values are not production secrets. Use `wss://` behind a correctly configured TLS listener/proxy for real applications; see [integration](../guides/integration.md).

**Verification:** The equivalent programmatic Node client/server round-trip was executed during this documentation task; exact outcome is listed in [documentation QA](../COVERAGE_AUDIT.md).
