# Tests and CI

## Node regression and security

At repository root:

```sh
npm ci --no-audit --no-fund
npm test
npm run verify:package
npm audit --omit=dev --audit-level=high
```

`npm test` invokes Node's built-in `node --test`, discovering `test/engine.test.js`, `test/phase1.test.js`, `phase2.test.js`, `phase3.test.js`, `phase5.test.js`, `phase7.test.js`, `test/pu04-security.test.js`, `test/pu05-wss-proxy.test.js`, and `test/load/pu06-preflight.test.js`. These exercise package composition, callbacks, Origin/auth, groups, limits, errors, temporary TLS/WSS loopback integration, and offline qualification fields.

PU-05 test generates a **temporary self-signed certificate** with an OpenSSL CLI; test hosts bind only `127.0.0.1` and delete certificate material. The PU-06 test is **offline-only**: it validates `test/load/pu06-target-template.json` and cannot benchmark a VPS.

The [GitHub CI workflow](../CI_TESTING.md) checks Node 20/22/24/26, local 100-client Python loopback smoke, npm tarball and consumer import, high+ advisories and the required status gate. Release candidate run [43951316943](https://github.com/vibtoolshq/SocketCore/actions/runs/43951316943) passed all 8 jobs. This does not establish production WSS/4 GiB capacity.

## Optional Python synthetic load study

`test/load/clients.py` is a repository-only Python test driver. It launches **`load-test/server.js` on loopback**, requires the Python test-only `websockets` package from `test/requirements-load.txt`, and measures a synthetic client/traffic profile. It is **not** a remote public WSS driver. See [load testing reference](../LOAD_TESTING.md) for actual arguments and warnings.

For the offline target readiness gate:

```sh
node load-test/pu06-preflight.js --check test/load/pu06-target-template.json
```

The intentionally unapproved template returns `BLOCKED`, process exit code **2**. That is expected and **not a failing Node regression**. It never loads a VPS.

## Evidence discipline

CI green means checked code/tests/package and synthetic fixtures passed on that runner. Never call these observations a guarantee of connection capacity, 4 GiB VPS performance, browser token compatibility, live proxy TLS or operational recovery.
