"use strict";

const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { test } = require("node:test");
const WebSocket = require("ws");
const { createEngine } = require("../engine");
const { createCommandHandler } = require("../handlers/command.handler");
const { createStatusHandler } = require("../handlers/status.handler");

const TIMEOUT_MS = 3000;

function withMessages(socket) {
  const queued = [];
  const waiting = [];
  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    const deliver = waiting.shift();
    if (deliver) deliver(message);
    else queued.push(message);
  });
  socket.receive = () => {
    if (queued.length) return Promise.resolve(queued.shift());
    return new Promise((resolve, reject) => {
      const deliver = (message) => { clearTimeout(timer); resolve(message); };
      const timer = setTimeout(() => {
        const index = waiting.indexOf(deliver);
        if (index !== -1) waiting.splice(index, 1);
        reject(new Error("expected WebSocket message timed out"));
      }, TIMEOUT_MS);
      waiting.push(deliver);
    });
  };
  return socket;
}

async function fixture(t, options = {}) {
  const sockets = new Set();
  const logs = [];
  const server = createServer();
  const engine = createEngine({
    authenticate: (req) =>
      req.headers["x-auth-token"] === "client" ? { role: "client" } : null,
    allowedOrigins: ["https://allowed.example"],
    heartbeat: { heartbeatIntervalMs: 0, staleThresholdMs: 0 },
    logger: {
      warn: (...args) => logs.push(["warn", ...args]),
      error: (...args) => logs.push(["error", ...args]),
    },
    ...options,
  });
  engine.attach(server);
  t.after(async () => {
    for (const socket of sockets) socket.terminate();
    await engine.stop();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = "ws://127.0.0.1:" + server.address().port;

  async function open(headers = {}) {
    const socket = withMessages(new WebSocket(url, { headers }));
    sockets.add(socket);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.terminate();
        reject(new Error("accepted WebSocket handshake timed out"));
      }, TIMEOUT_MS);
      socket.once("open", () => { clearTimeout(timer); resolve(); });
      socket.once("error", (error) => { clearTimeout(timer); reject(error); });
    });
    return socket;
  }

  async function handshakeStatus(headers = {}) {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url, { headers });
      socket.on("error", () => {});
      const timer = setTimeout(() => {
        socket.terminate();
        reject(new Error("rejected WebSocket handshake timed out"));
      }, TIMEOUT_MS);
      socket.once("unexpected-response", (_request, response) => {
        clearTimeout(timer);
        const status = response.statusCode;
        response.resume();
        socket.terminate();
        resolve(status);
      });
      socket.once("open", () => {
        clearTimeout(timer);
        sockets.add(socket);
        resolve(101);
      });
    });
  }
  return { engine, logs, open, handshakeStatus };
}

async function exchange(socket, payload) {
  socket.send(typeof payload === "string" ? payload : JSON.stringify(payload));
  return socket.receive();
}

function waitClose(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("expected close frame timed out")),
      TIMEOUT_MS,
    );
    socket.once("close", (code) => { clearTimeout(timer); resolve(code); });
  });
}

test("PU-04 Origin rejection precedes auth; invalid credentials get 401; absent Origin stays allowed", async (t) => {
  const seenOrigins = [];
  const tokens = new Set(["valid-client"]);
  let authCalls = 0;
  const { open, handshakeStatus, engine } = await fixture(t, {
    authenticate: (req) => {
      authCalls++;
      const token = req.headers["x-auth-token"];
      return typeof token === "string" && tokens.has(token) ? { role: "client" } : null;
    },
    allowedOrigins: (origin) => {
      seenOrigins.push(origin);
      return origin === "https://allowed.example";
    },
  });
  assert.equal(await handshakeStatus({
    Origin: "https://blocked.example", "x-auth-token": "valid-client",
  }), 403);
  assert.equal(authCalls, 0);
  assert.deepEqual(seenOrigins, ["https://blocked.example"]);
  assert.equal(await handshakeStatus({ Origin: "https://allowed.example" }), 401);
  assert.equal(await handshakeStatus({
    Origin: "https://allowed.example", "x-auth-token": "invalid",
  }), 401);
  const socket = await open({ "x-auth-token": "valid-client" });
  assert.equal((await socket.receive()).type, "connected");
  assert.equal(engine.connectionManager.size(), 1);
  tokens.delete("valid-client");
  assert.equal(await handshakeStatus({ "x-auth-token": "valid-client" }), 401);
  assert.equal(engine.connectionManager.size(), 1);
});

