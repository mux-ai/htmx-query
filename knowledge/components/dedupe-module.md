---
type: Application Component
title: Dedupe Module
description: src/dedupe.js — in-flight registry keyed by cache key; cancels duplicate GETs and serves their targets from cache on settle.
---

## Responsibility

shouldCancel registers the first request as winner and later identical ones as waiters. settle(evt, success) runs on afterSwap (success), afterRequest (fallback, covers hx-swap none), and error events (failure path).

## Relationships

- Uses: [Cache Store](/components/cache-store.md)
