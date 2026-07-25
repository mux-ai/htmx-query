---
type: Business Rule
title: Honor Stale Response Directives
description: stale-while-revalidate bounds how long past freshness stale HTML may render; stale-if-error lets rendered stale HTML stand through a failed revalidation without an hq:staleError event.
---

## Rule

Both directives are parsed from the response Cache-Control header and are server-controlled. The stale-while-revalidate window is anchored to ORIGIN freshness (the longer of the client hx-swr TTL and max-age/Expires, per RFC 5861); a shorter client TTL never shrinks the server's grant. Beyond the window the revalidation proceeds without a stale swap (an ETag validator is still attached), and a 304 answering a request that rendered no stale HTML swaps the validated cached entry into the target. Within the stale-if-error window a failed revalidation is not an error condition, so no hq:staleError fires. Absent directives preserve unlimited-stale behavior, and a non-numeric hx-swr degrades to 0, never NaN.

## Relationships

- Enforced by: [SWR Module](/components/swr-module.md)
