# Contribution Workflow

The repository's actual [CONTRIBUTING.md](../../CONTRIBUTING.md) is the contribution policy. Its verified expectations are focused PRs, issue discussion for substantial changes, tests for behavior changes, updated docs, and **no secrets/private notes**. There is no declared CLA or generated TypeScript type contract.

Local setup:

```sh
git clone https://github.com/vibtoolshq/SocketCore.git
cd SocketCore
npm ci
npm test
npm run verify:package
```

A pull request to `main` runs GitHub Actions CI. Avoid breaking the exact JSON message envelope or making a private module path a supported export without explicit API review. Do not change dependencies without lockfile updates. The public npm package contains **only** files approved by `package.json.files` plus npm always-included files, and is verified by `scripts/verify-npm-package.js`.

The repo contains `project/` engineering history, `docs/` developer references, `handlers/` demo handlers and `test/` regression fixtures. Private `notes/` are intentionally ignored. For bug reports see [SUPPORT.md](../../SUPPORT.md); for vulnerabilities see [SECURITY.md](../../SECURITY.md).
