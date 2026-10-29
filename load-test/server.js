const { createServer } = require("node:http");
const { createEngine } = require("../engine");
const {
  DEFAULT_HEARTBEAT,
  DEFAULT_LIMITS,
  DEFAULT_TIMEOUTS,
} = require("../engine/config");
const { createCommandHandler } = require("../handlers/command.handler");
const { createStatusHandler } = require("../handlers/status.handler");

const clientToken = process.env.WS_LOAD_CLIENT_TOKEN;
const adminToken = process.env.WS_LOAD_ADMIN_TOKEN;
const origin = "http://load.local";
if (!clientToken || !adminToken) {
  throw new Error("WS_LOAD_CLIENT_TOKEN and WS_LOAD_ADMIN_TOKEN are required");
}

const counters = Object.create(null);
const gauges = Object.create(null);
let eventLoopLagMeanMs = null;
let previousCpuUsage = process.cpuUsage();
let previousSampleNs = process.hrtime.bigint();

const metrics = {
  increment(name, value = 1) {
    counters[name] = (counters[name] || 0) + value;
  },
  gauge(name, value) {
    gauges[name] = value;
  },
  observe(name, value) {
    if (name === "ws.event_loop_lag_ms") eventLoopLagMeanMs = value;
  },
};

const server = createServer();
const configuredClients = Number(process.env.WS_LOAD_CLIENTS || 1000);
const engine = createEngine({
  authenticate: (request) => {
    const token = request.headers["x-auth-token"];
    if (token === adminToken) return { role: "admin", app: "load" };
    if (token === clientToken) return { role: "client", app: "load" };
    return null;
  },
  allowedOrigins: [origin],
  limits: {
    ...DEFAULT_LIMITS,
    maxConnections: configuredClients + 1,
    maxPendingUpgrades: Math.min(configuredClients + 1, 1000),
  },
  heartbeat: DEFAULT_HEARTBEAT,
  timeouts: { ...DEFAULT_TIMEOUTS, metricsIntervalMs: 1000 },
  websocket: { perMessageDeflate: false },
  metrics,
  logger: {
    warn(message, details) {
      process.stdout.write(
        `${JSON.stringify({ kind: "log", level: "warn", message, details })}\n`,
      );
    },
    error(message, details) {
      process.stdout.write(
        `${JSON.stringify({ kind: "log", level: "error", message, details })}\n`,
      );
    },
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
engine.attach(server);
engine.start();

function emitSample() {
  const nowNs = process.hrtime.bigint();
  const elapsedMs = Number(nowNs - previousSampleNs) / 1e6;
  const cpu = process.cpuUsage(previousCpuUsage);
  previousCpuUsage = process.cpuUsage();
  previousSampleNs = nowNs;
  const cpuOneCorePercent =
    elapsedMs > 0 ? ((cpu.user + cpu.system) / 1000 / elapsedMs) * 100 : 0;
  const memory = process.memoryUsage();
  process.stdout.write(
    `${JSON.stringify({
      kind: "sample",
      timestamp: Date.now(),
      counters: { ...counters },
      gauges: { ...gauges },
      eventLoopLagMeanMs,
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      cpuOneCorePercent,
    })}\n`,
  );
}

const sampleTimer = setInterval(emitSample, 1000);

let shutdownPromise;
function shutdown() {
  if (shutdownPromise) return shutdownPromise;
  shutdownPromise = (async () => {
    clearInterval(sampleTimer);
    await engine.stop();
    if (server.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    emitSample();
    process.stdout.write(`${JSON.stringify({ kind: "stopped" })}\n`);
  })();
  return shutdownPromise;
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (data) => {
  if (data.includes("STOP")) void shutdown();
});

server.listen(0, "127.0.0.1", () => {
  process.stdout.write(
    `${JSON.stringify({
      kind: "ready",
      url: `ws://127.0.0.1:${server.address().port}`,
      pid: process.pid,
      nodeVersion: process.version,
      origin,
    })}\n`,
  );
});
