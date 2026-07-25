---
type: Business Rule
title: Optimistic Revert
description: The pre-optimistic DOM snapshot is restored before the real response swaps in, and on any request error.
---

## Rule

Each inserted optimistic node is retained in a WeakMap keyed by requester. Revert removes only retained nodes, preserving unrelated DOM changes while the request was pending. The revert is idempotent and removed elements leak nothing.

## Relationships

- Enforced by: [Optimistic Module](/components/optimistic-module.md)
