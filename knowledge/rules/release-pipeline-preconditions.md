---
type: Business Rule
title: Release Pipeline Preconditions
description: First-publish bootstrap, repo visibility, and toolchain floors that the release workflow depends on but cannot enforce by itself.
---

## Rule

npm Trusted Publishing needs npm >= 11.5.1, so release.yml pins Node 24; never lower it. npm publish --provenance hard-fails while the GitHub repository is private. Trusted Publishing can only be bound to an already-published package, so 0.1.0 is published once manually with a short-lived granular token and no --provenance, then the token is revoked. package.json pins packageManager pnpm@9 so local resolution matches CI and avoids pnpm 11's default release-age lockfile policy. Types ship per module format (dist/htmx-query.d.ts + .d.cts) because a single ESM declaration breaks TypeScript node16 CommonJS consumers; verify-package.js compiles a node16 .cts smoke file against the packed tarball.

## Relationships

- Applies to: [Minimal Toolchain](/decisions/minimal-toolchain.md)
