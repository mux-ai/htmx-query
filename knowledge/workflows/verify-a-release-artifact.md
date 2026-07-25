---
type: Workflow
title: Verify A Release Artifact
description: A release must have a matching version tag and an installable packed artifact before provenance publishing.
---

## Steps

1. Verify the GitHub release tag is v plus package.json version. 2. Build and pack the package. 3. Install the tarball into a clean temporary consumer and import both ESM and CommonJS entry points. 4. Publish only after these checks and the normal release gate pass.

## Relationships

- Follows: [Release Through Verified Automation](/decisions/release-through-verified-automation.md)
