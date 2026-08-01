---
type: Application Component
title: Extension Router
description: src/index.js registers the "query" htmx extension and routes normalized lifecycle events to feature modules.
---

## Responsibility

Order before a request is load-bearing: SWR cache serve first (may cancel), dedupe second (may cancel), optimistic apply last. The compatibility adapter applies the version-specific cancellation mechanism. Modules never call each other directly; they share only the cache store and DOM events. Also exposes register(htmx) for ESM users and self-registers when window.htmx exists.

## Relationships

- Uses: [Dedupe Module](/components/dedupe-module.md)
- Uses: [Htmx Compatibility Adapter](/components/htmx-compatibility-adapter.md)
- Uses: [Optimistic Module](/components/optimistic-module.md)
- Uses: [Retry Module](/components/retry-module.md)
- Uses: [SWR Module](/components/swr-module.md)
