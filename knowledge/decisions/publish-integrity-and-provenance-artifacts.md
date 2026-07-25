---
type: Architecture Decision
title: Publish Integrity And Provenance Artifacts
description: Releases publish Subresource Integrity digests for CDN script artifacts and use npm Trusted Publishing when the package owner configures it.
---

## Decision

The build writes SHA-384 integrity files beside both the default unpkg minified IIFE and the readable IIFE. Release verification recalculates each digest from the packed tarball before publication. The GitHub release workflow uses OIDC provenance rather than a long-lived npm token. Enabling the matching trusted publisher at npmjs.com remains an owner-side prerequisite.
