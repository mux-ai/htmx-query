---
type: Architecture Decision
title: Minimal Toolchain
description: esbuild builds IIFE, ESM, and CJS artifacts; Vitest with jsdom and Playwright verify behavior without adding a compatibility framework.
---

## Decision

No Babel, no webpack, no TypeScript compile step. Plain ES2018 JavaScript. The IIFE build self-registers when window.htmx exists, which is the primary distribution (script tag / CDN). Dual htmx support is implemented inside the package with native platform APIs; no runtime dependency or transport-mocking dependency is added.
