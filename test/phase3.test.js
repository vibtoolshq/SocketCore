const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { test } = require("node:test");
const WebSocket = require("ws");
const { createEngine } = require("../engine");

function createApplication({
  appId,
  tokenHeader,
  token,
  origin,
  responseType,
  metrics,
}) {
  const server = createServer();
  const engine = createEngine({
    authenticate: (request) =>
      request.headers[tokenHeader] === token ? { appId } : null,
    authorizeSubscription: (identity, topic) => topic === identity.appId,
    allowedOrigins: [origin],
    metrics,
    heartbeat: { heartbeatIntervalMs: 0, staleThresholdMs: 0 },
  });
  engine.register(responseType, (ctx, message) => {
    ctx.reply({
      type: "app-response",
      appId: ctx.identity.appId,
      value: message.value,
    });
  });
  engine.attach(server);
  engine.start();
  return { appId, engine, server, tokenHeader, token, origin, responseType };
}

function connect(application) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(
      `ws://127.0.0.1:${application.server.address().port}`,
      {
        headers: {
          Origin: application.origin,
          [application.tokenHeader]: application.token,
        },
      },
    );
    const messages = [];
    const waiters = [];
    socket.on("message", (data) => {
      const message = JSON.parse(data.toString());
      const waiter = waiters.shift();
      if (waiter) waiter(message);
      else messages.push(message);
    });
    socket.receive = () => {
      if (messages.length) return Promise.resolve(messages.shift());
      return new Promise((resolveMessage) => waiters.push(resolveMessage));
    };
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

test("two applications compose independently through the public engine API", async (t) => {
  const alphaMetrics = [];
  const betaMetrics = [];
  const applications = [
    createApplication({
      appId: "alpha",
      tokenHeader: "x-alpha-token",
      token: "alpha-secret",
      origin: "https://alpha.example",
      responseType: "alpha:read",
      metrics: { increment: (...args) => alphaMetrics.push(args) },
    }),
    createApplication({
      appId: "beta",
      tokenHeader: "authorization",
      token: "Bearer beta-secret",
      origin: "https://beta.example",
      responseType: "beta:read",
      metrics: { increment: (...args) => betaMetrics.push(args) },
    }),
  ];
  const sockets = [];

  t.after(async () => {
    for (const socket of sockets) socket.terminate();
    await Promise.all(applications.map(({ engine }) => engine.stop()));
    await Promise.all(
      applications.map(({ server }) =>
        server.listening
          ? new Promise((resolve) => server.close(resolve))
          : Promise.resolve(),
      ),
    );
  });

  await Promise.all(
    applications.map(
      ({ server }) =>
        new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)),
    ),
  );
  const [alpha, beta] = await Promise.all(applications.map(connect));
  sockets.push(alpha, beta);

  assert.equal((await alpha.receive()).type, "connected");
  assert.equal((await beta.receive()).type, "connected");
  alpha.send(JSON.stringify({ type: "alpha:read", value: "alpha-data" }));
  beta.send(JSON.stringify({ type: "beta:read", value: "beta-data" }));

  assert.deepEqual(await alpha.receive(), {
    type: "app-response",
    appId: "alpha",
    value: "alpha-data",
  });
  assert.deepEqual(await beta.receive(), {
    type: "app-response",
    appId: "beta",
    value: "beta-data",
  });
  assert.ok(alphaMetrics.some(([name]) => name === "ws.upgrades.accepted"));
  assert.ok(betaMetrics.some(([name]) => name === "ws.upgrades.accepted"));
});
