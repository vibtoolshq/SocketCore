# SocketCore Production Deployment Boundaries

**A reusable WebSocket core for real-time Node.js applications.** This guide is an operator checklist for embedding or deploying SocketCore. It does not certify the package for a particular workload. The repository has local loopback measurements, but no production workload, host, network path, or SLO has been specified.

## Responsibilities

The engine provides authenticated WebSocket upgrades through an application callback, exact-origin policy, payload/rate/concurrency limits, per-socket and aggregate send-buffer controls, heartbeat, bounded shutdown drain, and injectable logger/metrics callbacks.

The embedding application or deployment must provide TLS termination, secret storage/rotation, any HTTP routes, path selection, proxy configuration, process supervision, metrics storage/export, alerting, and workload-specific resource settings. The standalone `app.js` creates plain HTTP and does not provide these deployment services.

## TLS and Network Path

- Terminate TLS at a trusted load balancer/reverse proxy or attach the engine to an HTTPS server created by the embedding application. `engine.attach(server)` listens for HTTP `upgrade` events; it does not create a listener or configure TLS.
- If a proxy is used, configure and validate its WebSocket upgrade forwarding, idle timeouts, connection limits, and health/drain behavior in that proxy. This repository does not include proxy configuration or test a proxy path.
- The engine does not inspect forwarded headers, infer trusted client IPs, or negotiate subprotocols. The standalone app does not enforce a URL path; library consumers may set the optional `path` factory option to filter upgrades, while the host application owns unmatched-upgrade behavior. Do not treat arbitrary forwarded headers as verified client identity.
- The standalone app accepts upgrade requests without checking their URL path. If an application needs path isolation, implement it in the server/proxy integration and test rejected paths explicitly.

## Authentication and Origin Policy

- Require a strong authentication callback for every engine instance. The standalone app uses exact `x-auth-token` matching against `AUTH_TOKENS`; it is a sample adapter, not a token issuance or rotation system.
- Store secrets in the deployment's secret manager or protected environment configuration. Never put tokens in source control, URLs, metrics labels, or logs. Rotate credentials through the application-specific authentication system.
- Configure an explicit origin allowlist for browser clients. Origin is not authentication: non-browser clients may omit it, and the engine allows requests with no `Origin` header.
- Avoid wildcard origin policy for browser-facing deployments unless the application has deliberately assessed that exposure. Origin checks do not replace authentication or authorization.
- The standalone app has no subscription authorization callback; the engine's default denies all subscriptions. A consumer that uses groups must provide an authorization callback and test tenant/group isolation.

## Limits and Workload Sizing

Set finite limits based on measured application traffic, including connection count, simultaneous handshakes, payload size, per-client message rate, handler concurrency, fanout, and slow-client behavior. The defaults are guardrails, not capacity promises.

`maxGlobalMessagesPerSecond` and `maxTotalBufferedBytes` have active library defaults of 500 messages/second and 64 MiB. These are configurable guardrails, not deployment-specific capacity guarantees. Size and load-test them against the real workload; the library accepts explicit `Infinity` as an opt-out, while the standalone environment parser accepts positive integers only.

The local 1,000- and 2,000-client loopback results in [LOAD_TESTING.md](LOAD_TESTING.md) use small synthetic status messages on one Windows host. They are not a supported-N guarantee and do not predict performance on another host, proxy, TLS path, payload, fanout, or client traffic pattern.

## Observability and Operations

- Supply metrics callbacks and connect them to an application-owned exporter or monitoring system. The package does not include a metrics backend, persistence, dashboard, or alert rules.
- Keep metric labels low-cardinality. Never attach credentials, raw request URLs, or user identities as metric attributes.
- The engine sanitizes error details passed through its safe logging helper to error name/code. Application handlers and external callbacks remain responsible for their own logging and redaction.
- Add deployment-owned readiness/liveness checks. This package does not expose an HTTP health endpoint.
- Run the process under a supervisor with a deliberate restart policy. The standalone app handles SIGINT/SIGTERM and awaits engine drain before closing its HTTP listener; behavior under forced process termination is controlled by the host.
- Use finite shutdown drain settings compatible with the orchestrator's termination grace period. A timed-out authentication/origin provider promise is not cancellable by the engine and may continue its own work.

## Release Checklist

Before exposing a deployment to users, the owning application team should verify:

- TLS, certificate renewal, proxy forwarding, idle timeouts, and the intended upgrade path.
- Authentication, authorization, credential rotation, origin behavior, and missing-Origin client policy.
- Finite connection/message/payload/concurrency/buffer limits against a representative workload.
- Slow-client, overload, reconnect, shutdown, restart, and dependency-failure behavior.
- Metrics export, actionable alerts, logs, readiness checks, and resource limits on the target host.
- A repeatable load profile with the real payload size/rate/fanout mix and an explicitly approved SLO.

Items above are deployment responsibilities, not features silently supplied by this package. Mark untested items unknown rather than assuming infrastructure provides them.
