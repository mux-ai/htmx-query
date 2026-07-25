---
type: Business Rule
title: Safe Retry Verbs
description: Only GET requests are retried by default; non-idempotent verbs require an explicit hx-retry-unsafe attribute.
---

## Rule

Retrying a POST can duplicate a write, so it is never automatic. Aborted requests (htmx:sendAbort) are intentional and never retried regardless of attributes.

## Relationships

- Enforced by: [Retry Module](/components/retry-module.md)
