# Application Component

* [Cache Store](/components/cache-store.md) - src/cache.js — bounded Map of Cache Entries with prefix invalidation that announces itself via a bubbling hq:invalidated event on body.
* [Dedupe Module](/components/dedupe-module.md) - src/dedupe.js — in-flight registry keyed by cache key; cancels duplicate GETs and serves their targets from cache on settle.
* [Extension Router](/components/extension-router.md) - src/index.js — registers the "query" htmx extension; onEvent is a thin switch that routes lifecycle events to feature modules.
* [Optimistic Module](/components/optimistic-module.md) - src/optimistic.js — inserts an hx-optimistic template into the target on beforeRequest, restores the snapshot on beforeSwap or error.
* [Retry Module](/components/retry-module.md) - src/retry.js — schedules htmx.ajax reissues with exponential backoff after responseError, sendError, or timeout.
* [SWR Module](/components/swr-module.md) - src/swr.js — serves cached copies on beforeRequest and stores successful GET responses on beforeSwap.
