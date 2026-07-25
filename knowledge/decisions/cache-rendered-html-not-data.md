---
type: Architecture Decision
title: Cache Rendered HTML Not Data
description: htmx-query caches server-rendered HTML fragments keyed by request, never JSON data. This is the fundamental difference from React Query.
---

## Decision

The cache stores the exact serverResponse string htmx would swap. Consequences accepted: no cross-view sharing of one entry, no setQueryData-style surgical edits, no offline mutation queue. These are documented as out of scope rather than half-implemented.
