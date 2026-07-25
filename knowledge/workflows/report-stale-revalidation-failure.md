---
type: Workflow
title: Report Stale Revalidation Failure
description: When a stale fragment has rendered and its background revalidation fails, applications receive a single event without losing the fragment.
---

## Steps

1. SWR records that a stale cache entry was swapped. 2. htmx reports a response, transport, or timeout error. 3. The extension emits a bubbling hq:staleError event containing the cache key and status, then clears the per-request marker. Retry behavior remains unchanged.

## Relationships

- Uses: [SWR Module](/components/swr-module.md)
