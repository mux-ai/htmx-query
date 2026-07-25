---
type: Architecture Decision
title: Minimal Toolchain
description: esbuild for builds (IIFE + ESM + CJS), vitest with happy-dom and sinon fake XHR for tests, size-limit budget 5 kB minified.
---

## Decision

No Babel, no webpack, no TypeScript compile step. Plain ES2018 JavaScript. The IIFE build self-registers when window.htmx exists, which is the primary distribution (script tag / CDN).
