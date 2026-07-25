---
type: Business Rule
title: Retry Backoff
description: Retry delay is exponential, base * 2^(attempt-1), capped at 10x base and 30 seconds; equal jitter spreads callers over the latter half of the delay. A numeric or HTTP-date Retry-After response header overrides the computed delay before the same cap and jitter.
---

## Rule

Base delay comes from hx-retry-delay (default 1000 ms). Invalid or non-positive values use the default. After min(hx-retry, 10) attempts are exhausted the element dispatches a bubbling hq:retryExhausted event and counters reset. A retry is skipped when the element has left the document. The hard cap avoids accidental unbounded client traffic.

## Relationships

- Enforced by: [Retry Module](/components/retry-module.md)
