# Changelog

All notable changes to this project are documented here.

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
