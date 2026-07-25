---
type: Business Rule
title: Honor Response Cache Directives
description: A response explicitly marked private, no-store, or variant by request headers is never retained by htmx-query, even with hx-swr.
---

## Rule

Successful non-empty GET responses remain cacheable only when their Cache-Control header lacks private and no-store directives, including directive parameters such as private="Set-Cookie". Responses whose Vary header names any dimension other than HX-Request are skipped, because the cache key contains only verb, final URL, and namespace. An ETag on a retained response is saved for conditional revalidation.

## Relationships

- Enforced by: [SWR Module](/components/swr-module.md)
