# SocketCore — GitHub Actions CI and Evidence

**Implementation:** PU-03 workflow, expanded in GH-01 (2026-11-17). Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). This CI is **read-only**: no deployment, token permissions beyond `contents: read`, npm publish, GitHub Release or tag creation. A green runner is not a real 4 GiB production VPS acceptance.

## NPM-01 publishing workflow (separate authorization)

The owner subsequently authorized a **one-time public npmjs publication**, using the existing GitHub organization secret `NPM_TOKEN`. The independent [publish workflow](../.github/workflows/publish-npm.yml) triggers **only** when the exact tag `npm-v1.0.0` is pushed. It does not publish on a normal `main` push or PR. It first verifies a green complete `SocketCore CI` run on the tagged commit, re-runs Node regression tests, package whitelist and high+ dependency audit, and only then uses `NODE_AUTH_TOKEN` in a tightly scoped publish step with npm provenance. GitHub Actions `id-token:write` is restricted to the publisher job. **This is not an automatic production deployment or a substitute for real WSS/4 GiB VPS acceptance.** See [npmjs release preparation](NPM_RELEASE_PREP.md) for ownership, authentication and forward-looking OIDC migration.

## Actual GH-01 / NPM-01 run evidence — 2026-11-17

- [GH-01 release-definition commit full CI](https://github.com/vibtoolshq/SocketCore/actions/runs/43951316943) for `4f2fd08ab62bf11d42683f6c0ca9ade0c41575c6`: Node 20/22/24/26 matrix (34 each), Python 100-client local loopback, npm tarball clean install, high+ dependency audit and final required CI gate **all SUCCESS**.
- [NPM-01 tagged npm publishing run](https://github.com/vibtoolshq/SocketCore/actions/runs/43951626306) on tag `npm-v1.0.0` pointing to the same commit: preflight and `Publish npmjs package with provenance` jobs **SUCCESS**. The npm CLI printed `+ configurable-websocket-engine@1.0.0` and signed provenance. npm indicated asynchronous initial processing; first public registry check returned 404, so independent registry read remains pending at that checkpoint. **Do not re-publish to resolve processing delays.**
- Neither successful CI nor npm library publication establishes **production** WSS/4 GiB VPS capacity or tested deployment rollback.

## Triggers and jobs

The workflow runs for a push to `main`, pull requests targeting `main`, and manually through **Actions → SocketCore CI → Run workflow**.

| Job | Checks | Environment |
|---|---|---|
| Node 20/22/24/26 / Linux | `npm ci --no-audit --no-fund`, first-party `node --check`, `npm test` (currently 34 Node tests including security, loopback WSS/TLS and offline preflight) | GitHub-hosted Ubuntu, each Node major |
| Safe Python loopback load | Pinned `websockets==15.0.1`; 100-client/1 KiB, 50/sec ramp, 15s soak, 3s request+broadcast intervals, 25-client reconnect waves | GitHub-hosted Ubuntu, Node 24 + Python 3.12; loopback only |
| npm package readiness / no publish | `npm run verify:package` exactly whitelists runtime+MIT/README/API docs; creates local tarball, installs as a clean consumer, checks `createEngine` import; uploads that tarball as a short-lived **GitHub Actions artifact only (not an npmjs release)** | GitHub-hosted Ubuntu, Node 26 |
| Dependency security / high+ | Clean `npm ci` and `npm audit --omit=dev --audit-level=high` (fail for high/critical or audit error) | GitHub-hosted Ubuntu, Node 26 |
| Required CI gate | Fail closed unless matrix, Python load, npm packaging and production dependency audit **all** succeeded; record outcomes in GitHub Actions job summary | GitHub-hosted Ubuntu |

There is **no external WSS/VPS test** in these jobs. The Python script launches its own `ws://127.0.0.1` test server; its provisional local acceptance cannot certify a production client count. Only a separate owner-approved staging VPS and numerical SLO can provide that evidence.

## Supply-chain security and reliability

- Pinned official actions: `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1` (v7.0.1), `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1` (v7.1.0), `actions/setup-python@a309ff8b426b58ec0e2a45f0f869d46889d02405` (v6.2.0) and `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02` (v4.6.2). New action SHAs were checked against official Git tags.
- `permissions: contents: read`; checkout credentials not persisted; no npm tokens, environment secrets, `pull_request_target`, npm publish or production network load.
- Matrix `fail-fast: false`; timeouts 15 min matrix, 10 min load/packaging/audit, 5 min status gate; same-ref superseded runs cancel. All jobs required by `ci-gate`.
- Node 20 is **end of life** but remains a compatibility check because `package.json` currently says `>=20`. Prefer a maintained LTS in a hosted consuming application; narrowing the package's support floor needs a separate compatibility decision.
- The WSS fixture uses OpenSSL CLI on the runner to generate short-lived local certificates; it does **not** commit private keys or disable TLS trust verification.

## How to verify an actual GitHub run

1. After an authorized push, inspect GitHub [Actions → SocketCore CI](https://github.com/vibtoolshq/SocketCore/actions/workflows/ci.yml). Select the run whose commit SHA exactly matches the new `main` commit.
2. Confirm each Node matrix row, Python loopback load, npm package-readiness consumer install and dependency audit concluded **success**; confirm the `Required CI gate` succeeded. Save the **real run URL/SHA, conclusions and logs** in dated internal phase records.
3. CI fails if a required job is failed, skipped or cancelled; don't treat a static workflow file or local Windows test as GitHub acceptance. Repository branch protections/required checks need owner decision. Do not automatically tag or publish.
4. Use [NPM release preparation](NPM_RELEASE_PREP.md) to review the exact tarball and future authenticated publication controls. This workflow does **not** create an npm package release.

Local commands from the repository root:

```sh
npm ci --no-audit --no-fund
npm test
npm run verify:package
npm audit --omit=dev --audit-level=high
```

The npm verification script runs `npm pack --dry-run --json --ignore-scripts` and checks an exact list of **11** intended distribution files. It never publishes. Node's current local tests and the Python runner profile are different kinds of evidence; a 34/34 local Node result does not automatically establish GitHub-runner success.

**Release boundary:** Browser credential lifecycle, real public TLS/proxy, 4 GiB VPS target latency/CPU/RSS/SLO, monitoring, rollback, and npm registry account/ownership still need separate acceptance. Formal [production gate audit](../project/RELEASE_READINESS_AUDIT.md) remains **NO-GO** until all production and release gates are met.

**GH-01 publication status:** Local workflow and package preparation verified before Git push; actual job results must be recorded from GitHub after pushing. No publish credentials are injected by this CI.
