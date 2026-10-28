# WebSocket Protocol Reference

## Upgrade and Connection

The server accepts HTTP WebSocket upgrade requests on its HTTP server; `app.js` does not enforce a particular URL path. Requests without an `Origin` header are allowed by the app. If an `Origin` is present, it must exactly match a configured `ALLOWED_ORIGINS` value unless `*` is configured.

The app authenticates using the `x-auth-token` request header. A configured client token produces identity `{ role: "client" }`; an admin token produces `{ role: "admin" }`.

### Upgrade Rejections

| Status                      | Condition                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `401 Unauthorized`          | Authentication returned no valid non-array object identity.                                       |
| `403 Forbidden`             | Origin is not allowed.                                                                            |
| `503 Service Unavailable`   | Engine is stopped, too many upgrade checks are pending, or the connection limit has been reached. |
| `500 Internal Server Error` | An exception occurs during upgrade handling.                                                      |

After a successful upgrade, the server first sends:

```json
{ "type": "connected", "clientId": "<generated-uuid>" }
```

## Client Message Envelope

Each client frame must contain valid JSON with a string `type` field. The router dispatches the parsed value to the registered handler for that type. Extra fields are handler-specific. Incoming strings are parsed as JSON; a malformed JSON string is not treated as a plain-text message.

## Built-in `status` Messages

Normal acknowledgement request:

```json
{ "type": "status", "data": { "request": "health" } }
```

Response:

```json
{"type":"status","data":{"ack":true,"serverTime":<unix-milliseconds>,"echo":{"request":"health"}}}
```

`data` defaults to `{}` when missing or null. `serverTime` is produced by `Date.now()` in the standalone app.

Admin snapshot request:

```json
{ "type": "status", "data": { "request": "snapshot" } }
```

Response:

```json
{"type":"status","data":{"clients":<current-client-count>,"serverTime":<unix-milliseconds>}}
```

Only role `admin` may request a snapshot. A non-admin receives `FORBIDDEN`.

Admin broadcast request:

```json
{ "type": "status", "data": { "broadcast": true, "event": "maintenance" } }
```

The server sends a status payload to every other connected client and sends no separate success response to the initiating client. Non-admin clients receive `FORBIDDEN`.

## Built-in `command` Messages

| `name`            | Required fields | Access                   | Result                                                                                                                                                               |
| ----------------- | --------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ping`            | None            | Any authenticated client | `{ "type":"command", "name":"ping", "result":{"pong":true,"at":<unix-ms>} }`                                                                                         |
| `echo`            | Optional `args` | Any authenticated client | `result` is `args`, or `null` if it is nullish or absent.                                                                                                            |
| `broadcast`       | Optional `args` | Admin only               | Sends `{ "type":"command", "name":"broadcast", "result":args }` to other clients and replies to sender with `{ "delivered": <current connection count minus one> }`. |
| `shutdown-client` | `args.clientId` | Admin only               | Closes the target with code 1000 and replies `{ "ok":true }`; if missing returns `BAD_ARGS`, and if not connected returns `NOT_FOUND`.                               |

The `broadcast` response field is computed from the connection count after invoking broadcast; it is not the connection manager's actual successful-send count.
The `broadcast` response's `delivered` field is the successful-send count returned by the connection manager. It does not claim the recipient application processed the message.

## Router Errors

Errors use `{ "type":"error", "code":"...", "message":"..." }`.

| Code             | Condition                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `BAD_JSON`       | Frame content cannot be parsed as JSON.                                                                |
| `BAD_MESSAGE`    | Parsed value is missing a string `type`.                                                               |
| `UNKNOWN_TYPE`   | No handler is registered for the supplied type.                                                        |
| `HANDLER_FAILED` | A handler throws; the client receives a generic `internal error`, while the server logs the exception. |
| `BAD_COMMAND`    | Command name is absent or not one of the four built-in names.                                          |
| `FORBIDDEN`      | A client-role identity attempts an admin-only operation.                                               |
| `BAD_ARGS`       | `shutdown-client` lacks `args.clientId`.                                                               |
| `NOT_FOUND`      | `shutdown-client` names no currently connected client.                                                 |

Transport-level limit violations may close a WebSocket rather than return a JSON error. See the limits section below.

## Custom Handlers and Groups

Register a handler with `engine.register(type, async (ctx, message) => { ... })`. It receives:

| Context member            | Behavior                                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clientId`                | Generated ID for the connected client.                                                                                                                                                                  |
| `identity`                | Object returned by the authentication callback.                                                                                                                                                         |
| `client`                  | Connection-manager client record.                                                                                                                                                                       |
| `meta`                    | Alias of `identity`.                                                                                                                                                                                    |
| `reply(payload)`          | Sends a payload to this client.                                                                                                                                                                         |
| `subscribe(group)`        | Awaits the engine's `authorizeSubscription(identity, group, req)` callback, then attempts to add the client to the group. Returns a boolean. Authorization exceptions are logged and treated as denial. |
| `unsubscribe(group)`      | Removes this client from the group; returns a boolean.                                                                                                                                                  |
| `publish(group, payload)` | Sends to current group members and returns the successful send count.                                                                                                                                   |

The default `authorizeSubscription` callback denies every subscription. The standalone app leaves that default in place and has no built-in group-join message. Applications must configure authorization and register a handler if they need client-driven group subscriptions. Group names must be non-empty strings and must fit the configured maximum length; repeated subscription to an existing group succeeds without consuming another slot.
The default `authorizeSubscription` callback denies every subscription. The standalone app leaves that default in place and has no built-in group-join message. Applications must configure authorization and register a handler if they need client-driven group subscriptions. Both handler-context subscriptions and direct connection-manager subscriptions invoke the authorizer; group names must be non-empty strings and fit the configured maximum length. Repeated authorized subscription succeeds without consuming another slot.

## Resource Limits and Close Behavior

The default values and environment variable names are listed in [CONFIGURATION.md](CONFIGURATION.md).

- A message rate violation closes the client with code `1008`.
- Too many concurrent in-flight messages closes with `1013`.
- An oversized frame is rejected by `ws`; the integration test expects close code `1009`.
- Outgoing backpressure above `WS_MAX_BUFFERED_BYTES` closes with `1013` and removes the client from manager state.
- Heartbeat checks ping clients and terminate clients whose last pong exceeds the stale threshold.
- On server shutdown the connection manager closes clients with code `1001` and reason `server shutdown`.

## Test Coverage Snapshot

`test/engine.test.js` currently verifies blocked-origin and invalid-token upgrade rejection, successful client connections, authorized tenant group subscription and isolation, denial of a client-role admin command, maximum connection rejection, group publishing, oversized frame close behavior, and cleanup reflected in client count. Other settings are configured in code but are not all independently exercised by this test.
