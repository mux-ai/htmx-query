---
type: Architecture Decision
title: Opt In Cross Tab Invalidation
description: 'htmx.query.configure({crossTab: true}) propagates invalidation to other tabs of the same origin and namespace over BroadcastChannel.'
---

## Decision

Only invalidation crosses tabs — never cached HTML, which stays per-tab. A local invalidate posts {namespace, prefix, mode} on the "htmx-query" channel; a receiving tab applies it only when the namespace matches its own and never rebroadcasts, so two tabs cannot ping-pong. Received invalidations emit the normal hq:invalidated event, making a remote invalidation indistinguishable from a local one to hx-trigger listeners. Environments without BroadcastChannel accept the option and remain single-tab.

## Relationships

- Applies to: [Cache Store](/components/cache-store.md)
- Depends on: [Cache Key](/concepts/cache-key.md)
- Follows: [Observable Invalidation](/rules/observable-invalidation.md)
