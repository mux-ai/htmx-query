---
type: Architecture Decision
title: Configurable Cache Bounds
description: Cache limits (entries, total bytes, per-entry bytes, variants) are runtime-configurable through htmx.query.configure({cache}) instead of hardcoded constants.
---

## Decision

Defaults stay 100 entries, 1 MiB total, 256 KiB per entry, 16 hx-select variants. configure({cache: {maxEntries, maxCacheBytes, maxEntryBytes, maxVariants}}) accepts positive finite numbers, ignores invalid values, and returns the effective limits; configure() with no cache key reports them without change. Shrinking limits enforces immediately: entries larger than the new per-entry budget are dropped and the oldest entries are evicted until count and total bytes fit, using the normal eviction path so metrics and hq:cache evict events stay truthful. Exported MAX_* constants remain as the defaults for benchmarks and tests.

## Relationships

- Applies to: [Cache Store](/components/cache-store.md)
- Applies to: [Extension Router](/components/extension-router.md)
- Follows: [Expose Bounded Diagnostic Metrics](/decisions/expose-bounded-diagnostic-metrics.md)
