---
type: Architecture Decision
title: Automate Dependency And Code Security Review
description: Hosted automation supplements local audit checks with dependency update proposals and static security analysis.
---

## Decision

Dependabot checks npm and GitHub Actions dependencies weekly. CodeQL analyzes JavaScript on pushes, pull requests, and a weekly schedule. These workflows report findings without changing library runtime behavior or adding production dependencies.

## Relationships

- Applies to: [Release Through Verified Automation](/decisions/release-through-verified-automation.md)
