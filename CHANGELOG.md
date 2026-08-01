# Changelog

All notable changes to this project are documented here.

## Unreleased

- Added dependency-free dual-runtime support for htmx 2 and htmx 4. The
  adapter normalizes htmx 2 XHR lifecycle data and htmx 4 Fetch request
  contexts while preserving the public attributes, `htmx.query` API, cached
  swaps, conditional revalidation, dedupe, retries, and optimistic behavior.
  The resulting minified brotli bundle is 7.13 kB with a 7.5 kB release limit.
- Added htmx `4.0.0-beta6` to the jsdom and Chromium/Firefox/WebKit CI
  matrices. The peer range keeps the verified prerelease floor explicit until
  htmx 4.0.0 is stable.
- Raised the bundle size budget from 7 kB to 7.5 kB to cover the dual-runtime
  adapter (currently 7.13 kB minified and brotlied).
- Performance: session persistence skips re-serializing an unchanged cache on
  tab switches via a cache revision counter; invalidation reuses each entry's
  precomputed resource path; the `hx-swr-vary` parse is reused across the up
  to three reads per request; pending retry timers are cancelled once the
  request succeeds; the viewport-prefetch observer releases elements removed
  from the DOM before they intersect.
- Added a staged, reversible
  [htmx 2 to htmx 4 migration guide](docs/migrating-to-htmx-4.md), including
  extension activation, lifecycle events, Fetch details, inheritance, changed
  defaults, verification, and rollback.

## 0.2.0

- Added `htmx.query.put(key, html, { ttl })` for manual cache seeding:
  namespace-scoped, bounded by the normal cache limits, with `ttl` recorded
  as an origin `max-age` so effective freshness stays `min(hx-swr, ttl)`.
- Added runtime-configurable cache bounds via
  `htmx.query.configure({ cache: { maxEntries, maxCacheBytes, maxEntryBytes,
  maxVariants } })`; shrinking evicts through the normal eviction path and
  `configure()` reports the effective limits.
- Added `If-Modified-Since` revalidation as a fallback for responses that carry
  `Last-Modified` but no `ETag`.
- Added a `visible` token to `hx-swr-prefetch`, prefetching on viewport entry
  through a shared `IntersectionObserver`; inert where unsupported.
- Added opt-in per-tab cache persistence via `configure({ persist: true })`,
  mirroring the cache into `sessionStorage` and hydrating through the normal
  bounded `cache.set` path. Namespace-scoped, and dropped on namespace change
  or `clear()`.
- Added opt-in cross-tab invalidation via `configure({ crossTab: true })`.
  Only invalidation crosses tabs; cached HTML never does.
- Raised the bundle budget from 5 kB to 7 kB.

## 0.1.0

- Fixed npm packaging for TypeScript node16 CommonJS consumers (per-format
  type declarations), exposed `./package.json` in the exports map, pinned
  pnpm via `packageManager`, and moved the publish job to Node 24 so npm
  Trusted Publishing works.

- Added `stale-while-revalidate` and `stale-if-error` response-directive
  support, keyboard `focus` prefetch triggers, invalidation counts in
  `hq:invalidated`, per-CDN-artifact SRI files, inherited `hx-select` on
  cached swaps, and a release checklist (RELEASING.md).

- Added bounded SWR HTML caching, retry, request deduplication, and optimistic updates for htmx 2.
- Added cache namespaces, stats, Cache-Control directive precedence, safe
  opt-in Vary dimensions, ETag revalidation, and stale-revalidation events.
- Added ESLint, TypeScript declaration checking, bounded-cache benchmarking,
  Vitest integration coverage, Playwright browser coverage, and provenance
  release automation.
- Added path-safe invalidation, configurable cache-event observability,
  HTTP-date Retry-After support, release tag/tarball smoke verification, and
  accessible reorder status announcements.
