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
npm install
npm test
```

The test command runs the Node.js built-in test runner. The optional Python load harness has separate test-only setup instructions in [docs/LOAD_TESTING.md](docs/LOAD_TESTING.md); do not install its Python dependency as a production package dependency.

## Pull Request Expectations

- Explain the problem, intended behavior, and relevant tradeoffs.
- Add or update focused tests for behavior changes.
- Update the relevant guides in `docs/` and engineering overview/log in `project/` when behavior or architecture changes.
- Report commands run and their results; identify checks not run.
- Preserve existing message contracts unless a protocol migration is explicitly agreed.
- Do not claim production capacity from `maxConnections` or the repository's synthetic local load profile.

## License and Contribution Terms

This repository currently has no `LICENSE` file and no published contribution agreement. Do not assume the code is open source or that a contribution grants rights to use or redistribute it. Ask the repository owner to publish the intended license and contribution terms before relying on them.

For project questions, see [SUPPORT.md](SUPPORT.md). For sensitive security reports, follow [SECURITY.md](SECURITY.md).
