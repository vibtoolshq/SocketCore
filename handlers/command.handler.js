const { safeLog } = require("../engine/observability");

function createCommandHandler({ connectionManager, logger = console } = {}) {
  const ALLOWED = new Set(["ping", "echo", "broadcast", "shutdown-client"]);
  const ADMIN_ONLY = new Set(["broadcast", "shutdown-client"]);

  return async function handleCommand(ctx, msg) {
    const { name, args } = msg;
    if (!name || !ALLOWED.has(name)) {
      return ctx.reply({
        type: "error",
        code: "BAD_COMMAND",
        message: `command "${name}" not allowed`,
      });
    }
    if (ADMIN_ONLY.has(name) && ctx.identity?.role !== "admin") {
      return ctx.reply({
        type: "error",
        code: "FORBIDDEN",
        message: "admin role required",
      });
    }

    switch (name) {
      case "ping":
        return ctx.reply({
          type: "command",
          name: "ping",
          result: { pong: true, at: Date.now() },
        });

      case "echo":
        return ctx.reply({
          type: "command",
          name: "echo",
          result: args ?? null,
        });

      case "broadcast":
        const delivered = connectionManager.broadcast(
          { type: "command", name: "broadcast", result: args },
          (c) => c.id !== ctx.clientId,
        );
        return ctx.reply({
          type: "command",
          name: "broadcast",
          result: { delivered },
        });

      case "shutdown-client": {
        const targetId = args?.clientId;
        if (!targetId)
          return ctx.reply({
            type: "error",
            code: "BAD_ARGS",
            message: "clientId required",
          });
        const target = connectionManager.get(targetId);
        if (!target)
          return ctx.reply({
            type: "error",
            code: "NOT_FOUND",
            message: `client ${targetId} not found`,
          });
        try {
          target.ws.close(1000, "shutdown by admin");
        } catch (e) {
          safeLog(logger, "warn", "close failed", e);
        }
        return ctx.reply({
          type: "command",
          name: "shutdown-client",
          result: { ok: true },
        });
      }
    }
  };
}

module.exports = { createCommandHandler };
