# Agent Instructions

## Personal Development Notes

- Keep `notes/` local and private. It is for development-time notes, planning, reports, and Markdown only; do not put public-facing documents, public information, or content intended for publication there.
- Before starting any project update, fix, or addition, write the relevant plan/report in `notes/` first. Do not begin implementation until that note is recorded.
- Track each update or fix with clear steps or phases in the notes, including its current status.
- After implementation, record what changed and when it was implemented in the notes. Use the actual implementation date and update the phase status.
- Keep notes focused on development work and never treat them as project documentation intended for public distribution.

## Tracked Project Records and User Documentation

- Keep `project/` and `docs/` as tracked project directories. Do not add them to `.gitignore`; only personal `notes/` are excluded.
- Each of these directories must have a `README.md` describing its purpose and how/when to use it, and a `MINIFEST.md` listing every direct child file and subdirectory with its phase/status and a factual summary. Update the manifest whenever that inventory changes.
- Before changing code, first record the plan in `notes/`. As part of the same task, update `project/` with the affected feature/component details and a dated, phase-based implementation record describing what changed.
- Update the relevant `docs/` guide in the same task whenever setup, configuration, protocol, behavior, commands, limitations, or other user-visible usage details change.
- Maintain detailed Markdown for every implemented feature or page: purpose, where it is implemented, when it applies, how it behaves and is used, access rules, inputs/outputs, limits, errors, and verification where relevant. Do not document pages or behavior that do not exist.
- Base project and user documentation on the current source, tests, and package metadata. Verify details before writing; do not guess. When a fact cannot be established from the repository, label it as unknown or omit it rather than presenting it as true.
- Keep `project/` engineering records suitable for tracking and `docs/` accurate for users. Do not copy private notes or secrets from `notes/` into tracked documentation.
