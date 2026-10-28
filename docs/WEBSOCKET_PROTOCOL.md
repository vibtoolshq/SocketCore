# WebSocket Protocol Reference

## Upgrade and Connection

The server accepts HTTP WebSocket upgrade requests on its HTTP server; `app.js` does not enforce a URL path. Requests without `Origin` are allowed. A provided Origin must exactly match `ALLOWED_ORIGINS`, unless wildcard is configured. The standalone app authenticates with `x-auth-token`.

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

## Client Message Envelope and Errors

Each client frame must be JSON with a string `type`. Malformed JSON returns `BAD_JSON`; missing/non-string type returns `BAD_MESSAGE`; unregistered type returns `UNKNOWN_TYPE`. Handler exceptions return `HANDLER_FAILED` with a generic client message. The error envelope is `{ "type":"error", "code":"...", "message":"..." }`.

## Built-in Messages

### `status`

- Normal `{ "type":"status", "data":... }` receives `{ ack:true, serverTime, echo:data }`.
- `data.request: "snapshot"` is admin-only and returns current client count and server time.
- `data.broadcast: true` is admin-only; it sends a status payload to every other client and does not send a success response to the sender.

### `command`

| `name`            | Access                   | Behavior                                                                                                                          |
| ----------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `ping`            | Any authenticated client | Replies with `{ pong:true, at }`.                                                                                                 |
| `echo`            | Any authenticated client | Replies with supplied `args`, or `null`.                                                                                          |
| `broadcast`       | Admin                    | Sends to other clients and replies with `delivered`, the manager's successful-send count. It does not prove recipient processing. |
| `shutdown-client` | Admin                    | Requires `args.clientId`; closes target with code 1000, or returns `BAD_ARGS` / `NOT_FOUND`.                                      |

## Groups and Authorization

Custom handlers receive `ctx` with `reply`, `subscribe`, `unsubscribe` and `publish`. The `authorizeSubscription(identity, group, req)` callback is applied to both context and direct connection-manager subscribe calls. It defaults to deny. Authorization false/throw or client removal while authorization is pending returns false. The standalone app does not configure an authorizer or register a built-in join message.

## Limits, Timeouts and Shutdown

- Per-client message-rate violation closes with 1008; per-client concurrent-message violation closes with 1013.
- Optional engine-wide message-rate cap defaults disabled (`Infinity`); when set, excess closes the sending client with 1008.
- Inbound payload limit is enforced by `ws`; the integration test expects close 1009 for an oversized frame.
- Per-client output-buffer excess closes slow client with 1013. Optional aggregate output-buffer excess rejects only the current send; it does not disconnect the target.
- Origin/auth callbacks have configured deadlines. Timeout returns HTTP 503 and releases the pending-upgrade slot. The underlying callback promise cannot be forcibly cancelled by JavaScript and may continue its own work.
- Shutdown closes clients with 1001, waits for close events up to the configured drain timeout, then terminates remaining sockets before completing `engine.stop()`.

See [CONFIGURATION.md](CONFIGURATION.md) for defaults and environment names; [ENGINE_API.md](ENGINE_API.md) for metrics callbacks and lifecycle API.
