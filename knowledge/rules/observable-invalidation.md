---
type: Business Rule
title: Observable Invalidation
description: cache.invalidate returns the removed-entry count and hq:invalidated carries { prefix, mode, count } so server-driven invalidation is debuggable without exposing cache internals.
---

## Rule

The JS API htmx.query.invalidate(prefix, options) forwards mode to the cache. Internal cache reads (dedupe waiter serving, stale-error policy checks) use a silent accessor so hit/miss metrics reflect only request-path lookups.

## Relationships

- Enforced by: [Cache Store](/components/cache-store.md)
