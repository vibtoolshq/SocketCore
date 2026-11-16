# SocketCore Production Deployment Boundaries

**A reusable WebSocket core for real-time Node.js applications.** This guide is an operator checklist for embedding or deploying SocketCore. It does not certify the package for a particular workload. The repository has local loopback measurements, but no production workload, host, network path, or SLO has been specified.

## Responsibilities

The engine provides authenticated WebSocket upgrades through an application callback, exact-origin policy, payload/rate/concurrency limits, per-socket and aggregate send-buffer controls, heartbeat, bounded shutdown drain, and injectable logger/metrics callbacks.

The embedding application or deployment must provide TLS termination, secret storage/rotation, any HTTP routes, path selection, proxy configuration, process supervision, metrics storage/export, alerting, and workload-specific resource settings. The standalone `app.js` creates plain HTTP and does not provide these deployment services.

## TLS and Network Path

- Terminate TLS at a trusted load balancer/reverse proxy or attach the engine to an HTTPS server created by the embedding application. `engine.attach(server)` listens for HTTP `upgrade` events; it does not create a listener or configure TLS.
- If a proxy is used, configure and validate its WebSocket upgrade forwarding, idle timeouts, connection limits, and health/drain behavior in that proxy. This repository does **not** include a production reverse-proxy configuration; PU-05 provides only a loopback **test-only HTTPS/WSS proxy integration harness**, not a deployable proxy.
- The engine does not inspect forwarded headers, infer trusted client IPs, or negotiate subprotocols. The standalone app does not enforce a URL path; library consumers may set the optional `path` factory option to filter upgrades, while the host application owns unmatched-upgrade behavior. Do not treat arbitrary forwarded headers as verified client identity.
- The standalone app accepts upgrade requests without checking their URL path. If an application needs path isolation, implement it in the server/proxy integration and test rejected paths explicitly.

## Authentication and Origin Policy

- Require a strong authentication callback for every engine instance. The standalone app uses exact `x-auth-token` matching against `AUTH_TOKENS`; it is a sample adapter, not a token issuance or rotation system.
- Store secrets in the deployment's secret manager or protected environment configuration. Never put tokens in source control, URLs, metrics labels, or logs. Rotate credentials through the application-specific authentication system.
- Configure an explicit origin allowlist for browser clients. Origin is not authentication: non-browser clients may omit it, and the engine allows requests with no `Origin` header.
- Avoid wildcard origin policy for browser-facing deployments unless the application has deliberately assessed that exposure. Origin checks do not replace authentication or authorization.
- The standalone app has no subscription authorization callback; the engine's default denies all subscriptions. A consumer that uses groups must provide an authorization callback and test tenant/group isolation.
- The default sample authentication uses a static `x-auth-token` header for Node/Python-style clients. A native browser cannot set arbitrary WebSocket request headers; do not work around this by placing long-lived tokens into query strings. Browser credentials, issuance, expiry, rotation and revocation require a separate consuming-app security contract and live acceptance.

## Local Security Acceptance Coverage

The targeted `test/pu04-security.test.js` suite checks HTTP 401/403/500 handshake decisions, absent-Origin behavior, default-deny subscriptions and tenant isolation, privileged-message authorization, BAD_JSON/BAD_MESSAGE/UNKNOWN_TYPE/HANDLER_FAILED protocol errors and redacted logs, plus WS 1008/1013 overload closes. These tests use local Node `ws` clients and an in-memory, application-supplied auth/group policy, **not** the standalone app's env-token deployment, native-browser credentials, a real WSS proxy, or live token revocation. Existing callback deadline/shutdown 503 and payload 1009 are covered by earlier tests. `npm test` includes these security cases once the file is present.

Any live client credential or multi-tenant policy requires explicit per-application design and acceptance. A successful local test is not a production security certificate. PU-05 now exercises **local test-only** TLS/reverse-proxy/health/drain behavior; real target proxy/ops acceptance remains open until deployment topology is selected. Representative 4 GiB VPS load/SLO checks remain PU-06.

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

## PU-05 Local WSS/Proxy Smoke and Actual Operations Runbook

**Status (2026-11-17):** `test/pu05-wss-proxy.test.js` is a local Node integration harness, **not** a proxy server or production configuration. It creates an ephemeral 1-day self-signed certificate with an OpenSSL CLI in the OS temporary directory, binds an HTTPS reverse-proxy test server and plain HTTP engine backend to `127.0.0.1` only, and removes the test key/certificate after execution. It uses the existing `ws` dependency; it does not add a production HTTP health route, TLS listener, monitoring exporter, process supervisor, secret manager or Docker/Caddy configuration. Local verification uses Windows Node v24.22.1 and Git for Windows OpenSSL 3.5.9; Linux GitHub-hosted CI requires the standard OpenSSL CLI.

To run the focused **local-only** test:

```sh
node --test test/pu05-wss-proxy.test.js
```

