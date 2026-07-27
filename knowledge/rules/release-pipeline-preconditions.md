---
type: Business Rule
title: Release Pipeline Preconditions
description: First-publish bootstrap, repo visibility, and toolchain floors that the release workflow depends on but cannot enforce by itself.
---

## Rule

npm Trusted Publishing needs npm >= 11.5.1, so release.yml pins Node 24; never lower it. npm publish --provenance hard-fails while the GitHub repository is private. Trusted Publishing can only be bound to an already-published package, so 0.1.0 is published once manually with a short-lived granular token and no --provenance, then the token is revoked. package.json pins packageManager pnpm@9 so local resolution matches CI and avoids pnpm 11's default release-age lockfile policy. Types ship per module format (dist/htmx-query.d.ts + .d.cts) because a single ESM declaration breaks TypeScript node16 CommonJS consumers; verify-package.js compiles a node16 .cts smoke file against the packed tarball.

## Trusted Publishing credential path

The trusted publisher must be bound to the npm PACKAGE, not to the owning user or organization, because npm exchanges the OIDC token at a per-package endpoint. The Environment field must stay blank, since the publish job declares no environment and any value there fails the claim match. A missing or mismatched binding answers the exchange with 404 "OIDC token exchange error - package not found", which npm reports only as ENEEDAUTH unless publishing with --loglevel verbose. The publish job must also NOT set registry-url on actions/setup-node: that writes an .npmrc containing ${NODE_AUTH_TOKEN}, which never resolves when there is deliberately no token, and npm then authenticates with the empty credential instead of running the OIDC exchange, failing the publish PUT as a 404. npm defaults to registry.npmjs.org, so the input buys nothing.

## Relationships

- Applies to: [Minimal Toolchain](/decisions/minimal-toolchain.md)