test("PU-04 thrown authentication rejects with HTTP 500 and safe logger omits secret", async (t) => {
  const secret = "pu04-private-error-marker";
  const { logs, handshakeStatus } = await fixture(t, {
    authenticate: () => {
      throw Object.assign(new Error(secret), { code: "CREDENTIAL_PROVIDER_FAILURE" });
    },
  });
  assert.equal(await handshakeStatus({
    Origin: "https://allowed.example", "x-auth-token": secret,
  }), 500);
  assert.ok(logs.some(([level]) => level === "warn"));
  const output = JSON.stringify(logs);
  assert.ok(!output.includes(secret));
  assert.ok(output.includes("CREDENTIAL_PROVIDER_FAILURE"));
});

test("PU-04 group subscription defaults to deny; consumer authorizer isolates tenants", async (t) => {
  const deny = await fixture(t, { authenticate: () => ({ role: "client" }) });
  deny.engine.register("join", async (ctx, msg) => {
    ctx.reply({ type: "joined", ok: await ctx.subscribe(msg.group) });
  });
  const noPolicy = await deny.open();
  const noPolicyId = (await noPolicy.receive()).clientId;
  assert.equal(await deny.engine.connectionManager.subscribe(noPolicyId, "alpha"), false);
  assert.deepEqual(await exchange(noPolicy, { type: "join", group: "alpha" }),
    { type: "joined", ok: false });
  assert.equal(deny.engine.connectionManager.publish("alpha", { type: "event" }), 0);

  const tenant = await fixture(t, {
    authenticate: (req) => {
      const id = req.headers["x-auth-token"];
      return ["alpha", "beta"].includes(id) ? { tenantId: id } : null;
    },
    authorizeSubscription: (identity, group) => {
      if (group === "throwing-group") throw new Error("hidden-authorizer-secret");
      return identity.tenantId === group;
    },
  });
  tenant.engine.register("join", async (ctx, msg) => {
    ctx.reply({ type: "joined", group: msg.group, ok: await ctx.subscribe(msg.group) });
  });
  const alpha = await tenant.open({ "x-auth-token": "alpha" });
  const beta = await tenant.open({ "x-auth-token": "beta" });
  const alphaId = (await alpha.receive()).clientId;
  const betaId = (await beta.receive()).clientId;
  assert.equal(await tenant.engine.connectionManager.subscribe(alphaId, "beta"), false);
  assert.equal(await tenant.engine.connectionManager.subscribe(betaId, "alpha"), false);
  assert.deepEqual(await exchange(alpha, { type: "join", group: "beta" }),
    { type: "joined", group: "beta", ok: false });
  assert.deepEqual(await exchange(alpha, { type: "join", group: "alpha" }),
    { type: "joined", group: "alpha", ok: true });
  assert.deepEqual(await exchange(beta, { type: "join", group: "beta" }),
    { type: "joined", group: "beta", ok: true });
  assert.deepEqual(await exchange(alpha, { type: "join", group: "throwing-group" }),
    { type: "joined", group: "throwing-group", ok: false });
  assert.equal(tenant.engine.connectionManager.get(alphaId).subscriptions.has("beta"), false);
  assert.equal(tenant.engine.connectionManager.get(betaId).subscriptions.has("alpha"), false);
  assert.equal(tenant.engine.connectionManager.publish("alpha",
    { type: "event", group: "alpha" }), 1);
  assert.equal(tenant.engine.connectionManager.publish("beta",
    { type: "event", group: "beta" }), 1);
  assert.deepEqual(await alpha.receive(), { type: "event", group: "alpha" });
  assert.deepEqual(await beta.receive(), { type: "event", group: "beta" });
  assert.ok(!JSON.stringify(tenant.logs).includes("hidden-authorizer-secret"));
});

