---
type: Architecture Decision
title: Pin Security Workflow Actions
description: Security workflows use immutable action revisions so a moving tag cannot silently change the analysis code executed by CI.
---

## Decision

CodeQL actions are pinned to reviewed commit SHAs and Dependabot tracks their updates. Dependabot groups github/codeql-action bumps into one pull request because init and analyze must run the same version; split bumps fail the analyze post-action with a configuration/runtime version mismatch. The workflow keeps JavaScript analysis on push, pull request, and weekly schedule triggers.

## Relationships

- Applies to: [Automate Dependency And Code Security Review](/decisions/automate-dependency-and-code-security-review.md)
