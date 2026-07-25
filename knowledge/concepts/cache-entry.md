---
type: Domain Entity
title: Cache Entry
description: One cached response, stored as raw HTML, a storage timestamp, and lazily-created HTML variants selected by hx-select expressions.
---

## Definition

Entries live in a Map bounded to 100 entries and 1 MiB of raw plus selected HTML, with oldest-insertion eviction. No entry may exceed 256 KiB including its retained selector variants. Freshness is derived, never stored: fresh when (now - time)/1000 < the element's hx-swr TTL seconds. A selected variant is parsed once per selector per entry, then reused by cache hits and dedupe waiters. At most 16 selector variants are retained per entry; the oldest is evicted first.

## Relationships

- Depends on: [Cache Key](/concepts/cache-key.md)
