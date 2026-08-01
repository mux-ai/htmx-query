# Application Component

* [Cache Store](/components/cache-store.md) - src/cache.js — bounded Map of Cache Entries with prefix invalidation that announces itself via a bubbling hq:invalidated event on body.
* [Dedupe Module](/components/dedupe-module.md) - src/dedupe.js — in-flight registry keyed by cache key; cancels duplicate GETs and serves their targets from cache on settle.
* [Extension Router](/components/extension-router.md) - src/index.js registers the "query" htmx extension and routes normalized lifecycle events to feature modules.
* [Htmx Compatibility Adapter](/components/htmx-compatibility-adapter.md) - src/htmx-adapter.js normalizes htmx 2 XHR lifecycle events and htmx 4 Fetch request contexts without external dependencies.
* [Optimistic Module](/components/optimistic-module.md) - src/optimistic.js — inserts an hx-optimistic template into the target on beforeRequest, restores the snapshot on beforeSwap or error.
* [Prefetch Module](/components/prefetch-module.md) - src/prefetch.js — implements the explicit hx-swr-prefetch opt-in that warms the SWR cache without rendering into the source element.
* [Retry Module](/components/retry-module.md) - src/retry.js — schedules htmx.ajax reissues with exponential backoff after normalized HTTP, network, or timeout failures.
* [SWR Module](/components/swr-module.md) - src/swr.js — serves cached copies on beforeRequest and stores successful GET responses on beforeSwap.