The harness exercises validated `wss://` through a test reverse proxy, default rejection of an untrusted test certificate (no TLS-verification bypass), accepted/rejected upgrade paths (wrong path 404, missing token 401, denied Origin 403), proxy stripping forged incoming forwarded headers, preserved ping/pong and application response, and callback-based metrics/log credential redaction. In the test fixture only, `GET /health` checks proxy *liveness* while `GET /ready` depends on upstream service availability; when the backend is stopped, the proxy stays alive but readiness returns 503. It verifies `engine.stop()` closes a client with 1001 and that a fresh engine instance can reconnect through the same test proxy. **This is not an acceptance test against any real Caddy/Nginx instance or valid public certificate.**

For an **actual authorized environment**, the consuming application/operator must first record the chosen topology and its owner: (1) library embedded into the existing HTTPS server, or (2) separately authorized standalone service. Record VPS OS/vCPU/RAM, exact Node version, public domain, TLS owner/cert renewal, reverse proxy and upstream bind address/path, application credential transport and rotation, host process supervisor and monitoring/alert ownership. Do not infer trusted source IP from arbitrary `X-Forwarded-*` headers; strip client-supplied forwarded headers at the trusted proxy and validate the intended `Host`, `Origin` and WebSocket upgrade route. Use standard trusted certificates with normal client certificate validation; do **not** copy the test certificate/key or the test proxy implementation into deployment.

**Operator acceptance checklist (not performed in this repo):**

1. From an authorized external client, verify public `wss://` connects through the **actual chosen** hostname and reverse proxy with a valid CA-trusted certificate, expected Origin and properly provisioned short-lived credential. Test invalid cert, disallowed Origin, missing/expired credential and wrong path; record exact status codes and connection outcome without logging secrets.
2. Expose deployment-owned **liveness** and **readiness** probes according to the real host framework; readiness must fail when its critical upstream dependencies are unavailable, while liveness should not depend on optional external services. Restrict any introspective metrics endpoint. The test fixture's `/health` and `/ready` are **not** bundled with SocketCore.
3. Wire `metrics.increment/gauge/observe` into a trusted exporter and monitor at least upgrade accepted/rejected, active/closed sockets, dropped messages, send failures, buffered bytes, event-loop lag, process RSS/heap/CPU, upstream availability and proxy 4xx/5xx. Define alert thresholds/retention before go-live. The engine has **hooks**, not an exporter, dashboard or alerts; labels must not contain tokens, raw URLs, identities or arbitrary high-cardinality values.
4. Select the application secret manager and documented credential expiry/rotation/revocation path; keep token values out of source, query strings, logs, metrics and public GitHub Actions. A browser-native authentication design is **not** supplied by the sample `x-auth-token` adapter.
5. Verify actual proxy idle/read/write timeouts, websocket ping/pong delivery, max connections, payload limits and trusted forwarding. Agree drain budget across reverse proxy, process supervisor and engine `shutdownDrainMs`; `engine.stop()` is idempotent but consuming application must close the host HTTP/HTTPS server and arrange process restart.
6. Perform an approved maintenance drill: stop accepting upgrades, drain active connections, make readiness fail, restart the supervised process, reconnect authenticated clients, and verify final connection/buffer counters return to baseline. Capture sanitized proxy/app logs and resource usage. Test certificate renewal and proxy restart without disabling TLS validation.
7. Record actual Git SHA, configuration version/digest, redacted commands, test date, DNS/cert/proxy, VPS resources and all results in the private acceptance report. If any ownership or check is unknown, mark **BLOCKED** rather than manufacturing a production-ready claim.

**PU-05 current acceptance classification:** Local HTTPS/WSS/proxy smoke **PASS**; real deployment model D-02, target host/proxy details D-05 and monitoring/restart ownership D-10 **UNDECIDED**. Real WSS, TLS renewal, external health/metrics, secret rotation, recovery and operator sign-off **NOT RUN**. Keep PU-05 **PARTIAL / target acceptance blocked**; release remains NO-GO. Only after those decisions and an explicitly authorized target check should PU-06 capacity/SLO qualification be considered.

## PU-06 Target VPS Load Qualification Gate

The [load testing guide](LOAD_TESTING.md) now includes a pure offline PU-06 profile preflight, a draft owner-decision template and negative validation tests. This preflight **does not** load, connect to, modify or approve any production VPS. A real 4 GiB target WSS/TLS proxy, credential path, representative fanout/payload/churn and numerical CPU/RSS/latency/availability SLO must be explicitly approved before a target trial. The historical Python harness runs against its **own loopback WebSocket server**, not an external WSS URL; there is no production traffic generator configured in this phase. F-11 remains unqualified and release remains NO-GO.

## Release Checklist

Before exposing a deployment to users, the owning application team should verify:

- TLS, certificate renewal, proxy forwarding, idle timeouts, and the intended upgrade path.
- Authentication, authorization, credential rotation, origin behavior, and missing-Origin client policy.
- Finite connection/message/payload/concurrency/buffer limits against a representative workload.
- Slow-client, overload, reconnect, shutdown, restart, and dependency-failure behavior.
- Metrics export, actionable alerts, logs, readiness checks, and resource limits on the target host.
- A repeatable load profile with the real payload size/rate/fanout mix and an explicitly approved SLO.

Items above are deployment responsibilities, not features silently supplied by this package. Mark untested items unknown rather than assuming infrastructure provides them.
