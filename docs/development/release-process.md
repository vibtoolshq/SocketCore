---
title: "Release Process"
description: "Verified npmjs 1.0.0 workflow and guarded future release requirements."
order: 4
draft: false
---

# Release and Publishing (Observed 1.0.0)

`configurable-websocket-engine@1.0.0` is already publicly published under the MIT License.

## Actual 1.0.0 workflow

1. [CI](../CI_TESTING.md) runs on PRs and `main` pushes with Node 20/22/24/26, test-only 100-client Python loopback, package consumer install, high+ audit and fail-closed required gate. Release candidate [run 43951316943](https://github.com/vibtoolshq/SocketCore/actions/runs/43951316943) succeeded.
2. The repository contains `.github/workflows/publish-npm.yml`, **hardcoded to the one-time tag `npm-v1.0.0`** (not a reusable any-version publisher). It checks that the tagged commit matches current main and had successful full CI, rechecks npm tests and package/audit and refuses an already-published version.
3. The publisher uses the configured `NPM_TOKEN` GitHub secret only in the final `npm publish --access public --provenance --ignore-scripts` step, with short-lived GitHub OIDC permission for provenance. [Publish run 43951626306](https://github.com/vibtoolshq/SocketCore/actions/runs/43951626306) succeeded; the public tarball became installable after npm's release scanning.
4. Fresh-cache npm consumer installation of `1.0.0` and `createEngine` import passed in the previously recorded release audit. Signed provenance is attached to that release.

## Future versions: not automatic

**Do not push `npm-v1.0.0` again** or try to overwrite an immutable published version. For a future patch/minor/major release, decide SemVer scope, update metadata/lockfile and tests, obtain owner approval, establish npm Trusted Publishing (OIDC) or safe equivalent, create a reviewed per-version workflow and verify exact candidate CI and tarball. The repository currently does **not** contain a generic automatic npm version release pipeline. Do not assume a GitHub Release has been created (npm publication is separate).

The previous broadly scoped bypass-2FA token is a security/maintenance risk; restrict repository access and move future publishing to npm Trusted Publishing. Never print CI secrets.

**Production vs package:** Publishing a Node library does not certify real WSS/proxy, metrics/exporter/rollback or 4 GiB VPS performance. See [production gates](../PRODUCTION_DEPLOYMENT.md) and [evidence audit](https://github.com/vibtoolshq/SocketCore/blob/main/project/RELEASE_READINESS_AUDIT.md).
