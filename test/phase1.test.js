const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { test } = require("node:test");
const {
  DEFAULT_HEARTBEAT,
  DEFAULT_LIMITS,
  DEFAULT_PORT,
  resolveHeartbeat,
  resolveLimits,
} = require("../engine/config");
const { createConnectionManager } = require("../engine/connection-manager");
const { createCommandHandler } = require("../handlers/command.handler");

test("shared configuration defaults are bounded and overrides are validated", () => {
  assert.equal(DEFAULT_PORT, 8080);
  assert.deepEqual(resolveLimits(), DEFAULT_LIMITS);
  assert.deepEqual(resolveHeartbeat(), DEFAULT_HEARTBEAT);
  assert.throws(() => resolveLimits({ maxConnections: 0 }), /positive integer/);
  assert.throws(
    () => resolveLimits({ unknownLimit: 1 }),
    /unknown limits option/,
  );
  assert.throws(() => resolveLimits(null), /must be an object/);
  assert.throws(
    () => resolveHeartbeat({ heartbeatIntervalMs: -1 }),
    /non-negative integer/,
  );
  assert.throws(
    () => resolveHeartbeat({ unknownInterval: 1 }),
    /unknown heartbeat option/,
  );
});

test("connection manager defaults to deny and validates direct options", async () => {
  const manager = createConnectionManager();
  const socket = new EventEmitter();
  const client = manager.add("client-1", socket, { role: "client" });

  assert.equal(await manager.subscribe(client.id, "updates"), false);
  manager.remove(client.id);
  assert.throws(
    () => createConnectionManager({ maxConnections: 0 }),
    /positive integer/,
  );
  assert.throws(
    () => createConnectionManager({ unknownSetting: true }),
    /unknown connection manager option/,
  );
});

test("command broadcast reports successful sends returned by the manager", async () => {
  let response;
  const handler = createCommandHandler({
    connectionManager: {
      broadcast: () => 2,
      size: () => 50,
    },
  });

  await handler(
    {
      clientId: "sender",
      identity: { role: "admin" },
      reply: (payload) => {
        response = payload;
      },
    },
    { name: "broadcast", args: { value: 1 } },
  );

  assert.deepEqual(response.result, { delivered: 2 });
});
