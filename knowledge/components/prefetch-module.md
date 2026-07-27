---
type: Application Component
title: Prefetch Module
description: src/prefetch.js — implements the explicit hx-swr-prefetch opt-in that warms the SWR cache without rendering into the source element.
---

## Responsibility

installPrefetch registers the trigger listeners once; prefetch requests are issued with htmx.ajax under a private htmx-query:prefetch triggering event so the router can recognize and suppress their swap. observePrefetch tags the request config, isPrefetch identifies it later, and report emits a single hq:prefetch success, error, or skip event per request. Guards: same-origin only, hx-swr and hx-get required, Save-Data respected, at most one attempt per element.

## Relationships

- Follows: [Keep Cache Prefetch Explicit And Non-Rendering](/decisions/keep-cache-prefetch-explicit-and-non-rendering.md)
- Uses: [Cache Store](/components/cache-store.md)
