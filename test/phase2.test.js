const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createServer } = require("node:http");
const { test } = require("node:test");
const WebSocket = require("ws");
const {
  DEFAULT_LIMITS,
  DEFAULT_TIMEOUTS,
  resolveTimeouts,
} = require("../engine/config");
const { createConnectionManager } = require("../engine/connection-manager");
const { createEngine } = require("../engine");
const { createMetrics, safeLog } = require("../engine/observability");

class FakeSocket extends EventEmitter {
  constructor({ emitCloseOnClose = true } = {}) {
    super();
    this.readyState = WebSocket.OPEN;
    this.bufferedAmount = 0;
    this.emitCloseOnClose = emitCloseOnClose;
    this.terminated = false;
    this.sendCallback = null;
  }

  send(_data, callback) {
    this.sendCallback = callback;
  }

  close(code, reason) {
    this.closeCode = code;
    this.closeReason = reason;
    if (this.emitCloseOnClose) this.finishClose(code);
  }

  terminate() {
    this.terminated = true;
    this.finishClose(1006);
  }

  finishClose(code) {
    this.readyState = WebSocket.CLOSED;
    this.emit("close", code, Buffer.alloc(0));
  }

  ping() {}
}

function connectOrReject(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once("open", () => resolve({ socket, status: 101 }));
    socket.once("unexpected-response", (_request, response) => {
      const status = response.statusCode;
      response.resume();
      resolve({ socket, status });
    });
    socket.once("error", (error) => {
      if (socket.readyState !== WebSocket.CLOSED) return;
      reject(error);
    });
  });
}

function receiveType(socket, expectedType) {
  return new Promise((resolve) => {
    const onMessage = (data) => {
      const message = JSON.parse(data.toString());
      if (message.type !== expectedType) return;
      socket.off("message", onMessage);
      resolve(message);
    };
    socket.on("message", onMessage);
  });
}

test("Phase 2 timeout defaults are finite and optional aggregate limits are disabled", () => {
  assert.equal(DEFAULT_TIMEOUTS.originCheckMs, 5000);
  assert.equal(DEFAULT_TIMEOUTS.authenticateMs, 5000);
  assert.equal(DEFAULT_TIMEOUTS.shutdownDrainMs, 10000);
  assert.equal(DEFAULT_LIMITS.maxGlobalMessagesPerSecond, Infinity);
  assert.equal(DEFAULT_LIMITS.maxTotalBufferedBytes, Infinity);
  assert.deepEqual(resolveTimeouts(), DEFAULT_TIMEOUTS);
  assert.throws(
    () => resolveTimeouts({ authenticateMs: 0 }),
    /positive integer/,
  );
  assert.throws(
    () => resolveTimeouts({ unknownTimeout: 1 }),
    /unknown timeouts option/,
  );
});

