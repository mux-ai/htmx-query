---
type: Application Component
title: Htmx Compatibility Adapter
description: src/htmx-adapter.js normalizes htmx 2 XHR lifecycle events and htmx 4 Fetch request contexts without external dependencies.
---

## Responsibility

Detects the htmx major, registers the correct extension hooks, exposes stable request method, URL, source, target, headers, status, response text, success, and request identity fields, adds conditional request headers, cancels requests or swaps, and calls the public version-appropriate htmx.swap signature. Because htmx 4 reports both timeouts and intentional aborts as AbortError, the adapter owns its request timer so only timeouts are retryable. It also normalizes process observation for dynamically swapped prefetch elements.

## Relationships

- Applies to: [Dedupe Module](/components/dedupe-module.md)
- Applies to: [Extension Router](/components/extension-router.md)
- Applies to: [Prefetch Module](/components/prefetch-module.md)
- Applies to: [Retry Module](/components/retry-module.md)
- Applies to: [SWR Module](/components/swr-module.md)
