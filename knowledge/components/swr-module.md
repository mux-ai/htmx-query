---
type: Application Component
title: SWR Module
description: src/swr.js — serves cached copies on beforeRequest and stores successful GET responses on beforeSwap.
---

## Responsibility

serveFromCache returns true to signal "cancel the request" (fresh hit). storeResponse writes serverResponse under the element's cache key.

## Relationships

- Uses: [Cache Store](/components/cache-store.md)
