---
type: Business Rule
title: SWR Freshness
description: Fresh cache hit cancels the request after swapping the cached copy; stale hit swaps the cached copy and lets the request revalidate.
---

## Rule

On htmx:beforeRequest, a cached entry is always swapped in immediately. The request is cancelled only when the entry age is under the hx-swr TTL. A retrying element skips cache serving so a retry can never be short-circuited by the cache it refreshes.

## Relationships

- Enforced by: [SWR Module](/components/swr-module.md)
