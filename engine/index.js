const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const { resolveHeartbeat, resolveLimits } = require("./config");
const { createConnectionManager } = require("./connection-manager");
const { createMessageRouter } = require("./message-router");

function createEngine({
  authenticate,
  authorizeSubscription = async () => false,
  allowedOrigins = [],
  limits = {},
  heartbeat = {},
  websocket = {},
  logger = console,
} = {}) {
  if (typeof authenticate !== "function") {
    throw new TypeError("authenticate callback is required");
  }
  if (typeof authorizeSubscription !== "function") {
    throw new TypeError("authorizeSubscription must be a function");
  }

  const config = resolveLimits(limits);
  const heartbeatConfig = resolveHeartbeat(heartbeat);

  const connectionManager = createConnectionManager({
    ...heartbeatConfig,
    maxConnections: config.maxConnections,
    maxBufferedBytes: config.maxBufferedBytes,
    maxSubscriptionsPerClient: config.maxSubscriptionsPerClient,
    maxGroupNameLength: config.maxGroupNameLength,
    authorizeSubscription,
    logger,
  });
  const messageRouter = createMessageRouter({ logger });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: config.maxPayloadBytes,
    perMessageDeflate: websocket.perMessageDeflate ?? false,
  });
  let attachedServer = null;
  let pendingUpgrades = 0;
  let stopped = false;

  function rejectUpgrade(socket, status, message) {
    if (socket.destroyed) return;
    const body = `${message}\n`;
    socket.end(
      `HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`,
    );
  }

  async function originAllowed(req) {
    const origin = req.headers.origin;
    if (!origin) return true;
    if (allowedOrigins === "*") return true;
    if (typeof allowedOrigins === "function") {
      return !!(await allowedOrigins(origin, req));
    }
    return Array.isArray(allowedOrigins) && allowedOrigins.includes(origin);
  }

  function detach() {
    if (!attachedServer) return;
    attachedServer.off("upgrade", handleUpgrade);
    attachedServer = null;
  }

  function attach(server) {
    if (stopped) throw new Error("engine has been stopped");
    if (attachedServer && attachedServer !== server) {
      throw new Error("engine is already attached to another server");
    }
    if (attachedServer) return () => detach();
    attachedServer = server;
    server.on("upgrade", handleUpgrade);
    return () => detach();
  }

  async function handleUpgrade(req, socket, head) {
    socket.on("error", () => {});
    if (stopped) {
      return rejectUpgrade(socket, "503 Service Unavailable", "engine stopped");
    }
    if (pendingUpgrades >= config.maxPendingUpgrades) {
      return rejectUpgrade(socket, "503 Service Unavailable", "server busy");
    }
    pendingUpgrades++;

    try {
      if (!(await originAllowed(req))) {
        return rejectUpgrade(socket, "403 Forbidden", "origin not allowed");
      }
      if (stopped) {
        return rejectUpgrade(
          socket,
          "503 Service Unavailable",
          "engine stopped",
        );
      }

      const identity = await authenticate(req);
      if (stopped) {
        return rejectUpgrade(
          socket,
          "503 Service Unavailable",
          "engine stopped",
        );
      }
      if (
        !identity ||
        typeof identity !== "object" ||
        Array.isArray(identity)
      ) {
        return rejectUpgrade(
          socket,
          "401 Unauthorized",
          "authentication required",
        );
      }
      if (connectionManager.size() + pendingUpgrades > config.maxConnections) {
        return rejectUpgrade(
          socket,
          "503 Service Unavailable",
          "connection limit reached",
        );
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        const clientId = crypto.randomUUID();
        const client = connectionManager.add(clientId, ws, identity);
        if (!client) {
          ws.close(1013, "connection limit reached");
          return;
        }

        const ctx = {
          clientId,
          identity,
          client,
          meta: identity,
          reply: (payload) => connectionManager.sendTo(clientId, payload),
          subscribe: (group) =>
            connectionManager.subscribe(clientId, group, req),
          unsubscribe: (group) =>
            connectionManager.unsubscribe(clientId, group),
          publish: (group, payload) =>
            connectionManager.publish(group, payload),
        };

        connectionManager.sendTo(clientId, {
          type: "connected",
          clientId,
        });

        let tokens = config.maxMessagesPerSecond;
        let lastRefill = Date.now();
        let activeMessages = 0;
        ws.on("message", (raw) => {
          const now = Date.now();
          tokens = Math.min(
            config.maxMessagesPerSecond,
            tokens + ((now - lastRefill) * config.maxMessagesPerSecond) / 1000,
          );
          lastRefill = now;
          if (tokens < 1) {
            ws.close(1008, "message rate limit exceeded");
            return;
          }
          if (activeMessages >= config.maxConcurrentMessagesPerClient) {
            ws.close(1013, "too many in-flight messages");
            return;
          }
          tokens -= 1;
          activeMessages++;
          messageRouter
            .dispatch(ctx, raw)
            .catch((error) => logger.error("[engine] dispatch error", error))
            .finally(() => activeMessages--);
        });
      });
    } catch (error) {
      logger.warn("[engine] upgrade rejected", error);
      rejectUpgrade(socket, "500 Internal Server Error", "connection failed");
    } finally {
      pendingUpgrades--;
    }
  }

  function register(type, handler) {
    return messageRouter.register(type, handler);
  }

  function start() {
    if (stopped) throw new Error("engine has been stopped");
    connectionManager.startHeartbeat();
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    detach();
    connectionManager.closeAll();
    wss.close();
  }

  return {
    attach,
    register,
    start,
    stop,
    connectionManager,
    messageRouter,
  };
}

module.exports = { createEngine };
