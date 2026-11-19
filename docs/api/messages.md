---
title: "Message Router and Error Contracts"
description: "JSON dispatch, handler context, protocol errors and close behavior."
order: 3
draft: false
---

# Message Router, Handler Context and Error Contracts

The engine exposes `engine.messageRouter`, not a separately exported module. Calling `engine.register(type, handler)` delegates to `engine.messageRouter.register`.

## Router members

| Exact member | Return / details |
| --- | --- |
| `register(type, handler)` | Returns `() => boolean` to remove a registered handler. Non-function handler throws `Error`. New registration under same type overwrites the prior entry |
| `dispatch(ctx, raw)` | `Promise<unknown>`; JSON-decodes `raw`, checks `msg.type`, invokes selected handler and replies with generic errors when needed |
| `handlers` | Live `Map` of type → handler. Internal mutation is not recommended as an integration contract |

The router is intended to be used by the engine's message listener; calling `dispatch` manually requires providing a valid `ctx` (including `reply`).

## Handler signature and context

`engine.register(type, async (ctx, message) => { ... })`

| Context property | Runtime behavior |
| --- | --- |
| `clientId` | Generated UUID for current connection |
| `identity` | Object returned by `authenticate` |
| `meta` | Alias for `identity` |
| `client` | Managed record for the socket |
| `signal` | Per-socket `AbortSignal` on disconnect/error/engine stop |
| `reply(payload)` | `boolean` send acceptance |
| `subscribe(group)` | `Promise<boolean>` via configured subscription authorizer |
| `unsubscribe(group)` | `boolean` |
| `publish(group, payload)` | `number` accepted group sends |

The message passed to a handler is the decoded JSON object. It must contain a `type` string; other fields are handler-specific. Handler failures produce `HANDLER_FAILED` after safe logging and do not expose server stack traces to the client.

## JSON protocol error envelopes

| Error code | Trigger |
| --- | --- |
| `BAD_JSON` | Frame not parseable as JSON |
| `BAD_MESSAGE` | Missing/non-string `type` |
| `UNKNOWN_TYPE` | No registered handler for type |
| `HANDLER_FAILED` | Registered handler throws/rejects |

Error envelope: `{ "type": "error", "code": "BAD_JSON", "message": "invalid JSON payload" }`. Handler-specific codes in the **repository-only demo** are `BAD_COMMAND`, `FORBIDDEN`, `BAD_ARGS`, `NOT_FOUND`. See [protocol reference](../WEBSOCKET_PROTOCOL.md) for exact built-in message formats and WS close codes.

## Upgrade HTTP and WebSocket closes

| HTTP | Cause |
| --- | --- |
| `401` | Invalid/non-object identity |
| `403` | Disallowed Origin |
| `500` | Unexpected upgrade error |
| `503` | Engine stopped, capacity reached, callback timeout |

Timeouts abort the callback's signal and retain its pending slot until underlying work settles. A missing Origin is allowed, so the application **must authenticate every client**. WS close codes include 1000 (sample admin kick), 1001 (drain), 1008 (per-client/global rate), 1009 (too-large inbound payload via `ws`), and 1013 (concurrency/backpressure). These are not exceptions exported by the package.

**Important:** No package-level `Error` subclasses, typed error union, event emitter API or automatic JSON schema validation exists. Catch your own handler errors or let the router convert them to `HANDLER_FAILED`.

## Message example

```js
engine.register("sum", (ctx, msg) => {
  const a = Number(msg.a);
  const b = Number(msg.b);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    ctx.reply({ type: "error", code: "INVALID_SUM_ARGS" }); // application-defined code
    return;
  }
  ctx.reply({ type: "sum", result: a + b });
});
```

The user-defined `INVALID_SUM_ARGS` code is **not** one of the engine's built-in errors.
