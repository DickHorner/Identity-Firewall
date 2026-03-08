# AGENTS.md

## Mission

Agents working in this repository should prioritize correctness, reversibility, and security-by-default in line with `.motherlode/MOTHERLODE.md`.

## Working Rules

- Prefer small, reviewable changes over broad rewrites.
- Run the root verification commands before concluding work: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and the Motherlode audit.
- Update docs when behavior, workflows, or operational expectations change.
- Add or extend tests for Rust policy logic and extension-side utilities.
- Treat browser-facing strings and DOM updates as untrusted input unless proven otherwise.

## Forbidden Moves

- Do not commit secrets, credentials, or telemetry defaults.
- Do not weaken validation or remove tests just to make checks pass.
- Do not overwrite user-authored changes that are unrelated to the current task.
