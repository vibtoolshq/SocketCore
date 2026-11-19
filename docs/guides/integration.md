---
title: "Application Integration"
description: "Embed SocketCore in HTTP(S), implement auth and operate behind a reverse proxy."
order: 3
draft: false
---

# Embedding SocketCore in an Existing Server

**Ownership:** your host owns Node HTTP(S), route composition, TLS, credentials, monitoring, and process signals. The library attaches only an `upgrade` listener and internally uses `ws` with `noServer:true`.

```js
const https = require("node:https");
const fs = require("node:fs");
const { createEngine } = require("configurable-websocket-engine");

// Provide your own valid certificate and private key through an approved secret system.
const server = https.createServer({
  key: fs.readFileSync(process.env.TLS_KEY_FILE),
  cert: fs.readFileSync(process.env.TLS_CERT_FILE),
});
const engine = createEngine({
  path: "/socket",
  authenticate: async (req, { signal }) => {
    // Application-specific verification belongs here. Do not trust Origin alone.
    return await verifyCredential(req, signal);
  },
  allowedOrigins: ["https://your-app.example"],
});

engine.register("echo", (ctx, message) => {
  ctx.reply({ type: "echo", data: message.data ?? null });
});
engine.attach(server);
engine.start();
server.listen(443);

async function close() {
  await engine.stop();
  await new Promise((resolve, reject) =>
    server.close((err) => err ? reject(err) : resolve()));
}
```

**Not standalone executable as written:** `verifyCredential`, certificate paths, DNS and permissions are explicit **host placeholders**. They are not exported by SocketCore. See the [runnable loopback example](../getting-started/quickstart.md) for a verified first round-trip.

### Browser clients

The native browser WebSocket constructor **cannot send arbitrary `x-auth-token` headers**. The repository's `app.js` demonstrates header authentication for Node/non-browser clients. A browser application must define a security-reviewed alternative handshake (for example, cookie/session or a narrowly-scoped ticket) **in its own authentication callback**. Do not put long-lived credentials in URLs; token issuance/expiry/revocation are not provided by this engine. Missing Origin is accepted, which reinforces the need for real authentication.

### Proxy and operations

A reverse proxy must forward `Upgrade`/`Connection` correctly and terminate TLS with a trusted certificate; configure idle timeouts and trusted forwarded headers in the actual hosting environment. The engine does **not** register `/health`, `/ready`, a metrics exporter, Caddy/Nginx config or reconnection client. The PU-05 tests use a **test-only local** proxy and cannot validate your production host. Detailed gates: [Production deployment](../PRODUCTION_DEPLOYMENT.md).

### Multiple applications

A separate `createEngine` invocation gives separate connection maps, authorization policy, limits and metrics. There is **no cross-instance shared message bus**. For another service/worker/host, application-provided cross-process pubsub is required; none is shipped.
