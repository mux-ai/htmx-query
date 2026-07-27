---
type: Architecture Decision
title: Validate With Last Modified
description: Conditional revalidation falls back to If-Modified-Since when a response carried Last-Modified but no ETag.
---

## Decision

Cache entries retain both etag and lastModified. A revalidating request sends If-None-Match when an ETag exists and If-Modified-Since otherwise, never both, because an ETag is the stronger validator. The Last-Modified value is echoed verbatim as the origin sent it; the client never reformats or reparses the HTTP date. Everything downstream of the 304 is unchanged, so stale rendering, age refresh, and the suppressed empty body work identically for either validator.

## Relationships

- Applies to: [SWR Module](/components/swr-module.md)
- Applies to: [Cache Entry](/concepts/cache-entry.md)
