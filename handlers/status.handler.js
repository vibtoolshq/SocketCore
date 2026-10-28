function createStatusHandler({
  connectionManager,
  clock = () => Date.now(),
} = {}) {
  return async function handleStatus(ctx, msg) {
    const payload = msg.data ?? {};
    if (
      (payload.request === "snapshot" || payload.broadcast === true) &&
      ctx.identity?.role !== "admin"
    ) {
      return ctx.reply({
        type: "error",
        code: "FORBIDDEN",
        message: "admin role required",
      });
    }

    if (payload.request === "snapshot") {
      return ctx.reply({
        type: "status",
        data: { clients: connectionManager.size(), serverTime: clock() },
      });
    }

    if (payload.broadcast === true) {
      connectionManager.broadcast(
        { type: "status", data: { from: ctx.clientId, ...payload } },
        (c) => c.id !== ctx.clientId,
      );
      return;
    }

    ctx.reply({
      type: "status",
      data: { ack: true, serverTime: clock(), echo: payload },
    });
  };
}

module.exports = { createStatusHandler };
