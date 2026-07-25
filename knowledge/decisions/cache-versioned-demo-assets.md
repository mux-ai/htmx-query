---
type: Architecture Decision
title: Cache Versioned Demo Assets
description: The local demo may cache versioned JavaScript assets while keeping its HTML and data responses uncached.
---

## Decision

The demo loads htmx and htmx-query through versioned local URLs. Its server gives those JavaScript responses a short public cache lifetime, avoiding repeat downloads during local reloads. Documents and mutation responses remain no-store; public SWR fragments use a matching public max-age so their server contract permits the demo's in-memory freshness window.

## Relationships

- Applies to: [Publish Human And Agent Documentation](/decisions/publish-human-and-agent-documentation.md)
