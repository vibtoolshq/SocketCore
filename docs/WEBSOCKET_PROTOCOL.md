# WebSocket Protocol Reference

This document describes the JSON message contract implemented by the standalone app and the extension points available to library consumers. Wire fields and error codes are stable application behavior; the engine does not negotiate a protocol version.

## Upgrade and Connection

The engine accepts HTTP WebSocket upgrade requests on the HTTP server supplied to `engine.attach(server)`; the standalone `app.js` does not enforce a URL path. Requests without `Origin` are allowed. A provided Origin must exactly match `ALLOWED_ORIGINS`, unless wildcard is configured. The standalone app authenticates with the `x-auth-token` header. Origin checks do not replace authentication.

After a successful upgrade, the server sends:

```json
{ "type": "connected", "clientId": "<generated-uuid>" }
```

### Upgrade Rejections

| Status                      | Condition                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `401 Unauthorized`          | Authentication returned no valid non-array object identity.                                |
| `403 Forbidden`             | Origin is not allowed.                                                                     |
| `503 Service Unavailable`   | Engine stopped, pending-upgrade/connection cap reached, or origin/auth callback timed out. |
| `500 Internal Server Error` | An unexpected upgrade callback/handling error occurred.                                    |

The upgrade path applies the origin callback before authentication. Async origin and authentication callbacks have independent deadlines. A timed-out callback causes `503` and releases the pending-upgrade slot, but its underlying Promise may continue because the engine cannot cancel arbitrary JavaScript work.

## Client Message Envelope and Errors

Each client data frame must be JSON with a string `type`. A handler is selected by exact `type` string. Malformed JSON returns `BAD_JSON`; missing/non-string type returns `BAD_MESSAGE`; an unregistered type returns `UNKNOWN_TYPE`. Handler exceptions return `HANDLER_FAILED` with a generic client message. The error envelope is:

```json
{ "type": "error", "code": "BAD_JSON", "message": "invalid JSON payload" }
```

The server does not expose stack traces or handler exception messages in these protocol errors. A successful transport send is not an application-level acknowledgement unless the handler's response explicitly provides one.

## Built-in Messages

### `status`

- Request: `{ "type": "status", "data": { "request": "health" } }`.
- Normal status receives `{ "type":"status", "data": { "ack":true, "serverTime":<unix-ms>, "echo":<request-data> } }`. If `data` is omitted or null, the handler uses `{}`.
- `data.request: "snapshot"` is admin-only and returns `{ "type":"status", "data": { "clients":<managed-count>, "serverTime":<unix-ms> } }`. The count includes all managed connections, including the requester.
- `data.broadcast: true` is admin-only; it sends `{ "type":"status", "data": { "from":<sender-client-id>, ...request-data } }` to every other client and sends no success response to the sender.

Example acknowledgement:

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

### `command`

| `name`            | Access                   | Behavior                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ping`            | Any authenticated client | Replies `{ "type":"command", "name":"ping", "result": { "pong":true, "at":<unix-ms> } }`.                                                                                                                                                                   |
| `echo`            | Any authenticated client | Replies `{ "type":"command", "name":"echo", "result":<args-or-null> }`.                                                                                                                                                                                     |
| `broadcast`       | Admin                    | Sends `{ "type":"command", "name":"broadcast", "result":<args> }` to other clients and replies to sender with `{ "type":"command", "name":"broadcast", "result": { "delivered":<count> } }`. Count is successful `ws.send` calls, not recipient processing. |
| `shutdown-client` | Admin                    | Requires `args.clientId`; closes target with code 1000 and replies `{ "type":"command", "name":"shutdown-client", "result": { "ok":true } }`, or returns `BAD_ARGS` / `NOT_FOUND`.                                                                          |

Unknown/missing command names return `BAD_COMMAND`. A non-admin requesting an admin-only command receives `FORBIDDEN`.

## Groups and Authorization

Custom handlers receive `ctx` containing `clientId`, `identity`, `meta` (the same identity object), `client`, `reply`, `subscribe`, `unsubscribe`, and `publish`.

`ctx.subscribe(group)` returns a `Promise<boolean>`; the `authorizeSubscription(identity, group, req)` callback is applied to both context and direct connection-manager subscription calls. It defaults to deny. Authorization false/throw, invalid/overlong group, capacity exhaustion, or client removal while authorization is pending returns false. Existing subscriptions return true after authorization succeeds. `unsubscribe(group)` returns a boolean. `publish(group, payload, filter?)` returns the number of successful sends. The standalone app does not configure an authorizer or register a built-in join message.

## Limits, Timeouts and Shutdown

- Per-client message-rate violation closes with 1008; per-client concurrent-message violation closes with 1013.
- Optional engine-wide message-rate cap defaults disabled (`Infinity`); when set, excess closes the sending client with 1008.
- Inbound payload limit is enforced by `ws`; the integration test expects close 1009 for an oversized frame.
- Per-client output-buffer excess closes slow client with 1013. Optional aggregate output-buffer excess rejects only the current send; it does not disconnect the target.
- Origin/auth callbacks have configured deadlines. Timeout returns HTTP 503 and releases the pending-upgrade slot. The underlying callback promise cannot be forcibly cancelled by JavaScript and may continue its own work.
- Shutdown closes clients with 1001, waits for close events up to the configured drain timeout, then terminates remaining sockets before completing `engine.stop()`.

### WebSocket Close Codes

|   Code | Used for                                                                                                  |
| -----: | --------------------------------------------------------------------------------------------------------- |
| `1000` | Admin `shutdown-client` request.                                                                          |
| `1001` | Server shutdown/drain.                                                                                    |
| `1008` | Per-client or configured global message-rate policy violation.                                            |
| `1009` | Inbound payload exceeds `maxPayloadBytes` (`ws` enforcement).                                             |
| `1013` | Per-client in-flight-message limit, per-client output-buffer limit, or connection-manager admission race. |

The close code/reason is not a substitute for application-specific retry policy. This package does not implement a reconnect client or backoff strategy.

See [CONFIGURATION.md](CONFIGURATION.md) for defaults and environment names; [ENGINE_API.md](ENGINE_API.md) for metrics callbacks and lifecycle API.
