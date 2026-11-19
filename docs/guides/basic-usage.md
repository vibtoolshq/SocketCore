---
title: "Basic Usage"
description: "Register handlers and send JSON responses with the SocketCore engine."
order: 1
draft: false
---

# Basic Usage: Handlers and Replies

Starting from the [quickstart's](../getting-started/quickstart.md) initialized `engine`, register a handler by exact JSON `type`:

```js
const unregister = engine.register("greet", (ctx, msg) => {
  ctx.reply({ type: "greeting", text: `Hello, ${String(msg.name ?? "developer")}` });
});
```

Clients send JSON text such as `{"type":"greet","name":"Ada"}`; `ctx.reply` returns **boolean send acceptance**, not an acknowledgement that the peer processed the response. Calling `unregister()` removes the registration. Re-registering the same type overwrites its handler.

Handle input errors explicitly; the engine only parses JSON and validates that `type` is a string. Any handler exception is logged safely and yields the generic `HANDLER_FAILED` error response. The sample app defines additional `status` and `command` handlers; they are not installed by the package root. See [message reference](../api/messages.md).

With multiple clients, the connection manager supports `sendTo(id, payload)`, `broadcast(payload, filter?)`, and authorized `publish(group, payload)`. Group membership is **in-memory and instance-local**.

**Lifecycle:** register handlers before or after `start()`; attach to a Node HTTP(S) server; call host `listen()`; on shutdown, await `engine.stop()` then close the host. The engine does not start an OS listener itself.
