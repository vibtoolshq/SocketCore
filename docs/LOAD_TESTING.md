# SocketCore Local WebSocket Load Study

**A reusable WebSocket core for real-time Node.js applications.** This guide documents the SocketCore Phase 4 test-only harness: Python clients in `test/load/` and the temporary Node server in `load-test/server.js`. The server uses the same `createEngine` factory and built-in status/command handlers. It does not launch `app.js`; app packaging, TLS, proxies, and remote hosts are outside this local profile.

## Prerequisites

- Node.js `>=20` and npm dependencies installed.
- Python 3.12 or compatible and a network connection to install the test-only `websockets` dependency.
- The repository's `test/requirements-load.txt` pins the Python client dependency. Install it into a temporary target, not the repository or production environment.

PowerShell example:

```powershell
$loadPackages = Join-Path $env:TEMP "websocket-load-packages"
New-Item -ItemType Directory -Force $loadPackages | Out-Null
C:\Python312\python.exe -m pip install --target $loadPackages -r test/requirements-load.txt
$env:PYTHONPATH = $loadPackages
C:\Python312\python.exe test/load/clients.py --clients 1000 --ramp-rate 20 --soak-seconds 60
```

The harness creates temporary non-secret client/admin tokens and binds the test server to loopback on an ephemeral port. It does not use or print production credentials. The Python dependency is test-only and must not be installed into the production package.

## Workload and Provisional Targets

Defaults ramp to 1,000 authenticated clients at up to 20 connection attempts per second, then hold for 60 seconds. Each client sends a status echo request every 10 seconds with a 1,024-byte application payload field by default; one admin sends matching broadcasts every 10 seconds. The JSON/WebSocket envelope adds extra bytes beyond the configured field. To run the higher measured point, use:

```powershell
$env:PYTHONPATH = Join-Path $env:TEMP "websocket-load-packages"
C:\Python312\python.exe test/load/clients.py --clients 2000 --ramp-rate 20 --soak-seconds 60 --reconnect-burst-clients 500
```

The 2,000-client run performs two concurrent 500-client reconnect waves after the steady clients close, while the admin sender remains connected. Both waves are included in the pass/fail result.

### Workload Options

| Option                      | Default | Meaning                                                                       |
| --------------------------- | ------: | ----------------------------------------------------------------------------- |
| `--clients`                 |  `1000` | Number of steady-state authenticated clients.                                 |
| `--ramp-rate`               |    `20` | Number of clients scheduled per one-second ramp step.                         |
| `--soak-seconds`            |    `60` | Duration of steady-state traffic after connection attempts finish.            |
| `--request-interval`        |    `10` | Seconds between each client's status requests.                                |
| `--payload-bytes`           |  `1024` | Padding bytes in each status request and admin broadcast application payload. |
| `--broadcast-interval`      |    `10` | Seconds between admin status broadcasts.                                      |
| `--broadcast-grace`         |     `3` | Seconds allowed for in-flight broadcast deliveries after sending stops.       |
| `--reconnect-burst-clients` |   `500` | Simultaneous client connection attempts in each of two reconnect waves.       |
| `--response-timeout`        |    `10` | Maximum seconds to wait for each status response.                             |
| `--connect-timeout`         |   `120` | Maximum seconds to wait for all initial client attempts to finish.            |

`clients`, `ramp-rate`, `soak-seconds`, and `payload-bytes` must be positive integers. Request, broadcast, and response-timeout values must be positive. The load harness does not add load to the production package or modify application configuration.

These are provisional local-study targets, not user-approved production SLOs:

- Every requested client connects and no unexpected client/server errors occur.
- At least 99.9% of request/response messages and broadcast deliveries complete.
- p95 round-trip latency <=250 ms and p99 <=1,000 ms on local loopback.
- Record Node RSS, CPU, active connections, buffer bytes, and event-loop lag. No memory/CPU budget has been approved, so those remain measurements rather than pass/fail gates.

Change CLI options for smaller staged trials. Do not claim production readiness or supported concurrency from this one-host synthetic profile. Record actual Python/Node versions, OS, CPU/RAM, test arguments, and all failed targets with the result.

## Recorded Local Results (2026-10-28)

| Clients |     Responses | Broadcast delivery |          p95 / p99 |   Peak RSS | Reconnect                          |
| ------: | ------------: | -----------------: | -----------------: | ---------: | ---------------------------------- |
|   1,000 |   5,999/5,999 |        5,000/5,000 |  3.567 / 48.384 ms |  75.65 MiB | Not part of first profile          |
|   2,000 | 12,001/12,001 |      10,000/10,000 | 7.584 / 178.432 ms | 108.29 MiB | 500/500 twice; 1.160 s and 1.441 s |

The final 2,000-client profile also measured peak heap 34.24 MiB, peak one-core CPU 61.65%, maximum sampled event-loop lag mean 40.967 ms, and peak buffered bytes 0. It completed with 3,001 accepted/closed connections (clients, admin, and reconnects), no server error logs or request timeouts, and final active/buffered gauges both zero. These 2026-10-28 results predate the configurable 1KiB payload field and used smaller status messages. The 1k and 2k runs used Windows Server 2022, Node `v26.12.0`, Python `3.12.0`, 4 logical CPUs, 7.8 GiB installed RAM, and loopback networking.

These are exploratory results against a synthetic local workload, not production SLOs or a supported concurrency guarantee. Actual application payload sizes/rates, deployment host, network path, TLS/proxy behavior, and resource budgets remain unknown.

## Phase 8 Provisional 100-Client Trial (2026-10-31)

The user-approved exploratory profile used 100 steady clients plus one admin, 1,024-byte payload fields, status requests every 10 seconds, admin broadcasts every 10 seconds, a 20-client/second ramp, a 60-second soak, and two 25-client reconnect waves.

| Result                                          |                          Measurement |
| ----------------------------------------------- | -----------------------------------: |
| Connected clients                               |                            100 / 100 |
| Status requests/responses                       |                     601 / 601 (100%) |
| Broadcast deliveries                            | 500 / 500 (100%) across 5 broadcasts |
| p50 / p95 / p99 / max latency                   |  1.236 / 2.842 / 42.927 / 313.566 ms |
| Peak RSS / heap                                 |                     52.64 / 9.43 MiB |
| Peak sampled one-core CPU                       |                              127.87% |
| Maximum sampled event-loop-lag mean             |                            38.322 ms |
| Reconnect waves                                 |    25 / 25 each; 0.063 s and 0.059 s |
| Client/admin/server errors and request timeouts |                                    0 |
| Final active connections / buffered bytes       |                                0 / 0 |

Environment: local loopback, Windows Server 2022, Node `v26.12.0`, Python `3.12.0`, 4 logical CPUs, 8.39 GB installed RAM. The load server used the default-on 500 messages/second and 64 MiB pending-send caps. The profile passed its provisional delivery/latency targets, but the peak CPU sample demonstrates the system did consume server resources; zero server load is not possible. This host is not the user's 4 GiB VPS, and CPU/OS/TLS-proxy topology and production SLOs are unknown. This result is exploratory evidence only, not production qualification.

## Output

The script prints a JSON report containing environment, workload, initial connection totals, request/broadcast totals, response ratios, p50/p95/p99/max latency, reconnect wave outcomes/durations, client/admin/server-log errors, server counters, peak RSS/heap/CPU/active connections/buffer use/event-loop lag, final post-drain gauges, server exit code, and a provisional pass/fail result. A failed provisional target is a failed exploratory run, not permission to tune unrelated engine behavior.

No distributed metrics backend, test service, Python production dependency, app route, protocol field, or production feature is added by this harness.
