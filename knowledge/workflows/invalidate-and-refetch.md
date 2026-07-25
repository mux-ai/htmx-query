---
type: Workflow
title: Invalidate And Refetch
description: htmx.query.invalidate(prefix) drops matching entries and fires hq:invalidated; elements listening via hx-trigger refetch, and non-matching listeners short-circuit on their still-fresh cache.
---

## Steps

Server-driven variant: a mutation response carries an HX-Trigger header whose handler calls htmx.query.invalidate. Elements opt into refetch with hx-trigger="load, hq:invalidated from:body".

## Relationships

- Uses: [Cache Store](/components/cache-store.md)
