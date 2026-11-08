const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createServer } = require("node:http");
const { test } = require("node:test");
const WebSocket = require("ws");
const { createConnectionManager } = require("../engine/connection-manager");
const { createEngine } = require("../engine");

class FakeSocket extends EventEmitter {
  constructor() {
    super();
    this.readyState = WebSocket.OPEN;
    this.bufferedAmount = 0;
    this.messages = [];
  }

  send(data, callback) {
    this.messages.push(data);
    callback?.();
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timeout = setTimeout(() => {
      socket.terminate();
      reject(new Error(`WebSocket upgrade timed out for ${url}`));
    }, 3000);
    socket.once("open", () => {
      clearTimeout(timeout);
      resolve(socket);
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

test("duplicate client IDs are rejected without changing existing ownership", async () => {
  const manager = createConnectionManager({
    authorizeSubscription: () => true,
  });
  const originalSocket = new FakeSocket();
  const duplicateSocket = new FakeSocket();
  const original = manager.add("shared-id", originalSocket, { owner: "first" });

  assert.equal(await manager.subscribe("shared-id", "private"), true);
  assert.equal(
    manager.add("shared-id", duplicateSocket, { owner: "second" }),
    null,
  );
  assert.strictEqual(manager.get("shared-id"), original);
  assert.equal(manager.publish("private", { type: "event" }), 1);
  assert.equal(originalSocket.messages.length, 1);
  assert.equal(duplicateSocket.messages.length, 0);

  originalSocket.emit("close");
  assert.equal(manager.size(), 0);
});

test("engine path must be an absolute URL pathname", () => {
  assert.throws(
    () => createEngine({ authenticate: () => ({}), path: "socket" }),
    /path must be an absolute URL pathname/,
  );
  assert.throws(
    () => createEngine({ authenticate: () => ({}), path: "/socket?tenant=1" }),
    /path must be an absolute URL pathname/,
  );
});

test("engines on a shared server only consume their configured path", async (t) => {
  const server = createServer();
  const sockets = [];
  const authenticationCalls = { alpha: 0, beta: 0 };
  const engines = [
    createEngine({
      path: "/alpha",
      authenticate: () => {
        authenticationCalls.alpha++;
        return { application: "alpha" };
      },
      heartbeat: { heartbeatIntervalMs: 0, staleThresholdMs: 0 },
      logger: { warn() {}, error() {} },
    }),
    createEngine({
      path: "/beta",
      authenticate: () => {
        authenticationCalls.beta++;
        return { application: "beta" };
      },
      heartbeat: { heartbeatIntervalMs: 0, staleThresholdMs: 0 },
      logger: { warn() {}, error() {} },
    }),
  ];
  for (const engine of engines) engine.attach(server);

  t.after(async () => {
    for (const socket of sockets) socket.terminate();
    await Promise.all(engines.map((engine) => engine.stop()));
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `ws://127.0.0.1:${server.address().port}`;

  const alpha = await connect(`${baseUrl}/alpha?source=test`);
  sockets.push(alpha);
  assert.deepEqual(authenticationCalls, { alpha: 1, beta: 0 });

  const beta = await connect(`${baseUrl}/beta`);
  sockets.push(beta);
  assert.deepEqual(authenticationCalls, { alpha: 1, beta: 1 });
});
