# SocketCore — npmjs Release Preparation and Publication Controls

**Package:** `configurable-websocket-engine@1.0.0` (existing package name/version retained, not silently renamed to an unverified npm scope). **License:** MIT. **Repository:** [vibtoolshq/SocketCore](https://github.com/vibtoolshq/SocketCore). **GH-01 baseline:** no publication was authorized. **NPM-01 update (2026-11-17):** owner has now explicitly authorized a **one-time GitHub Actions publication of version 1.0.0**, using the existing organization-scoped `NPM_TOKEN` secret. Publication must be verified separately from the registry; merely authoring the workflow or pushing a tag does not prove success.

## What is ready locally

- `package.json`: CommonJS `main`/`exports` root `createEngine`, Node `>=20`, locked dependency `ws` (lockfile currently resolves `ws@8.22.0`), MIT, version `1.0.0`, repository/homepage/bugs/keywords and explicit `files` whitelist.
- `npm run verify:package` runs a read-only `npm pack --dry-run --json --ignore-scripts` and validates **exactly 11** approved files: README, LICENSE, package metadata, all five `engine/*.js` runtime modules and `docs/CONFIGURATION.md`, `docs/ENGINE_API.md`, `docs/WEBSOCKET_PROTOCOL.md`.
- Development/CI-only materials (`notes/`, `test/`, `scripts/`, `load-test/`, `project/`, `.github/`, `.vscode/`, `AGENTS.md`, `AI_INSTRUCTIONS.md`, raw npm credentials) are **excluded from the npm tarball**. Repository is still open source; the package is simply smaller.
- GitHub Actions `npm package readiness / no publish` validates the whitelist, creates a tarball, performs a clean consumer install and imports `createEngine`; a passing run uploads an **npm tarball as a GitHub Actions artifact with 7-day retention**. This artifact is **not** published to npmjs and does not create a GitHub Release. No `npm publish` step exists.

## NPM-01 one-time tagged publishing workflow (authorized 2026-11-17)

The new [`.github/workflows/publish-npm.yml`](../.github/workflows/publish-npm.yml) **only** triggers on a pushed release tag named `npm-v1.0.0`, never on an ordinary `main` push, pull request or other version tag. It requires the tag SHA to exactly match current `main`, a **successful complete `SocketCore CI` GitHub Actions push run for that exact SHA**, a fresh `npm ci`, full `npm test`, package whitelist verification, high+ dependency security audit and evidence the version is not already registered. The publishing job runs on GitHub-hosted Ubuntu/Node 26 and uses the organization's `NPM_TOKEN` **only in the final publish step**: `npm publish --access public --provenance --ignore-scripts`. Its job permissions are read-only contents plus the narrowly required OIDC `id-token: write` for provenance; no runtime engines/protocols or VPS deployment are changed.

This is **one-time authorized direct token publishing** and is deliberately not suitable as an automatically repeating release pipeline. Access to the `NPM_TOKEN` organization secret must include the public GitHub repository. A publish attempt can still fail because of npm namespace ownership, token scope, token revocation, 2FA policy, or registry availability; such failures must be reported and cannot be called success. npmjs official guidance says direct Bypass-2FA-token publishing is being removed in January 2027; future releases should move to **Trusted Publishing (OIDC)** with reviewed package ownership, ideally scoped permissions, and token rotation. The separate user-uploaded **PyPI** token is unrelated and must never be used to publish npm.

After the workflow runs, verify **actual** npmjs registry `configurable-websocket-engine@1.0.0` and public package page, plus GitHub Actions job conclusion and provenance. No GitHub Release, production VPS WSS/proxy, capacity test or production deployment is part of the npmjs publication workflow.

## Registry and identity checks (observed 2026-11-17)

- Registry: `https://registry.npmjs.org/`.
- `npm view configurable-websocket-engine name version dist-tags --json` returned **E404** (name not found/not accessible at that time). This **does not reserve or guarantee ownership** or prove future availability.
- `npm whoami` returned **ENEEDAUTH** in the connected Windows environment. No npm login, OTP, access token, trusted-publisher registration or npmjs account ownership was established. **Publishing is BLOCKED** until these are addressed.
- The repository's GitHub organization and npmjs package namespace are **not automatically the same account**. Before attempting the first public release, the owner must verify who controls the chosen npm package name and whether a public unscoped package under that name is desired. For a scoped `@org/name` package, first verify actual npm org ownership and choose the name explicitly.

## Local read-only checks

```sh
npm ci --no-audit --no-fund
npm test
npm run verify:package
npm audit --omit=dev --audit-level=high
```

These commands **do not publish** anything. The reported npm release version is only a candidate until an actual approved `npm publish` occurs. Test runtime from the generated npm package via the GitHub Actions consumer-install smoke. A registry package page will not exist until publication.

## Future releases after approved 1.0.0 (separate explicit authorization required)

1. Verify real GitHub CI run for the exact chosen candidate SHA: all Node matrix tests, Python loopback, tarball consumer install, dependency high+ audit and required gate green.
2. Confirm npmjs account ownership/permissions and MFA or a verified npm trusted publisher (OIDC) workflow. Prefer the verified official npm trusted-publishing model with a protected environment and **no long-lived npm token in GitHub secrets**. Never paste tokens into logs, tracked files or this document.
3. Decide final package name, version, required supported Node range and whether the package should be unscoped or scoped. Review MIT/third-party notices and any registry namespace collisions.
4. Obtain approved release-candidate commit, release notes and changelog; verify the exact tarball contents and make an install/import check in a clean environment. Publication is not reversible simply by deleting a Git tag; use a correct versioning/deprecation/recovery plan.
5. Obtain separate explicit permission to create a tag/GitHub Release or `npm publish` (these are distinct actions). If real public WSS/VPS production deployment is part of the distribution acceptance policy, its 4 GiB workload/SLO, operator monitoring and rollback drill must also be approved and measured.

**Do not assume the GitHub Actions loopback load is the target 4 GiB VPS qualification.** The formal [production release gate](../project/RELEASE_READINESS_AUDIT.md) remains **NO-GO** until the missing external evidence has actually been collected.
