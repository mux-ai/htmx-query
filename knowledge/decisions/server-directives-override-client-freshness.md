---
type: Architecture Decision
title: Server Directives Override Client Freshness
description: hx-swr supplies a client freshness preference, but HTTP directives that require validation place stricter bounds on reuse.
---

## Decision

no-cache entries always revalidate before reuse and are not rendered from memory first. max-age caps the effective hx-swr freshness TTL. must-revalidate prevents rendering an entry once it is stale. This preserves htmx-query's SWR behavior for ordinary responses without weakening an origin server's explicit validation requirements.

## Relationships

- Applies to: [SWR Module](/components/swr-module.md)
