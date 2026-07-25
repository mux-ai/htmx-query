---
type: Architecture Decision
title: Namespace In Memory Cache
description: Applications can switch an explicit cache namespace when their active account, tenant, or data partition changes.
---

## Decision

htmx.query.setNamespace(value) prefixes subsequent cache keys and clears the previous namespace atomically. This retains the existing direct attribute API while making account boundaries safer than a caller remembering to clear a shared cache manually.

## Relationships

- Applies to: [Cache Store](/components/cache-store.md)
