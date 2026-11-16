# Contributing to SocketCore

SocketCore is a configurable Node.js WebSocket engine for real-time applications. Contributions should preserve its small transport-core boundary and be supported by tests and accurate documentation.

**A reusable WebSocket core for real-time Node.js applications.**

## Before Opening a Pull Request

1. Check existing issues and pull requests for related work.
2. For a substantial feature or behavior change, describe the use case and compatibility impact before implementation.
3. Keep changes focused. Do not add a dependency, protocol change, or deployment assumption without explaining why the existing API is insufficient.
4. Do not include secrets, generated files, local environment files, or private development notes.

## Development Setup

Requirements: Node.js `>=20` and npm.

```sh
npm ci
npm test
```

Use `npm install` only for an intentionally approved dependency change; keep the committed lockfile consistent.

The test command runs the Node.js built-in test runner. The optional Python load harness has separate test-only setup instructions in [docs/LOAD_TESTING.md](docs/LOAD_TESTING.md); do not install its Python dependency as a production package dependency.

## Pull Request Expectations

- Explain the problem, intended behavior, and relevant tradeoffs.
- Add or update focused tests for behavior changes.
- Update the relevant guides in `docs/` and engineering overview/log in `project/` when behavior or architecture changes.
- Report commands run and their results; identify checks not run.
- Preserve existing message contracts unless a protocol migration is explicitly agreed.
- Do not claim production capacity from `maxConnections` or the repository's synthetic local load profile.

## License and Contribution Terms

SocketCore is distributed under the [MIT License](LICENSE), which permits use, modification, redistribution and commercial use subject to its notice requirement. External dependencies have their own licenses. No separate contributor license agreement is published; contributions should be made only where the contributor has the right to submit them. For automated pull-request checks, see [CI Testing](docs/CI_TESTING.md).

For project questions, see [SUPPORT.md](SUPPORT.md). For sensitive security reports, follow [SECURITY.md](SECURITY.md).
