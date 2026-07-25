---
type: Architecture Decision
title: Expose Bounded Diagnostic Metrics
description: Applications can inspect cache efficiency and stale failures without receiving mutable cache internals.
---

## Decision

stats reports cache hitRate and staleErrors. debug returns stats plus a copy of cache keys, and resetMetrics clears counters while retaining entries. These helpers remain read-only diagnostics and add no network or persistence behavior.

## Relationships

- Applies to: [Cache Store](/components/cache-store.md)
