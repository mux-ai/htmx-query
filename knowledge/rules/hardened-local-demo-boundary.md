---
type: Business Rule
title: Hardened Local Demo Boundary
description: The executable demo is local-only by default and treats all submitted values as text, never as trusted HTML.
---

## Rule

The demo binds to 127.0.0.1 unless a developer explicitly supplies HOST, escapes reflected todo content, caps request bodies, and rejects cross-origin mutations. When a browser omits Origin or sends the opaque value null for a same-origin request, the boundary accepts only an explicit Sec-Fetch-Site same-origin signal or a same-origin Referer; absent provenance remains rejected. Its HTML responses carry a nonce-based Content Security Policy and baseline browser hardening headers. The demo serves its installed htmx dependency locally, so its runnable page does not depend on a third-party CDN at runtime.

## Relationships

- Applies to: [Publish Human And Agent Documentation](/decisions/publish-human-and-agent-documentation.md)
