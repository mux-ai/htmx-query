---
type: Workflow
title: Benchmark Bounded Request Paths
description: Performance checks exercise the hot paths introduced by cache invalidation and optional prefetch without imposing machine-specific strict limits.
---

## Steps

1. Populate 100 bounded entries and measure server-style invalidation. 2. Reuse one prefetched cache entry for 1,000 hits. 3. Compare median timings with conservative CI guardrails while retaining the 5 kB bundle budget.

## Relationships

- Uses: [Cache Store](/components/cache-store.md)
