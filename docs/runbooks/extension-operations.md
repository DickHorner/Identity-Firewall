# Extension Operations Runbook

## Purpose

This runbook covers the browser extension's common operational workflows.

## Build and Load

1. Run `npm --prefix extension install`.
2. Run `npm --prefix extension run build`.
3. Load the `extension/` directory as an unpacked extension in the browser.

## Config Reset

1. Open the browser's extension storage inspector.
2. Remove the `policyConfig` entry from `chrome.storage.local`.
3. Reload the extension to trigger default-config bootstrapping.

## Incident Triage

- If persona resolution is wrong, inspect the active host and rule ordering first.
- If spoofing is missing, confirm the content script ran at page load and injected the tagged script element.
- If the popup fails, inspect `chrome.runtime.lastError` in the extension console.
