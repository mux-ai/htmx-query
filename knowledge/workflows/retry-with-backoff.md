---
type: Workflow
title: Retry With Backoff
description: Failed eligible request schedules a delayed htmx.ajax reissue; success resets counters, exhaustion fires hq:retryExhausted.
---

## Steps

1. Error event → Safe Retry Verbs check → attempt counter increments for that verb and final URL. 2. setTimeout(base * 2^(n-1), cap 10x) → element still in document → htmx.ajax with the original source and target. 3. The retrying flag suppresses cache serving and deduplication for the reissue.

## Relationships

- Uses: [Retry Module](/components/retry-module.md)