test(
  "authentication timeout releases the pending-upgrade slot",
  { timeout: 5000 },
  async (t) => {
    let authenticationCalls = 0;
    const server = createServer();
    const engine = createEngine({
      authenticate: () => {
        authenticationCalls++;
        return authenticationCalls === 1
          ? new Promise(() => {})
          : { role: "client" };
      },
      limits: { maxPendingUpgrades: 1, maxConnections: 2 },
      timeouts: { authenticateMs: 40 },
      heartbeat: { heartbeatIntervalMs: 0, staleThresholdMs: 0 },
      logger: { warn() {}, error() {} },
    });
    engine.attach(server);

    t.after(async () => {
      await engine.stop();
      if (server.listening)
        await new Promise((resolve) => server.close(resolve));
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `ws://127.0.0.1:${server.address().port}`;
    const timedOut = await connectOrReject(url);
    assert.equal(timedOut.status, 503);

    const accepted = await connectOrReject(url);
    assert.equal(accepted.status, 101);
  },
);

test("aggregate buffered cap drops without evicting a client and reclaims bytes", () => {
  const metrics = [];
  const manager = createConnectionManager({
    maxTotalBufferedBytes: 3,
    metrics: {
      increment: (...args) => metrics.push(args),
    },
  });
  const firstSocket = new FakeSocket();
  const secondSocket = new FakeSocket();
  manager.add("first", firstSocket);
  manager.add("second", secondSocket);

  assert.equal(manager.sendTo("first", "ab"), true);
  assert.equal(manager.sendTo("second", "ab"), false);
  assert.equal(manager.size(), 2);
  assert.ok(
    metrics.some(
      ([name, _value, attributes]) =>
        name === "ws.messages.dropped" &&
        attributes.reason === "aggregate_buffer_limit",
    ),
  );

  firstSocket.sendCallback(null);
  assert.equal(manager.sendTo("second", "ab"), true);
  manager.closeAll();
});

test("global message-rate cap applies across clients in one engine", async (t) => {
  const server = createServer();
  const engine = createEngine({
    authenticate: () => ({ role: "client" }),
    limits: {
      maxConnections: 2,
      maxMessagesPerSecond: 100,
      maxGlobalMessagesPerSecond: 1,
    },
    heartbeat: { heartbeatIntervalMs: 0, staleThresholdMs: 0 },
    logger: { warn() {}, error() {} },
  });
  engine.register("tick", (ctx) => ctx.reply({ type: "ack" }));
  engine.attach(server);
  t.after(async () => {
    await engine.stop();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `ws://127.0.0.1:${server.address().port}`;
  const first = await connectOrReject(url);
  const second = await connectOrReject(url);
  assert.equal(first.status, 101);
  assert.equal(second.status, 101);

  const firstAck = receiveType(first.socket, "ack");
  first.socket.send(JSON.stringify({ type: "tick" }));
  assert.deepEqual(await firstAck, { type: "ack" });

  const secondClose = new Promise((resolve) => {
    second.socket.once("close", (code) => resolve(code));
  });
  second.socket.send(JSON.stringify({ type: "tick" }));
  assert.equal(await secondClose, 1008);
});

test("send callback failure is counted, redacted, and removes the client", () => {
  const logs = [];
  const counters = [];
  const manager = createConnectionManager({
    logger: { warn: (...args) => logs.push(args), error() {} },
    metrics: { increment: (...args) => counters.push(args) },
  });
  const socket = new FakeSocket();
  manager.add("client", socket);

  assert.equal(manager.sendTo("client", "payload"), true);
  const error = Object.assign(new Error("token=private-value"), {
    code: "E_SEND",
  });
  socket.sendCallback(error);

  assert.equal(manager.size(), 0);
  assert.ok(counters.some(([name]) => name === "ws.send.failures"));
  assert.deepEqual(logs[0][1], { name: "Error", code: "E_SEND" });
  assert.equal(JSON.stringify(logs).includes("private-value"), false);
});

test("drain waits for close and terminates clients that exceed the deadline", async () => {
  const manager = createConnectionManager();
  const socket = new FakeSocket({ emitCloseOnClose: false });
  manager.add("slow", socket);

  await manager.drain(10);

  assert.equal(socket.closeCode, 1001);
  assert.equal(socket.terminated, true);
  assert.equal(manager.size(), 0);
});

test("metrics and logger callback failures do not escape or expose error messages", async () => {
  const warnings = [];
  const logger = {
    warn: (...args) => warnings.push(args),
    error() {
      throw new Error("logger failure");
    },
  };
  const metrics = createMetrics(
    {
      increment() {
        throw new Error("metric failure");
      },
      gauge() {
        return Promise.reject(new Error("async metric failure"));
      },
    },
    logger,
  );

  assert.doesNotThrow(() => metrics.increment("counter"));
  metrics.gauge("value", 1);
  await new Promise((resolve) => setImmediate(resolve));
  safeLog(logger, "error", "safe failure", new Error("credential=hidden"));

  assert.ok(warnings.length >= 2);
  assert.equal(JSON.stringify(warnings).includes("metric failure"), false);
  assert.equal(JSON.stringify(warnings).includes("hidden"), false);
});
