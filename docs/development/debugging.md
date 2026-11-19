# Debugging and Observability

## Upgrade failures

- HTTP **401**: authentication callback returned no valid non-array identity object. Verify the host-supplied callback and credential transport.
- HTTP **403**: supplied Origin denied. An absent Origin is not denied by this engine.
- HTTP **500**: unexpected origin/auth/upgrade callback or handling error.
- HTTP **503**: stopped engine, pending upgrade/connection capacity or timeout. Non-cooperative callback promises keep pending slots until settled.

See [factory callback contracts](../api/create-engine.md).

## Message errors and close codes

Malformed JSON gives `BAD_JSON`; missing string `type` gives `BAD_MESSAGE`; missing handler gives `UNKNOWN_TYPE`; handler throws become `HANDLER_FAILED` with a generic response. Per-client/global rate limits can close 1008; payload limits 1009; concurrency or slow output can close 1013; graceful shutdown 1001. See [protocol](../WEBSOCKET_PROTOCOL.md).

## Instrumentation

The `createEngine({logger, metrics})` hooks are application-provided. A compatible logger can implement `warn(message, safeDetails)` and `error(message, safeDetails)`; the built-in safe logger only forwards `name`/`code` from error objects, not stacks, headers or secrets. Metrics hooks `increment(name, value?, attrs?)`, `gauge(name, value, attrs?)`, `observe(name, value, attrs?)` are isolated from throwing callbacks. Names include `ws.connections.active`, `ws.connections.closed`, `ws.upgrades.accepted`, `ws.upgrades.rejected`, `ws.messages.in`, `ws.messages.out`, `ws.messages.dropped`, `ws.send.failures`, `ws.messages.handler_failures`, `ws.messages.dispatch_failures`, `ws.buffered_bytes.total`, `ws.event_loop_lag_ms`. No exporter/HTTP metrics route is included.

For a reproducible failure, record Node version, package version, a sanitized configuration, log code/name, close status and the smallest non-secret message. Avoid attaching real tokens, API keys or private keys to issues. Use [SECURITY.md](../../SECURITY.md) for sensitive reports.
