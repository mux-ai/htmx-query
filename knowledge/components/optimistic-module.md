---
type: Application Component
title: Optimistic Module
description: src/optimistic.js — inserts an hx-optimistic template into the target on beforeRequest, restores the snapshot on beforeSwap or error.
---

## Responsibility

Template selector comes from the hx-optimistic attribute. Cloned template nodes are appended and retained so only those nodes are removed on error. Scope is deliberately narrow: append + targeted revert, no setQueryData analogue.

## Relationships

- Follows: [Cache Rendered HTML Not Data](/decisions/cache-rendered-html-not-data.md)
