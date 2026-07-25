---
type: Architecture Decision
title: Release Through Verified Automation
description: Publishing is a tag/release-driven GitHub workflow that repeats all quality gates before npm publish with provenance.
---

## Decision

CI checks that CHANGELOG.md contains the package version. A release workflow runs audit, lint, typecheck, tests, browser tests, size limit, packed-file and integrity inspection, and npm publish --provenance. The release tag must equal v plus package.json version; the packed tarball is installed into a clean consumer and imported as ESM and CommonJS before publication.
