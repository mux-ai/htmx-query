---
type: Business Rule
title: Never Cache Errors Or OOB
description: Error responses, empty bodies, and responses containing hx-swap-oob are never written to the cache.
---

## Rule

Checked on htmx:beforeSwap: evt.detail.isError must be false and serverResponse must be non-empty and free of hx-swap-oob before cache.set runs. OOB fragments update multiple regions, so caching the whole body would replay side effects on cache hits.

## Relationships

- Enforced by: [SWR Module](/components/swr-module.md)
