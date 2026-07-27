---
type: Architecture Decision
title: Prefetch On Viewport Entry
description: hx-swr-prefetch gains a "visible" token that prefetches when the element scrolls into the viewport.
---

## Decision

A single shared IntersectionObserver watches elements carrying hx-swr-prefetch, added by an initial sweep on install and then on every htmx:afterProcessNode. That event — not htmx:load, which does not fire for htmx.process over existing markup — covers both the first pass and every later swap, so no MutationObserver is needed. The processed node itself is considered alongside its descendants, because querySelectorAll would not return it. Every existing prefetch guard still applies: same-origin only, hx-swr and hx-get required, Save-Data respected, one attempt per element. An element is unobserved once it has been attempted, so scrolling past it repeatedly costs nothing. Environments without IntersectionObserver silently skip the token rather than falling back to an eager fetch.

## Relationships

- Applies to: [Prefetch Module](/components/prefetch-module.md)
- Follows: [Keep Cache Prefetch Explicit And Non-Rendering](/decisions/keep-cache-prefetch-explicit-and-non-rendering.md)
