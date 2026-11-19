# SocketCore Documentation Directory MINIFEST (Legacy)

**Current authoritative documentation inventory:** [MANIFEST.md](MANIFEST.md). This older, misspelled file is preserved for existing links. The repository now has subdirectories `getting-started/`, `guides/`, `api/`, `architecture/`, `reference/`, `development/`, and `help/`. Refer to the current manifest instead of this historical flat inventory.

Inventory of direct children in `docs/`. Update this file when a child is added, removed, or renamed.

| Name                       | Phase / status   | Purpose                                                                                             |
| -------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| `README.md`                | Active           | Guide index and accuracy policy.                                                                    |
| `MINIFEST.md`              | Active           | Lists direct directory contents and their status.                                                   |
| `USER_GUIDE.md`            | Current snapshot | Prerequisites, installation, startup, connection, and basic usage.                                  |
| `CONFIGURATION.md`         | Current snapshot | Environment variables, defaults, validation, and configuration behavior.                            |
| `WEBSOCKET_PROTOCOL.md`    | Current snapshot | Handshake behavior, message contract, built-in features, extension context, limits, and errors.     |
| `ENGINE_API.md`            | Current snapshot | Library factory options, lifecycle, connection manager, and message router APIs.                    |
| `PRODUCTION_DEPLOYMENT.md` | Current guide    | TLS/proxy/security responsibilities, workload sizing, operations, and deployment release checklist. |
| `LOAD_TESTING.md`          | Phase 4 complete | Python load-harness setup, measured local profiles, and qualification limitations.                  |
| `CI_TESTING.md`               | GH-01 CI extension; GitHub run must be verified | Node test matrix, Python loopback load, npm tarball consumer smoke, security and fail-closed CI gate. |
| `NPM_RELEASE_PREP.md`         | GH-01 preparation, NOT published | npm package name, file whitelist, tarball check, login/ownership blockers and separate publish authorization. |

**Historical statement superseded:** the current `docs/` directory includes the seven developer-documentation subdirectories listed above, plus the new `index.md`, `MANIFEST.md`, and `COVERAGE_AUDIT.md`. The table above is an earlier snapshot, **not** a current exhaustive inventory.
