const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { test } = require("node:test");
const WebSocket = require("ws");
const { createEngine } = require("../engine");
const { createCommandHandler } = require("../handlers/command.handler");

test("engine authenticates upgrades and isolates authorized groups", async (t) => {
  const server = createServer();
  const sockets = new Set();
  const engine = createEngine({
    authenticate: (req) => {
      const tenantId = req.headers["x-auth-token"];
      return ["alpha", "beta"].includes(tenantId) ? { tenantId } : null;
    },
    authorizeSubscription: (identity, group) => group === identity.tenantId,
    allowedOrigins: ["https://allowed.example"],
    logger: { warn() {}, error() {} },
    limits: {
      maxConnections: 2,
      maxMessagesPerSecond: 20,
      maxPayloadBytes: 128,
    },
    heartbeat: { heartbeatIntervalMs: 0, staleThresholdMs: 0 },
  });
  engine.attach(server);
  engine.register("join", async (ctx, message) => {
    ctx.reply({
      type: "joined",
      group: message.group,
      ok: await ctx.subscribe(message.group),
    });
  });
  engine.register(
    "command",
    createCommandHandler({
      connectionManager: engine.connectionManager,
      logger: { warn() {} },
    }),
  );

  t.after(async () => {
    for (const socket of sockets) socket.terminate();
    engine.stop();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `ws://127.0.0.1:${server.address().port}`;

  const rejectedStatus = (headers) =>
    new Promise((resolve, reject) => {
      const socket = new WebSocket(url, { headers });
      const timeout = setTimeout(
        () => reject(new Error("upgrade timed out")),
        3000,
      );
      socket.once("unexpected-response", (_, response) => {
        clearTimeout(timeout);
        const status = response.statusCode;
        response.resume();
        resolve(status);
      });
      socket.once("open", () => {
        clearTimeout(timeout);
        sockets.add(socket);
        resolve(101);
      });
      socket.once("error", (error) => {
        if (socket.readyState !== WebSocket.CLOSED) return;
        clearTimeout(timeout);
        reject(error);
      });
    });

  const connect = async (tenantId) => {
    const socket = new WebSocket(url, {
      headers: {
        Origin: "https://allowed.example",
        "x-auth-token": tenantId,
      },
    });
    sockets.add(socket);
    const messages = [];
    const waiters = [];
    socket.on("message", (data) => {
      const message = JSON.parse(data.toString());
      const resolve = waiters.shift();
      if (resolve) resolve(message);
      else messages.push(message);
    });
    socket.receive = () => {
      if (messages.length > 0) return Promise.resolve(messages.shift());
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("message timed out")),
          3000,
        );
        waiters.push((message) => {
          clearTimeout(timeout);
          resolve(message);
        });
      });
    };
    await new Promise((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });
    return socket;
  };

  assert.equal(
    await rejectedStatus({
      Origin: "https://blocked.example",
      "x-auth-token": "alpha",
    }),
    403,
  );
  assert.equal(
    await rejectedStatus({
      Origin: "https://allowed.example",
      "x-auth-token": "invalid",
    }),
    401,
  );

  const alpha = await connect("alpha");
  const alphaConnected = await alpha.receive();
  assert.equal(alphaConnected.type, "connected");
  assert.equal(
    await engine.connectionManager.subscribe(alphaConnected.clientId, "beta"),
    false,
  );
  alpha.send(JSON.stringify({ type: "join", group: "alpha" }));
  assert.deepEqual(await alpha.receive(), {
    type: "joined",
    group: "alpha",
    ok: true,
  });
  alpha.send(JSON.stringify({ type: "join", group: "beta" }));
  assert.deepEqual(await alpha.receive(), {
    type: "joined",
    group: "beta",
    ok: false,
  });

  const beta = await connect("beta");
  assert.equal((await beta.receive()).type, "connected");
  beta.send(JSON.stringify({ type: "join", group: "beta" }));
  assert.deepEqual(await beta.receive(), {
    type: "joined",
    group: "beta",
    ok: true,
  });
  alpha.send(
    JSON.stringify({
      type: "command",
      name: "shutdown-client",
      args: { clientId: "beta-client" },
    }),
  );
  assert.deepEqual(await alpha.receive(), {
    type: "error",
    code: "FORBIDDEN",
    message: "admin role required",
  });

  assert.equal(
    await rejectedStatus({
      Origin: "https://allowed.example",
      "x-auth-token": "alpha",
    }),
    503,
  );
  assert.equal(
    engine.connectionManager.publish("alpha", { type: "event", value: 1 }),
    1,
  );
  assert.deepEqual(await alpha.receive(), { type: "event", value: 1 });
  const oversizedFrameClose = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("oversized frame was not rejected")),
      3000,
    );
    alpha.once("close", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
  alpha.send("x".repeat(256));
  assert.equal(await oversizedFrameClose, 1009);
  assert.equal(engine.connectionManager.size(), 1);
});
