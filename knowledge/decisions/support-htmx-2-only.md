---
type: Architecture Decision
title: Support htmx 2 Only
description: The extension targets htmx >=2.0.0 <3 and uses the public htmx.swap and htmx.ajax APIs, which do not exist or differ in htmx 1.x.
---

## Decision

peerDependency is htmx.org >=2.0.0 <3. Cached content is swapped with htmx.swap(target, html, {swapStyle}, {select, contextElement}) honoring the element's hx-swap first token (default innerHTML) and hx-select. Retries are reissued with htmx.ajax using the verb, final URL, and target captured before the original response can retarget it.
