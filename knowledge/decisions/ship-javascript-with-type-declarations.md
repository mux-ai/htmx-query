---
type: Architecture Decision
title: Ship JavaScript With Type Declarations
description: The runtime remains plain JavaScript while the package publishes a hand-maintained TypeScript declaration for editor and compiler support.
---

## Decision

index.d.ts describes register, the htmx-like registration surface, the public query helpers, cache statistics, and cache lifecycle events. It adds no build step or runtime bytes and keeps TypeScript consumers from needing untyped global access.

## Relationships

- Applies to: [Extension Router](/components/extension-router.md)
