---
type: Architecture Decision
title: Manual Cache Seeding
description: htmx.query.put(key, html, options) writes a rendered HTML fragment into the cache imperatively, closing the setQueryData-shaped gap without introducing a data store.
---

## Decision

put accepts the same key a consumer would use in hx-swr-key (or the implicit "get:<final path>" form), applies the active namespace exactly like request-derived keys, and stores through the same bounded cache.set path, so size limits, eviction, metrics, and hq:cache store events all apply unchanged. An optional ttl option (seconds) is recorded as an origin max-age so effective freshness stays min(hx-swr, ttl); without it the serving element's hx-swr alone governs freshness. put returns true when the entry was stored and false when rejected (oversized value or non-string input). Mutation handlers use it to seed or refresh list caches from a response fragment instead of refetching.

## Relationships

- Applies to: [Cache Store](/components/cache-store.md)
- Applies to: [Extension Router](/components/extension-router.md)
- Follows: [Cache Rendered HTML Not Data](/decisions/cache-rendered-html-not-data.md)
