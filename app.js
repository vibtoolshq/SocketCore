const { createServer } = require("node:http");
const { createEngine } = require("./engine");
const {
  DEFAULT_HEARTBEAT,
  DEFAULT_LIMITS,
  DEFAULT_PORT,
} = require("./engine/config");
const { createStatusHandler } = require("./handlers/status.handler");
const { createCommandHandler } = require("./handlers/command.handler");

function readNumber(name, fallback, minimum = 1) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer >= ${minimum}`);
  }
  return value;
}

const PORT = readNumber("PORT", DEFAULT_PORT);
const TOKENS = new Set(
  (process.env.AUTH_TOKENS || "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean),
);
if (TOKENS.size === 0) {
  throw new Error("AUTH_TOKENS must contain at least one token");
}
const ADMIN_TOKENS = new Set(
  (process.env.ADMIN_TOKENS || "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean),
);
for (const token of ADMIN_TOKENS) {
  if (!TOKENS.has(token)) {
    throw new Error("every ADMIN_TOKENS entry must also be in AUTH_TOKENS");
  }
}

const configuredOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = configuredOrigins.includes("*")
  ? "*"
  : configuredOrigins;
const HEARTBEAT_MS = readNumber(
  "HEARTBEAT_INTERVAL_MS",
  DEFAULT_HEARTBEAT.heartbeatIntervalMs,
  0,
);

const engine = createEngine({
  authenticate: (req) => {
    const token = req.headers["x-auth-token"];
    return typeof token === "string" && TOKENS.has(token)
      ? { role: ADMIN_TOKENS.has(token) ? "admin" : "client" }
      : null;
  },
  allowedOrigins: ALLOWED_ORIGINS,
  limits: {
    maxConnections: readNumber(
      "WS_MAX_CONNECTIONS",
      DEFAULT_LIMITS.maxConnections,
    ),
    maxPendingUpgrades: readNumber(
      "WS_MAX_PENDING_UPGRADES",
      DEFAULT_LIMITS.maxPendingUpgrades,
    ),
    maxMessagesPerSecond: readNumber(
      "WS_MAX_MESSAGES_PER_SECOND",
      DEFAULT_LIMITS.maxMessagesPerSecond,
    ),
    maxConcurrentMessagesPerClient: readNumber(
      "WS_MAX_CONCURRENT_MESSAGES_PER_CLIENT",
      DEFAULT_LIMITS.maxConcurrentMessagesPerClient,
    ),
    maxPayloadBytes: readNumber(
      "WS_MAX_PAYLOAD_BYTES",
      DEFAULT_LIMITS.maxPayloadBytes,
    ),
    maxBufferedBytes: readNumber(
      "WS_MAX_BUFFERED_BYTES",
      DEFAULT_LIMITS.maxBufferedBytes,
    ),
    maxSubscriptionsPerClient: readNumber(
      "WS_MAX_SUBSCRIPTIONS",
      DEFAULT_LIMITS.maxSubscriptionsPerClient,
    ),
    maxGroupNameLength: readNumber(
      "WS_MAX_GROUP_NAME_LENGTH",
      DEFAULT_LIMITS.maxGroupNameLength,
    ),
  },
  heartbeat: {
    heartbeatIntervalMs: HEARTBEAT_MS,
    staleThresholdMs: readNumber(
      "HEARTBEAT_STALE_THRESHOLD_MS",
      DEFAULT_HEARTBEAT.staleThresholdMs,
      0,
    ),
  },
  websocket: {
    perMessageDeflate: process.env.WS_PER_MESSAGE_DEFLATE === "true",
  },
});

engine.register(
  "status",
  createStatusHandler({ connectionManager: engine.connectionManager }),
);
engine.register(
  "command",
  createCommandHandler({ connectionManager: engine.connectionManager }),
);

const server = createServer();
engine.attach(server);

engine.start();
server.listen(PORT, () => {
  console.log(`[app] ws engine listening on :${PORT}`);
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("\n[app] shutting down...");
  engine.stop();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
