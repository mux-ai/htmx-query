---
type: Architecture Decision
title: Automate Dependency And Code Security Review
description: Hosted automation supplements local audit checks with dependency update proposals and static security analysis.
---

## Decision

Dependabot checks npm and GitHub Actions dependencies weekly. CodeQL analyzes JavaScript on pushes, pull requests, and a weekly schedule. Because this private repository does not have GitHub Advanced Security enabled, CodeQL completes analysis with SARIF upload disabled instead of failing at the unavailable code-scanning API. Enable upload when Advanced Security is available. These workflows do not change library runtime behavior or add production dependencies.

## Relationships

- Applies to: [Release Through Verified Automation](/decisions/release-through-verified-automation.md)
