# SocketCore Developer Documentation

**Package:** `configurable-websocket-engine@1.0.0` · **Runtime:** Node.js `>=20` · **Format:** CommonJS · **License:** MIT.

SocketCore is an embeddable, authenticated WebSocket transport engine. The installed package exports **only `createEngine`**. Your application owns the HTTP/HTTPS listener, credential issuance, TLS, reconnecting clients, persistence, and operational monitoring. See [public API boundaries](api/index.md) before integrating.

## Navigate

| Goal | Documentation |
| --- | --- |
| Install and run | [Getting started](getting-started/index.md) |
| Add handlers and groups | [Developer guides](guides/index.md) |
| Exact exported API and returned interfaces | [API reference](api/index.md) |
| Limits, callbacks, errors | [Configuration](reference/configuration.md) · [Error reference](api/messages.md) |
| Request flow and lifecycle | [Architecture](architecture/overview.md) |
| Tests, debugging, contributions and release | [Development](development/testing.md) · [Release](development/release-process.md) |
| Failure diagnosis | [Troubleshooting](help/troubleshooting.md) |
| Source coverage and QA | [Documentation audit](COVERAGE_AUDIT.md) |

The original, npm-packaged technical references remain authoritative supplements: [Engine API](ENGINE_API.md), [Configuration](CONFIGURATION.md), and [WebSocket protocol](WEBSOCKET_PROTOCOL.md). Only these three docs ship inside the **1.0.0 npm tarball**. The wider documentation suite lives in the GitHub repository, **not** in the installed npm package.

## Implementation at a glance

- Inject your own `authenticate(req, { signal })` callback; invalid identity rejects the upgrade.
- Optionally constrain `path` and `allowedOrigins` (a missing Origin is allowed).
- Register application handlers via `engine.register(type, handler)` and call `engine.attach(server)`, then `engine.start()`.
- Use `ctx.reply`, `ctx.subscribe` and `ctx.publish` for responses and authorized groups. Subscription access is **deny-by-default**.
- Limit active connections, pending upgrades, messages, concurrent handlers and buffered output. Call `await engine.stop()` before closing your host server.

**Scope:** This is developer documentation for the actual 1.0.0 codebase at audited repository HEAD `ef2586daf83ba7f64bee830185699cf92acd9a64` (2026-11-19). Published npmjs package 1.0.0 is a separate immutable release made from tag `npm-v1.0.0`; the docs here describe the unchanged core API and may include repository-only development details. A live 4 GiB VPS throughput/SLO guarantee has **not** been established.
