---
type: Business Rule
title: Server Freshness Constraints
description: Response cache directives can tighten, but never extend, the freshness requested by hx-swr.
---

## Rule

max-age is the upper bound of hx-swr's effective TTL. no-cache forces validation before every reuse. must-revalidate prevents a stale fragment from rendering until validation succeeds. The stale fragment is eligible for stale-on-error notification only when it was actually rendered before a revalidation attempt.

## Relationships

- Enforced by: [SWR Module](/components/swr-module.md)
