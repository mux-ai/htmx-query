---
type: Business Rule
title: Dedupe Waiter Semantics
description: A duplicate in-flight GET (same cache key, hx-swr element) is cancelled and recorded as a waiter; waiters are served from cache when the winner lands successfully and dropped on failure.
---

## Rule

Waiters removed from the document before landing are skipped. Failure drops waiters silently: their next trigger (polling, invalidation) recovers them. Transport-finalization hooks clean up a winner even when its requesting element has left the document. Settling is idempotent because the in-flight registry entry is deleted on first settle.

## Relationships

- Enforced by: [Dedupe Module](/components/dedupe-module.md)
