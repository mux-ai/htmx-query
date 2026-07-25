---
type: Architecture Decision
title: Keep Cache Prefetch Explicit And Non-Rendering
description: Prefetch is an optional cache warm-up, never an implicit navigation behavior or a source-element swap.
---

## Decision

hx-swr-prefetch is a token list ("hover", "focus", or both) accepted only with hx-swr on a same-origin GET. hover covers pointer users and focus covers keyboard users for accessibility parity. One best-effort request is issued per source element; it stores a cacheable response but suppresses the htmx swap. Prefetch is skipped when the browser Save-Data preference is enabled, and hq:prefetch communicates skip, success, and error outcomes.

## Relationships

- Applies to: [SWR Module](/components/swr-module.md)
- Uses: [Cache Store](/components/cache-store.md)
