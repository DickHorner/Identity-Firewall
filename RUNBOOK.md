# Runbook

## Local Verification

From the repository root:

```bash
npm install --package-lock-only
npm install --prefix extension
npm run verify
pwsh -NoLogo -File ./.motherlode/scripts/audit.ps1
```

## Browser Extension Smoke Test

1. Run `npm --prefix extension run build`.
2. Load `extension/` as an unpacked extension in a Chromium-based browser.
3. Visit a test host such as `https://www.google.com`.
4. Confirm the popup shows the active hostname and matched persona.
5. Confirm the page console logs the applied persona.

## Failure Recovery

- If Rust checks fail because the toolchain is missing, install Rust with `rustup` and rerun `npm run verify`.
- If extension dependencies drift, rerun `npm install --prefix extension` to refresh `extension/package-lock.json`.
- If the Motherlode audit regresses, inspect `.motherlode/outputs/` for the latest report and repair the highest-weight failures first.
