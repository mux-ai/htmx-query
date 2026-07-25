---
type: Architecture Decision
title: Preserve Bounded Cache Properties
description: Deterministic randomized tests verify cache capacity, memory, and invalidation invariants across mixed operations.
---

## Decision

A seeded pseudo-random sequence exercises set, get, select, clear, and path invalidation. Assertions retain the 100-entry and 1 MiB bounds, avoiding flaky timing-based fuzzing in CI.

## Relationships

- Applies to: [Cache Store](/components/cache-store.md)
