---
type: Application Component
title: Retry Module
description: src/retry.js — schedules htmx.ajax reissues with exponential backoff after normalized HTTP, network, or timeout failures.
---

## Responsibility

Tracks attempts and retrying state per element plus verb and final request URL. The original request target is captured before a response can apply HX-Retarget. A scheduled retry bypasses cache serving and deduplication, guaranteeing it receives its configured attempts. reset() clears only the successful request's state and cancels that request's still-pending retry timer, which is tracked per element and key so a success never leaves a moot reissue scheduled.

## Relationships

- Follows: [Support htmx 2 And 4](/decisions/support-htmx-2-and-4.md)
