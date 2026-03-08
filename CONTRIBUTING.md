# Contributing

## Workflow

1. Create a focused branch for each change.
2. Keep commits small and reversible.
3. Update docs and tests when behavior or public contracts change.

## Required Local Checks

Run these from the repository root before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
pwsh -NoLogo -File ./.motherlode/scripts/audit.ps1
```

## Pull Request Expectations

- Explain the user-facing or operational impact.
- Call out security-sensitive changes explicitly.
- Link any threat model, architecture, or runbook updates.
- Include rollback notes for risky refactors.

## Testing Notes

- Rust changes should include unit or integration coverage in `core/`.
- Extension changes should include TypeScript tests in `extension/src/*.test.ts`.
- Manual browser validation is still required for content-script and popup UX changes.
