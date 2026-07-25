---
type: Business Rule
title: Account For Origin Response Age
description: Cached freshness includes time already spent in origin or intermediary caches, not only time elapsed in the browser.
---

## Rule

The response Age header and apparent age derived from Date backdate the in-memory timestamp. When Cache-Control max-age is absent, Expires defines the freshness lifetime relative to Date. This can only shorten the client-visible freshness window.

## Relationships

- Enforced by: [SWR Module](/components/swr-module.md)
