# Security Policy

## Reporting a Vulnerability

Please do not open public issues for suspected vulnerabilities.

Use GitHub's private vulnerability reporting for this repository when it is available. If that workflow is unavailable, contact the maintainer through the repository owner's GitHub profile and include:

- affected component and version
- reproduction steps or proof of concept
- impact assessment
- any suggested mitigations

## Response Targets

- We aim to acknowledge new reports within 14 days.
- We aim to ship or stage a fix within 60 days for confirmed vulnerabilities, or communicate why more time is required.

## Scope

In scope:

- the Rust policy engine in `core/`
- the browser extension in `extension/`
- CI, release, and dependency-management automation in `.github/`

Out of scope:

- local browser profiles or extensions not maintained in this repository
- third-party services and dependencies outside our release control

## Handling Guidance

- Never commit secrets, tokens, or sample credentials.
- Keep proof-of-concept data to the minimum needed to reproduce the issue.
- Coordinate disclosure timing with maintainers before any public write-up.
