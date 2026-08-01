---
type: Workflow
title: Conditionally Revalidate Cached HTML
description: A stale response with an ETag is rendered immediately and revalidated with If-None-Match; a 304 refreshes freshness without retransferring or reparsing HTML.
---

## Steps

1. SWR finds a stale entry and adds If-None-Match to the normalized outgoing request headers before htmx sends XHR or Fetch. 2. A 200 replaces HTML and ETag normally. 3. A 304 keeps the existing HTML, refreshes its timestamp, and settles dedupe waiters from that retained entry.

## Relationships

- Uses: [Dedupe Module](/components/dedupe-module.md)
- Uses: [SWR Module](/components/swr-module.md)
