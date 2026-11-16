# SocketCore — npmjs Release Preparation (No Publication)

**Package:** `configurable-websocket-engine@1.0.0` (existing package name/version retained, not silently renamed to an unverified npm scope). **License:** MIT. **Repository:** [vibtoolshq/SocketCore](https://github.com/vibtoolshq/SocketCore). **Status:** publishing is **NOT** authorized by this preparation; there is no npm release or release tag.

## What is ready locally

- `package.json`: CommonJS `main`/`exports` root `createEngine`, Node `>=20`, locked dependency `ws` (lockfile currently resolves `ws@8.22.0`), MIT, version `1.0.0`, repository/homepage/bugs/keywords and explicit `files` whitelist.
- `npm run verify:package` runs a read-only `npm pack --dry-run --json --ignore-scripts` and validates **exactly 11** approved files: README, LICENSE, package metadata, all five `engine/*.js` runtime modules and `docs/CONFIGURATION.md`, `docs/ENGINE_API.md`, `docs/WEBSOCKET_PROTOCOL.md`.
- Development/CI-only materials (`notes/`, `test/`, `scripts/`, `load-test/`, `project/`, `.github/`, `.vscode/`, `AGENTS.md`, `AI_INSTRUCTIONS.md`, raw npm credentials) are **excluded from the npm tarball**. Repository is still open source; the package is simply smaller.
- GitHub Actions `npm package readiness / no publish` validates the whitelist, creates a tarball, performs a clean consumer install and imports `createEngine`; a passing run uploads an **npm tarball as a GitHub Actions artifact with 7-day retention**. This artifact is **not** published to npmjs and does not create a GitHub Release. No `npm publish` step exists.

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

## Future release (separate explicit authorization required)

1. Verify real GitHub CI run for the exact chosen candidate SHA: all Node matrix tests, Python loopback, tarball consumer install, dependency high+ audit and required gate green.
2. Confirm npmjs account ownership/permissions and MFA or a verified npm trusted publisher (OIDC) workflow. Prefer the verified official npm trusted-publishing model with a protected environment and **no long-lived npm token in GitHub secrets**. Never paste tokens into logs, tracked files or this document.
3. Decide final package name, version, required supported Node range and whether the package should be unscoped or scoped. Review MIT/third-party notices and any registry namespace collisions.
4. Obtain approved release-candidate commit, release notes and changelog; verify the exact tarball contents and make an install/import check in a clean environment. Publication is not reversible simply by deleting a Git tag; use a correct versioning/deprecation/recovery plan.
5. Obtain separate explicit permission to create a tag/GitHub Release or `npm publish` (these are distinct actions). If real public WSS/VPS production deployment is part of the distribution acceptance policy, its 4 GiB workload/SLO, operator monitoring and rollback drill must also be approved and measured.

**Do not assume the GitHub Actions loopback load is the target 4 GiB VPS qualification.** The formal [production release gate](../project/RELEASE_READINESS_AUDIT.md) remains **NO-GO** until the missing external evidence has actually been collected.
