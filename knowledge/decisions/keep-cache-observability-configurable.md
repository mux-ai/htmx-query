---
type: Architecture Decision
title: Keep Cache Observability Configurable
description: Cache lifecycle events are useful during diagnosis but can be filtered or disabled by applications with high-frequency cache traffic.
---

## Decision

htmx.query.configure accepts cacheEvents true, false, or a list of lifecycle action names. stats remains available without event dispatch. The default preserves the observable event behavior.

## Relationships

- Applies to: [Cache Store](/components/cache-store.md)
