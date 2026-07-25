---
type: Business Rule
title: Opt In Caching Only
description: Only GET responses of elements carrying hx-swr are cached or deduped. All other traffic passes through untouched.
---

## Rule

Attribute presence is checked on the requesting element directly (no attribute inheritance). Non-GET verbs are never cached.

## Relationships

- Enforced by: [SWR Module](/components/swr-module.md)
