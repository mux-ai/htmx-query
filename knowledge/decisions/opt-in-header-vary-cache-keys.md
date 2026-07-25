---
type: Architecture Decision
title: Opt In Header Vary Cache Keys
description: Responses that vary by request headers are skipped by default; callers may explicitly include approved request headers in their cache key.
---

## Decision

hx-swr-vary names a comma-separated subset of request headers. The extension incorporates their normalized values into the key before storing or serving a response. Cookie and Authorization are rejected even when requested, because account namespaces—not credentials—are the supported isolation mechanism.

## Relationships

- Applies to: [Cache Key](/concepts/cache-key.md)
