---
type: Architecture Decision
title: Verify Public API Compatibility
description: The small public API is protected by declaration checks and a consumer contract test so refactors do not silently break CDN, ESM, CJS, or TypeScript users.
---

## Decision

Each release verifies register, invalidate options and return value, namespace, stats, cache events, invalidation details, and prefetch event details. Semver changes must update README, llms.txt, and the declaration file together.

## Relationships

- Applies to: [Extension Router](/components/extension-router.md)
