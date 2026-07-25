---
type: Architecture Decision
title: Keep Bounded Linear Invalidation
description: Cache invalidation scans the bounded cache instead of maintaining a prefix trie or secondary route index.
---

## Decision

The cache holds at most 100 entries, making invalidation O(n * k) for n <= 100 and key length k. An index would add write-time and memory overhead, complicate the current substring matching API, and provide no material user-visible benefit at this bound.

## Relationships

- Applies to: [Cache Store](/components/cache-store.md)
