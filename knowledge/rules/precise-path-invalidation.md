---
type: Business Rule
title: Precise Path Invalidation
description: Applications can select resource-path invalidation to avoid substring collisions while retaining the existing contains behavior by default.
---

## Rule

invalidate(prefix, { mode: 'path' }) matches the cached request path only when it equals the supplied path or continues with slash or query boundaries. This prevents /todos from also invalidating /todos-archive. mode: contains remains the backwards-compatible default.

## Relationships

- Enforced by: [Cache Store](/components/cache-store.md)
