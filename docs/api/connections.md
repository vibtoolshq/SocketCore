# Connection Manager, Sends and Groups

Access via **`engine.connectionManager`** (public returned interface, not a package subpath export). Factory implementation: `engine/connection-manager.js` internally; users should create the manager through `createEngine`.

| Exact method | Return | Contract |
| --- | --- | --- |
| `add(clientId, ws, identity = {})` | `client | null` | Registers ID and WS socket; duplicate ID/cap rejects. **Low-level:** engine performs this on upgrades |
| `remove(clientId)` | `boolean` | Removes record/memberships, releases accounted pending sends |
| `get(clientId)` | `client | undefined` | Returns live managed record |
| `size()` | `number` | Current managed connection count |
| `sendTo(clientId, payload)` | `boolean` | Returns whether a send was accepted. Strings sent raw; other values serialized as JSON |
| `broadcast(payload, filter?)` | `number` | Counts accepted `ws.send` calls across matching clients |
| `subscribe(clientId, group, req?)` | `Promise<boolean>` | Async authorization then group registration. Default denies |
| `unsubscribe(clientId, group)` | `boolean` | Removes membership |
| `publish(group, payload, filter?)` | `number` | Sends to authorized current group members, counts accepted sends |
| `startHeartbeat()` | `undefined` | Starts timer unless disabled/already running |
| `stopHeartbeat()` | `undefined` | Clears heartbeat timer |
| `closeAll()` | `undefined` | Closes/removes all (1001), does **not** await graceful drain |
| `drain(timeoutMs = 10000)` | `Promise<void>` | Waits for 1001 close handshakes until timeout, then terminates; non-negative integer validation |

**Payload:** `string` is sent unchanged; object/other JSON-serializable data is `JSON.stringify`'d. A payload whose serialization gives no string (for example `undefined`) is rejected; circular objects can throw during serialization. The per-client socket buffer limit can close a slow client with WS **1013**, while the aggregate pending-send threshold rejects the send without closing the client. **Delivery counts are not client-side acknowledgements**.

**Filter:** `(clientRecord) => boolean`, evaluated synchronously; a throwing filter is not swallowed. `get(clientId)` returns a mutable object with `id`, `ws`, `identity`, `lastPong`, `subscriptions` and `pendingSends`. This record shape is implementation-visible and should not be treated as a version-stable serialization format.

**Group rule:** `authorizeSubscription(identity, group, req)` must explicitly approve each subscription; false, throw, invalid group, per-client group limit, or a disappearing client yields false. Valid group names are non-empty strings no longer than `maxGroupNameLength`. Resubscription still rechecks authorization. `ctx.subscribe(group)` passes the upgrade `req` internally, so prefer context methods from handlers.

## Example

```js
engine.register("join", async (ctx, msg) => {
  const ok = await ctx.subscribe(msg.group);
  ctx.reply({ type: "joined", ok });
});
engine.register("announce", (ctx, msg) => {
  const accepted = ctx.publish(msg.group, { type: "announcement", body: msg.body });
  ctx.reply({ type: "announce-result", accepted });
});
```

The example assumes `engine` is a `createEngine` instance configured with an explicit `authorizeSubscription` function. It does not provide cross-process pub/sub, persistent groups, broker, replay or guaranteed delivery.
