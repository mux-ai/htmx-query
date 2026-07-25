---
type: Workflow
title: Serve And Revalidate
description: GET with hx-swr fires; cached copy swaps in immediately; request is cancelled when fresh, otherwise the response overwrites and recaches.
---

## Steps

1. htmx:beforeRequest → SWR Module swaps cached HTML via htmx.swap. 2. Fresh → extension returns false, request never sent. 3. Stale → request proceeds; htmx:beforeSwap stores the new response; htmx swaps it; htmx:afterSwap settles dedupe waiters. Cached and network swaps apply the same hx-select filter; each cached selector variant is materialized once and then reused.

## Relationships

- Uses: [SWR Module](/components/swr-module.md)
