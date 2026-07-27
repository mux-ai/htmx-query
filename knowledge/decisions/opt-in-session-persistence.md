---
type: Architecture Decision
title: Opt In Session Persistence
description: 'htmx.query.configure({persist: true}) mirrors the cache into sessionStorage so a full-page navigation can restore it.'
---

## Decision

Persistence is off by default and per-tab: sessionStorage, never localStorage, so entries die with the tab and are never shared across tabs or windows. Enabling it hydrates immediately from the record stored under the active namespace, then writes back on pagehide and on visibility change to hidden. Only html, time, etag, lastModified, and cacheControl are serialized; hx-select variants are recomputable and are dropped. Hydration replays entries through the ordinary bounded cache.set path, so current limits, eviction, and metrics apply to restored data exactly as they do to network responses. A malformed or oversized record is discarded rather than repaired. Responses marked no-store or private never reach the cache in the first place, so they cannot be persisted; the persisted record is nevertheless namespace-scoped and cleared whenever the namespace changes.

## Security

Persisted HTML is readable by any script on the origin for the lifetime of the tab. Applications rendering per-user content must set a namespace and must clear it on sign-out, exactly as they already must for the in-memory cache.

## Relationships

- Applies to: [Cache Store](/components/cache-store.md)
- Applies to: [Extension Router](/components/extension-router.md)
- Depends on: [Cache Key](/concepts/cache-key.md)
