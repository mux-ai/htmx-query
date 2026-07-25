---
type: Application Component
title: Retry Module
description: src/retry.js — schedules htmx.ajax reissues with exponential backoff after responseError, sendError, or timeout.
---

## Responsibility

Tracks attempts and retrying state per element plus verb and final request URL. The original request target is captured before a response can apply HX-Retarget. A scheduled retry bypasses cache serving and deduplication, guaranteeing it receives its configured attempts. reset() clears only the successful request's state.

## Relationships

- Follows: [Support htmx 2 Only](/decisions/support-htmx-2-only.md)
