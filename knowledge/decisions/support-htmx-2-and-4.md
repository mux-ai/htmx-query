---
type: Architecture Decision
title: Support htmx 2 And 4
description: The extension preserves htmx 2 compatibility while adding htmx 4 support through a small dependency-free lifecycle and transport adapter.
---

## Decision

The peerDependency is htmx.org >=2.0.0 <3 || >=4.0.0-beta6 <5; beta6 is the verified htmx 4 floor until 4.0.0 is stable. htmx 2 retains defineExtension/onEvent and XHR-shaped lifecycle data; htmx 4 uses registerExtension hooks and Fetch-shaped request contexts. Feature modules consume one normalized request view. Cached swaps preserve hx-swap and hx-select through the public version-appropriate htmx.swap API, including htmx 4's explicit :inherited selection. Retries use htmx.ajax with the original verb, final URL, source, and pre-retarget target.

## Relationships

- Enforced by: [Htmx Compatibility Adapter](/components/htmx-compatibility-adapter.md)
