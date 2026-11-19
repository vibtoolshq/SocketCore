---
title: "Advanced Usage"
description: "Authorized groups, backpressure, concurrency, metrics and graceful shutdown."
order: 2
draft: false
---

# Advanced Usage: Groups, Backpressure and Metrics

## Authorization is per subscription

```js
const { createEngine } = require("configurable-websocket-engine");
const engine = createEngine({
  authenticate: (req) => req.headers["x-auth-token"] === "local-only"
    ? { userId: "dev-1", role: "client" }
    : null,
  authorizeSubscription: (identity, group) =>
    group === `user:${identity.userId}`,
  metrics: {
    increment(name, value, attrs) { /* send low-cardinality counter to host instrumentation */ },
    gauge(name, value) { /* record value in host metrics exporter */ },
    observe(name, value) { /* record event-loop lag when provided */ },
  },
});

engine.register("join", async (ctx, msg) => {
  const ok = await ctx.subscribe(msg.group);
  ctx.reply({ type: "join-result", ok });
});
```

This is application-owned permission logic. The default `authorizeSubscription = async () => false` denies all joins. There is **no tenant policy service** in the transport library.

## Backpressure and concurrency

Configure `limits.maxBufferedBytes` (per client), `limits.maxTotalBufferedBytes` (aggregate pending sends), `limits.maxMessagesPerSecond` (per client), `limits.maxGlobalMessagesPerSecond`, `limits.maxConcurrentMessagesPerClient`, and `limits.maxGlobalConcurrentMessages`. When a send exceeds the aggregate byte budget, the library returns false; excess per-client buffered amount closes the slow client with 1013. Metrics include `ws.messages.dropped` and `ws.buffered_bytes.total`. Successful `broadcast`/ `publish` counts mean send accepted, **not delivery guarantee**.

Handler promises continue to occupy concurrency slots until settled even if `ctx.signal` was aborted; an abort signal is cooperative. For slow external service calls, honor `ctx.signal` and install your own deadline where appropriate.

## Observability contract

Logger is a host-owned object. Safe engine logging passes the exception's **name and code only** instead of full error contents. Optional callback names: `increment`, `gauge`, `observe`, called as `(name, value, attributes)`. The engine emits samples (including `ws.event_loop_lag_ms`) only when metrics hooks exist and `start()` is called; it provides **no Prometheus endpoint, metric storage or dashboard**. Do not put credentials or high-cardinality identities into your own metric attributes.

## Heartbeat and shutdown

`engine.start()` begins heartbeat. Heartbeat interval 0 disables the timer. If an existing connection has not replied with a pong within `staleThresholdMs`, the manager terminates it at a heartbeat tick. `await engine.stop()` stops new upgrades and waits up to `timeouts.shutdownDrainMs` before terminating remaining clients. Consult [configuration](../reference/configuration.md) for exact defaults.
