---
type: Application Component
title: Cache Store
description: src/cache.js — bounded Map of Cache Entries with prefix invalidation that announces itself via a bubbling hq:invalidated event on body.
---

## Responsibility

get/set/clear/peek/stats plus invalidate(prefix). Eviction removes the oldest insertion once 100 entries exist; setting an existing key refreshes its insertion order. It lazily materializes selected HTML variants and reuses them for repeated selectors. Its snapshot reports entries, retained bytes, hits, misses, stores, evictions, and skipped oversized values without exposing mutable internals. It emits bubbling hq:cache events for hit, miss, store, eviction, skip, and clear operations so applications can observe behavior without reading internal maps. htmx.query.configure can keep all events, disable them, or filter them by action without changing stats.

## Relationships

- Depends on: [Cache Entry](/concepts/cache-entry.md)
