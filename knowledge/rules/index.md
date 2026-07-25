# Business Rule

* [Account For Origin Response Age](/rules/account-for-origin-response-age.md) - Cached freshness includes time already spent in origin or intermediary caches, not only time elapsed in the browser.
* [Dedupe Waiter Semantics](/rules/dedupe-waiter-semantics.md) - A duplicate in-flight GET (same cache key, hx-swr element) is cancelled and recorded as a waiter; waiters are served from cache when the winner lands successfully and dropped on failure.
* [Hardened Local Demo Boundary](/rules/hardened-local-demo-boundary.md) - The executable demo is local-only by default and treats all submitted values as text, never as trusted HTML.
* [Honor Response Cache Directives](/rules/honor-response-cache-directives.md) - A response explicitly marked private, no-store, or variant by request headers is never retained by htmx-query, even with hx-swr.
* [Honor Stale Response Directives](/rules/honor-stale-response-directives.md) - stale-while-revalidate bounds how long past freshness stale HTML may render; stale-if-error lets rendered stale HTML stand through a failed revalidation without an hq:staleError event.
* [Never Cache Errors Or OOB](/rules/never-cache-errors-or-oob.md) - Error responses, empty bodies, and responses containing hx-swap-oob are never written to the cache.
* [Observable Invalidation](/rules/observable-invalidation.md) - cache.invalidate returns the removed-entry count and hq:invalidated carries { prefix, mode, count } so server-driven invalidation is debuggable without exposing cache internals.
* [Opt In Caching Only](/rules/opt-in-caching-only.md) - Only GET responses of elements carrying hx-swr are cached or deduped. All other traffic passes through untouched.
* [Optimistic Revert](/rules/optimistic-revert.md) - The pre-optimistic DOM snapshot is restored before the real response swaps in, and on any request error.
* [Parse Cache Headers Defensively](/rules/parse-cache-headers-defensively.md) - HTTP cache policy parsing must tolerate quoted values, malformed numeric directives, and wildcard Vary without accidentally widening reuse.
* [Precise Path Invalidation](/rules/precise-path-invalidation.md) - Applications can select resource-path invalidation to avoid substring collisions while retaining the existing contains behavior by default.
* [Release Pipeline Preconditions](/rules/release-pipeline-preconditions.md) - First-publish bootstrap, repo visibility, and toolchain floors that the release workflow depends on but cannot enforce by itself.
* [Retry Backoff](/rules/retry-backoff.md) - Retry delay is exponential, base * 2^(attempt-1), capped at 10x base and 30 seconds; equal jitter spreads callers over the latter half of the delay. A numeric or HTTP-date Retry-After response header overrides the computed delay before the same cap and jitter.
* [Safe Retry Verbs](/rules/safe-retry-verbs.md) - Only GET requests are retried by default; non-idempotent verbs require an explicit hx-retry-unsafe attribute.
* [Server Freshness Constraints](/rules/server-freshness-constraints.md) - Response cache directives can tighten, but never extend, the freshness requested by hx-swr.
* [SWR Freshness](/rules/swr-freshness.md) - Fresh cache hit cancels the request after swapping the cached copy; stale hit swaps the cached copy and lets the request revalidate.
