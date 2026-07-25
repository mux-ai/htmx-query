---
type: Architecture Decision
title: Publish Complete Release Metadata
description: The package includes an MIT license, changelog, and npm repository fields whenever a canonical public repository URL is available.
---

## Decision

A license file and changelog ship in the tarball. Repository, bugs, and homepage fields deliberately remain unset until the maintainer supplies an authoritative public URL; guessing one would create broken release links.
