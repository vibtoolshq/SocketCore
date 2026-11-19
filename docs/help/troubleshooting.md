---
title: "Troubleshooting and FAQ"
description: "Common authentication, integration, exports and runtime failures."
order: 1
draft: false
---

# Troubleshooting and FAQ

**Q: `require("configurable-websocket-engine/package.json")` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`.**

A: Only the package root `require("configurable-websocket-engine")` is exported. Obtain version information from npm metadata; don't depend on a private package subpath.

**Q: Browser WebSocket cannot send `x-auth-token`.**

A: Native browser `WebSocket` cannot set arbitrary headers. The sample `app.js` demonstrates non-browser header authentication only. Use an application-designed, audited browser authentication contract; SocketCore has no built-in browser ticket SDK.

**Q: Why am I getting HTTP 403?**

A: Origin policy rejected a provided Origin. `allowedOrigins` requires exact matches unless configured `"*"` or a callback. HTTP 401 instead means invalid identity.

**Q: Why does subscribing to a group return false?**

A: It defaults to deny. Configure `authorizeSubscription(identity, group, req)` and `await ctx.subscribe(group)`. Check invalid names, permissions, group count and client disconnects.

**Q: Why can't I get data from `/health` or `/ready`?**

A: SocketCore exposes neither route. PU-05 used **test-owned** endpoints in a temporary local proxy. Expose health/metrics through your host application or approved proxy.

**Q: Why do sends return false or clients close 1013?**

A: Check open socket state and per-client/aggregate buffered-byte ceilings, per-client/global concurrency and message rates. A send accepted for buffering does not prove delivery or handling.

**Q: Can this run as `wss://` on Cloudflare Pages alone?**

A: Static hosting does not run this Node engine. Put it behind an actual Node HTTP(S)/WSS deployment; a static browser dashboard alone is not a server or a source of real process CPU/RSS metrics.

**Q: Does GitHub Actions passing mean production-ready at 4 GiB?**

A: No. The CI runner's load tests are local synthetic workload, not a target-VPS capacity SLO. Real TLS/proxy, operator alerts, secret rotation and rollback still require deployment-specific validation.

**Q: What is an unexpected `HANDLER_FAILED`?**

A: A handler threw or rejected; the transport emits a generic client error and calls the safe host logger. Reproduce with sanitized inputs and inspect application-level logic.

For detailed reference, see [API errors](../api/messages.md), [debugging](../development/debugging.md), [configuration](../reference/configuration.md) and [support](https://github.com/vibtoolshq/SocketCore/blob/main/SUPPORT.md).
