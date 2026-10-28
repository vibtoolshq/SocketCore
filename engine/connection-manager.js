const { WebSocket } = require("ws");
const {
  DEFAULT_HEARTBEAT,
  DEFAULT_LIMITS,
  resolveHeartbeat,
  resolveLimits,
} = require("./config");

function createConnectionManager(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("connection manager options must be an object");
  }
  const allowedOptions = new Set([
    "heartbeatIntervalMs",
    "staleThresholdMs",
    "maxConnections",
    "maxBufferedBytes",
    "maxSubscriptionsPerClient",
    "maxGroupNameLength",
    "authorizeSubscription",
    "logger",
  ]);
  for (const key of Object.keys(options)) {
    if (!allowedOptions.has(key)) {
      throw new TypeError(`unknown connection manager option "${key}"`);
    }
  }

  const {
    heartbeatIntervalMs = DEFAULT_HEARTBEAT.heartbeatIntervalMs,
    staleThresholdMs = DEFAULT_HEARTBEAT.staleThresholdMs,
    maxConnections = DEFAULT_LIMITS.maxConnections,
    maxBufferedBytes = DEFAULT_LIMITS.maxBufferedBytes,
    maxSubscriptionsPerClient = DEFAULT_LIMITS.maxSubscriptionsPerClient,
    maxGroupNameLength = DEFAULT_LIMITS.maxGroupNameLength,
    authorizeSubscription = async () => false,
    logger = console,
  } = options;
  if (typeof authorizeSubscription !== "function") {
    throw new TypeError("authorizeSubscription must be a function");
  }

  const limits = resolveLimits({
    maxConnections,
    maxBufferedBytes,
    maxSubscriptionsPerClient,
    maxGroupNameLength,
  });
  const heartbeat = resolveHeartbeat({ heartbeatIntervalMs, staleThresholdMs });
  const clients = new Map();
  const groups = new Map();
  let heartbeatTimer = null;

  function add(clientId, ws, identity = {}) {
    if (clients.size >= limits.maxConnections) return null;
    const client = {
      id: clientId,
      ws,
      identity,
      lastPong: Date.now(),
      subscriptions: new Set(),
    };
    clients.set(clientId, client);
    ws.on("pong", () => {
      client.lastPong = Date.now();
    });
    ws.on("close", () => remove(clientId));
    ws.on("error", (error) => {
      logger.warn("[engine] websocket error", error);
      remove(clientId);
    });
    return client;
  }

  function remove(clientId) {
    const client = clients.get(clientId);
    if (!client) return false;
    for (const group of client.subscriptions) {
      const members = groups.get(group);
      members?.delete(clientId);
      if (members?.size === 0) groups.delete(group);
    }
    clients.delete(clientId);
    return true;
  }

  function get(clientId) {
    return clients.get(clientId);
  }

  function size() {
    return clients.size;
  }

  function serialize(payload) {
    if (typeof payload === "string") return payload;
    const data = JSON.stringify(payload);
    return typeof data === "string" ? data : null;
  }

  function sendData(client, data) {
    if (client.ws.readyState !== WebSocket.OPEN) return false;
    if (
      client.ws.bufferedAmount + Buffer.byteLength(data) >
      limits.maxBufferedBytes
    ) {
      try {
        client.ws.close(1013, "client is too slow");
      } catch {}
      remove(client.id);
      return false;
    }

    try {
      client.ws.send(data, (error) => {
        if (error) logger.warn("[engine] websocket send failed", error);
      });
      return true;
    } catch (error) {
      logger.warn("[engine] websocket send failed", error);
      remove(client.id);
      return false;
    }
  }

  function sendTo(clientId, payload) {
    const client = clients.get(clientId);
    const data = serialize(payload);
    return !!client && data !== null && sendData(client, data);
  }

  function sendToClients(clientIds, payload, filter) {
    const data = serialize(payload);
    if (data === null) return 0;
    let delivered = 0;
    for (const clientId of clientIds) {
      const client = clients.get(clientId);
      if (!client || (filter && !filter(client))) continue;
      if (sendData(client, data)) delivered++;
    }
    return delivered;
  }

  function broadcast(payload, filter) {
    return sendToClients(clients.keys(), payload, filter);
  }

  async function subscribe(clientId, group, req) {
    const client = clients.get(clientId);
    if (
      !client ||
      typeof group !== "string" ||
      group.length === 0 ||
      group.length > limits.maxGroupNameLength
    ) {
      return false;
    }

    try {
      if (!(await authorizeSubscription(client.identity, group, req))) {
        return false;
      }
    } catch (error) {
      logger.error("[engine] subscription authorization failed", error);
      return false;
    }
    if (clients.get(clientId) !== client) return false;

    if (client.subscriptions.has(group)) return true;
    if (client.subscriptions.size >= limits.maxSubscriptionsPerClient) {
      return false;
    }

    let members = groups.get(group);
    if (!members) groups.set(group, (members = new Set()));
    members.add(clientId);
    client.subscriptions.add(group);
    return true;
  }

  function unsubscribe(clientId, group) {
    const client = clients.get(clientId);
    if (!client || !client.subscriptions.delete(group)) return false;
    const members = groups.get(group);
    members?.delete(clientId);
    if (members?.size === 0) groups.delete(group);
    return true;
  }

  function publish(group, payload, filter) {
    const members = groups.get(group);
    return members ? sendToClients(members, payload, filter) : 0;
  }

  function startHeartbeat() {
    if (heartbeatTimer || heartbeat.heartbeatIntervalMs <= 0) return;
    heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, c] of clients) {
        if (now - c.lastPong > heartbeat.staleThresholdMs) {
          try {
            c.ws.terminate();
          } catch {}
          remove(id);
        } else {
          try {
            c.ws.ping();
          } catch {
            remove(id);
          }
        }
      }
    }, heartbeat.heartbeatIntervalMs);
    heartbeatTimer.unref?.();
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function closeAll() {
    for (const c of [...clients.values()]) {
      try {
        c.ws.close(1001, "server shutdown");
      } catch {}
      remove(c.id);
    }
    stopHeartbeat();
  }

  return {
    add,
    remove,
    get,
    size,
    sendTo,
    broadcast,
    subscribe,
    unsubscribe,
    publish,
    startHeartbeat,
    stopHeartbeat,
    closeAll,
  };
}

module.exports = { createConnectionManager };
