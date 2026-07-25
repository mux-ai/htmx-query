---
type: Architecture Decision
title: Verify In Real Browsers
description: JSDOM verifies fast unit and integration behavior; Playwright verifies browser-only htmx, CSP, drag, and Clipboard behavior.
---

## Decision

Browser tests start and own an isolated local demo server in Chromium, Firefox, and WebKit for every supported htmx 2.x CI matrix version. They cover only workflows whose semantics depend on a real browser, including conditional ETag revalidation and the empty-304 swap edge case, so the default test suite remains fast and deterministic.

## Relationships

- Applies to: [Publish Human And Agent Documentation](/decisions/publish-human-and-agent-documentation.md)
