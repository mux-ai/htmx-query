---
type: Architecture Decision
title: Publish Human And Agent Documentation
description: A static landing page teaches people how to install and use the library, while root-level llms.txt supplies concise, structured guidance to AI coding agents.
---

## Decision

docs/index.html is dependency-free and suitable for static hosting. It covers CDN and bundler installation, the attribute API, common workflows, safety constraints, and links to the local live demo. The demo links back to the landing page and shares its dark navy, mint, and blue visual system while preserving the executable htmx examples. README links to it. llms.txt is the canonical machine-readable overview; RELEASING.md and docs/production.md cover maintainers and production consumers; llm.txt is a compatibility pointer for tools that use the singular filename. CDN examples pin exact versions; production users must add their own verified SRI hashes.

## Relationships

- Applies to: [Extension Router](/components/extension-router.md)
- Applies to: [Attribute Driven API](/decisions/attribute-driven-api.md)
