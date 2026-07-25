---
type: Business Rule
title: Parse Cache Headers Defensively
description: HTTP cache policy parsing must tolerate quoted values, malformed numeric directives, and wildcard Vary without accidentally widening reuse.
---

## Rule

Cache-Control directives are tokenized without splitting commas inside quotes. Invalid ages are ignored, while Vary: * and unknown request dimensions disable storage. Existing no-store, private, and validation requirements remain authoritative.

## Relationships

- Enforced by: [SWR Module](/components/swr-module.md)
