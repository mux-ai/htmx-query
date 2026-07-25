---
type: Architecture Decision
title: Attribute Driven API
description: Every feature is opt-in through hx-* attributes and communicates through DOM events; no JavaScript calls are required to use the library. Only cache invalidation has an imperative helper.
---

## Decision

Attributes: hx-swr (TTL seconds), hx-swr-key, hx-retry, hx-retry-delay, hx-retry-unsafe, hx-optimistic. Events emitted: hq:invalidated (bubbles from body), hq:retryExhausted (bubbles from the element). JS API: htmx.query.invalidate(prefix), htmx.query.clear(), htmx.query.peek().