test("PU-04 malformed messages and exceptions preserve generic wire errors and sanitized logs", async (t) => {
  const secret = "hidden-handler-stack-message";
  const { engine, open, logs } = await fixture(t, {
    authenticate: () => ({ role: "client" }),
  });
  engine.register("explode", async () => { throw new Error(secret); });
  const socket = await open();
  await socket.receive();
  for (const [payload, code] of [
    ["{", "BAD_JSON"], ["[]", "BAD_MESSAGE"], [{ type: 55 }, "BAD_MESSAGE"],
    [{ type: "unregistered" }, "UNKNOWN_TYPE"], [{ type: "explode" }, "HANDLER_FAILED"],
  ]) {
    const response = await exchange(socket, payload);
    assert.equal(response.type, "error");
    assert.equal(response.code, code);
    assert.ok(!JSON.stringify(response).includes(secret));
    if (code === "HANDLER_FAILED") assert.equal(response.message, "internal error");
  }
  assert.ok(logs.some(([level]) => level === "error"));
  assert.ok(!JSON.stringify(logs).includes(secret));
});

test("PU-04 non-admin commands and status cannot snapshot, broadcast, or close another client", async (t) => {
  const { engine, open } = await fixture(t, {
    authenticate: (req) => {
      const token = req.headers["x-auth-token"];
      return token === "admin" ? { role: "admin" } :
        token === "client" ? { role: "client" } : null;
    },
  });
  engine.register("command", createCommandHandler({ connectionManager: engine.connectionManager }));
  engine.register("status", createStatusHandler({ connectionManager: engine.connectionManager }));
  const client = await open({ "x-auth-token": "client" });
  const other = await open({ "x-auth-token": "client" });
  const admin = await open({ "x-auth-token": "admin" });
  await client.receive();
  const otherId = (await other.receive()).clientId;
  await admin.receive();
  for (const msg of [
    { type: "command", name: "broadcast", args: { text: "secret" } },
    { type: "command", name: "shutdown-client", args: { clientId: otherId } },
    { type: "status", data: { request: "snapshot" } },
    { type: "status", data: { broadcast: true } },
  ]) {
    const response = await exchange(client, msg);
    assert.equal(response.type, "error");
    assert.equal(response.code, "FORBIDDEN");
  }
  assert.deepEqual(await exchange(client, { type: "command", name: "not-permitted" }), {
    type: "error", code: "BAD_COMMAND", message: 'command "not-permitted" not allowed',
  });
  assert.equal(other.readyState, WebSocket.OPEN);
  assert.equal(engine.connectionManager.size(), 3);
  assert.deepEqual((await exchange(other,
    { type: "status", data: { request: "health" } })).data.echo,
    { request: "health" });
  const snapshot = await exchange(admin, { type: "status", data: { request: "snapshot" } });
  assert.equal(snapshot.type, "status");
  assert.equal(snapshot.data.clients, 3);
});

test("PU-04 rate and concurrent-message policy violations retain close codes 1008/1013", async (t) => {
  const rate = await fixture(t, {
    authenticate: () => ({ role: "client" }),
    limits: { maxMessagesPerSecond: 1, maxGlobalMessagesPerSecond: Infinity },
  });
  rate.engine.register("tick", (ctx) => ctx.reply({ type: "ack" }));
  const fast = await rate.open();
  await fast.receive();
  const rateClosed = waitClose(fast);
  fast.send(JSON.stringify({ type: "tick" }));
  fast.send(JSON.stringify({ type: "tick" }));
  assert.equal(await rateClosed, 1008);

  let settleWork;
  const blockedWork = new Promise((resolve) => { settleWork = resolve; });
  const busyEngine = await fixture(t, {
    authenticate: () => ({ role: "client" }),
    limits: { maxMessagesPerSecond: 100, maxConcurrentMessagesPerClient: 1 },
  });
  busyEngine.engine.register("hold", async () => blockedWork);
  const busy = await busyEngine.open();
  await busy.receive();
  const concurrencyClosed = waitClose(busy);
  try {
    busy.send(JSON.stringify({ type: "hold" }));
    busy.send(JSON.stringify({ type: "hold" }));
    assert.equal(await concurrencyClosed, 1013);
  } finally {
    settleWork();
  }
});
