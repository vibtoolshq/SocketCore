# Developer Documentation Manifest

**Primary index:** [index.md](index.md). **Audit:** [COVERAGE_AUDIT.md](COVERAGE_AUDIT.md). All paths in this manifest are repository documentation; **only** `ENGINE_API.md`, `CONFIGURATION.md`, `WEBSOCKET_PROTOCOL.md` are shipped with npm 1.0.0.

## Getting started

- [Getting started index](getting-started/index.md)
- [Installation and requirements](getting-started/installation.md)
- [Runnable quickstart](getting-started/quickstart.md)

## Developer guides

- [Guides index](guides/index.md)
- [Basic usage](guides/basic-usage.md)
- [Advanced usage](guides/advanced-usage.md)
- [Application integration](guides/integration.md)

## Public API

- [API index and export policy](api/index.md)
- [`createEngine` and lifecycle](api/create-engine.md)
- [Connections and groups](api/connections.md)
- [Message router, context and errors](api/messages.md)

## Architecture

- [Architecture index](architecture/index.md)
- [Module boundaries](architecture/overview.md)
- [Execution/data flow](architecture/execution-flow.md)

## Reference

- [Reference index](reference/index.md)
- [Library configuration defaults](reference/configuration.md)
- [Runtime, dependencies and compatibility](reference/compatibility.md)

## Development

- [Development index](development/index.md)
- [Testing and CI](development/testing.md)
- [Debugging and metrics](development/debugging.md)
- [Contributing](development/contributing.md)
- [Release and publishing](development/release-process.md)

## Help

- [Help index](help/index.md)
- [Troubleshooting and FAQ](help/troubleshooting.md)

## Original tracked technical references

- [Engine API](ENGINE_API.md)
- [Configuration / standalone environment](CONFIGURATION.md)
- [WebSocket protocol and sample handlers](WEBSOCKET_PROTOCOL.md)
- [Existing user/standalone guide](USER_GUIDE.md)
- [Production deployment](PRODUCTION_DEPLOYMENT.md)
- [Load testing](LOAD_TESTING.md)
- [GitHub CI](CI_TESTING.md)
- [npm publication](NPM_RELEASE_PREP.md)

## Quality and coverage

- [Forensic coverage and validation report](COVERAGE_AUDIT.md)
- [Documentation homepage](index.md)

**Status:** Documentation-only update; no runtime or package changes. For the live npm package, prefer API docs shipped at version `1.0.0`; these additional pages reflect the audited GitHub repository snapshot.

## Vib Docs Engine synchronization

This developer-only documentation tree is configured in `.vibtools/docs.config.json` with `docsType: developer` and `docsPath: docs`. This governance manifest is automatically omitted from the public portal; it remains in GitHub for repository navigation.
