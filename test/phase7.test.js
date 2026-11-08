const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { test } = require("node:test");
const WebSocket = require("ws");
const { DEFAULT_LIMITS, resolveLimits } = require("../engine/config");
const { createEngine } = require("../engine");

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const messages = [];
    const waiters = [];
    socket.on("message", (data) => {
      const message = JSON.parse(data.toString());
      const waiterIndex = waiters.findIndex(
        ({ type }) => type === message.type,
      );
      if (waiterIndex === -1) {
        messages.push(message);
        return;
      }
      const [{ resolve: resolveMessage }] = waiters.splice(waiterIndex, 1);
      resolveMessage(message);
    });
    socket.receiveType = (type) => {
      const messageIndex = messages.findIndex(
        (message) => message.type === type,
      );
      if (messageIndex !== -1) {
        return Promise.resolve(messages.splice(messageIndex, 1)[0]);
      }
      return new Promise((resolveMessage) => {
        waiters.push({ type, resolve: resolveMessage });
      });
    };
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

function receiveType(socket, expectedType) {
  return socket.receiveType(expectedType);
}

function waitForClose(socket) {
  return new Promise((resolve) => {
    socket.once("close", (code) => resolve(code));
  });
}

test("global handler work limit is finite and configurable", () => {
  assert.equal(DEFAULT_LIMITS.maxGlobalConcurrentMessages, 1024);
  assert.equal(
    resolveLimits({ maxGlobalConcurrentMessages: 12 })
      .maxGlobalConcurrentMessages,
    12,
  );
  assert.equal(
    resolveLimits({ maxGlobalConcurrentMessages: Infinity })
      .maxGlobalConcurrentMessages,
    Infinity,
  );
  assert.throws(
    () => resolveLimits({ maxGlobalConcurrentMessages: 0 }),
    /positive integer/,
  );
});

test(
  "disconnect aborts handler signal and keeps global work reserved until settlement",
  { timeout: 5000 },
  async (t) => {
    const server = createServer();
    const engine = createEngine({
      authenticate: () => ({ role: "client" }),
      limits: {
        maxConnections: 4,
        maxMessagesPerSecond: 100,
        maxConcurrentMessagesPerClient: 4,
        maxGlobalConcurrentMessages: 1,
      },
      heartbeat: { heartbeatIntervalMs: 0, staleThresholdMs: 0 },
      logger: { warn() {}, error() {} },
    });
    let handlerSignal;
    let notifyHandlerStarted;
    let releaseFirstHandler;
    let notifyFirstHandlerSettled;
    const handlerStarted = new Promise((resolve) => {
      notifyHandlerStarted = resolve;
    });
    const firstHandlerSettled = new Promise((resolve) => {
      notifyFirstHandlerSettled = resolve;
    });
    engine.register("task", async (ctx, message) => {
      if (message.id === "blocked") {
        handlerSignal = ctx.signal;
        notifyHandlerStarted();
        try {
          await new Promise((resolve) => {
            releaseFirstHandler = resolve;
          });
        } finally {
          notifyFirstHandlerSettled();
        }
      }
      ctx.reply({ type: "completed", id: message.id });
    });
    engine.attach(server);

    const sockets = [];
    t.after(async () => {
      releaseFirstHandler?.();
      for (const socket of sockets) socket.terminate();
      await engine.stop();
      if (server.listening)
        await new Promise((resolve) => server.close(resolve));
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `ws://127.0.0.1:${server.address().port}`;
    const first = await connect(url);
    sockets.push(first);
    await receiveType(first, "connected");
    first.send(JSON.stringify({ type: "task", id: "blocked" }));
    await handlerStarted;

    assert.ok(handlerSignal instanceof AbortSignal);
    const disconnected = new Promise((resolve) => {
      handlerSignal.addEventListener("abort", resolve, { once: true });
    });
    first.terminate();
    await disconnected;
    assert.equal(handlerSignal.aborted, true);

    const second = await connect(url);
    sockets.push(second);
    await receiveType(second, "connected");
    const overloadedClose = waitForClose(second);
    second.send(JSON.stringify({ type: "task", id: "rejected" }));
    assert.equal(await overloadedClose, 1013);

    releaseFirstHandler();
    await firstHandlerSettled;

    const third = await connect(url);
    sockets.push(third);
    await receiveType(third, "connected");
    const completed = receiveType(third, "completed");
    third.send(JSON.stringify({ type: "task", id: "recovered" }));
    assert.deepEqual(await completed, { type: "completed", id: "recovered" });
  },
);

test("engine stop aborts active handler signals", async (t) => {
  const server = createServer();
  const engine = createEngine({
    authenticate: () => ({ role: "client" }),
    heartbeat: { heartbeatIntervalMs: 0, staleThresholdMs: 0 },
    logger: { warn() {}, error() {} },
  });
  let handlerSignal;
  let notifyHandlerStarted;
  let releaseHandler;
  const handlerStarted = new Promise((resolve) => {
    notifyHandlerStarted = resolve;
  });
  engine.register("hold", async (ctx) => {
    handlerSignal = ctx.signal;
    notifyHandlerStarted();
    await new Promise((resolve) => {
      releaseHandler = resolve;
    });
  });
  engine.attach(server);

  let socket;
  t.after(async () => {
    releaseHandler?.();
    socket?.terminate();
    await engine.stop();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  socket = await connect(`ws://127.0.0.1:${server.address().port}`);
  await receiveType(socket, "connected");
  socket.send(JSON.stringify({ type: "hold" }));
  await handlerStarted;

  assert.ok(handlerSignal instanceof AbortSignal);
  const stopping = engine.stop();
  assert.equal(handlerSignal.aborted, true);
  releaseHandler();
  await stopping;
});
