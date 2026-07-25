---
type: Workflow
title: Invalidate From Server Response
description: A successful htmx response can declare cache paths to invalidate without page-specific JavaScript.
---

## Steps

1. The server sends HX-Cache-Invalidate JSON with a path and optional path/contains mode. 2. After a successful request, the extension parses the trusted same-origin response header. 3. It invokes cache invalidation, which emits hq:invalidated and refetches listeners.

## Relationships

- Uses: [Cache Store](/components/cache-store.md)
