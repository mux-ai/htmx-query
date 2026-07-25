# htmx-query

React Query-flavored **caching, stale-while-revalidate, retry, request dedupe
and optimistic updates** for [htmx](https://htmx.org) — as a single ~4.75 kB
extension. No build step, no client data store, no API changes: everything is
opt-in `hx-*` attributes.

Requires **htmx 2.x** (`htmx.org >= 2.0.0 < 3`).

[Landing page](docs/index.html) · [Production recipe](docs/production.md) · [AI agent guide](llms.txt) · [Interactive demo](examples/demo.html)

## Why use htmx-query?

htmx already owns HTML rendering and server interaction. htmx-query adds the
small amount of client-side coordination that repeated requests usually need,
without introducing a component framework or a second data model.

### Advantages

- **HTML-first:** caches the exact server-rendered fragment htmx would swap;
  your server remains the source of truth.
- **Opt-in and incremental:** add one attribute to one GET request; existing
  htmx requests and extensions continue to work untouched.
- **Fast repeat views:** fresh cache hits render without another request;
  stale entries can render immediately while revalidation runs in the
  background.
- **Fewer duplicate requests:** identical in-flight GETs are collapsed into a
  single network request.
- **Safer defaults:** POST retries are disabled, sensitive `Vary` headers are
  rejected, and `no-store`/`private` responses are not cached.
- **Small integration surface:** CDN, ESM, and CommonJS builds, plus bundled
  TypeScript declarations. The minified brotli bundle is kept below 5 kB.
- **Observable behavior:** cache events, invalidation events, hit-rate metrics,
  stale-error metrics, and a bounded `debug()` view are available when needed.

### Limitations and trade-offs

- The cache is **in-memory and page-scoped**. A full navigation clears it; it
  is not an offline cache and does not persist across tabs.
- It stores **HTML, not normalized data**. There is no `setQueryData`, query
  graph, offline mutation queue, or cross-view sharing of one response.
- Cache keys are request-oriented. If two views need different HTML, give them
  different `hx-swr-key` values or keep them as separate requests.
- The default cache is bounded to 100 entries, 1 MiB total, 256 KiB per entry,
  and 16 `hx-select` variants per entry. Older entries/variants are evicted
  when those limits are reached.
- Optimistic updates are HTML templates. Complex rollback, validation, and
  conflict resolution still belong in application code.
- Native drag events are only a demonstration. Production touch and keyboard
  interactions may need a dedicated accessible drag-and-drop library.
- Cached swaps bypass later htmx `transformResponse` processing. Do not cache
  elements that depend on another extension transforming every response.
- The library targets **htmx 2.x only** (`>=2.0.0 <3`).

Choose htmx-query when the server owns rendered HTML and you need bounded,
repeat-request performance. Choose a normalized client data library or SPA
architecture when you need offline state, cross-view mutations, persistent
storage, or rich client-side conflict handling.

## Install

```html
<script src="https://unpkg.com/htmx.org@2.0.10"></script>
<script src="https://unpkg.com/htmx-query@0.1.0"></script>

<body hx-ext="query">
  ...
</body>
```

For production, pin exact versions and add Subresource Integrity hashes
(`integrity="sha384-..." crossorigin="anonymous"`) to both script tags —
floating versions cannot be integrity-checked.

Or with a bundler:

```bash
npm install htmx-query htmx.org
```

```js
import htmx from 'htmx.org';
import { register } from 'htmx-query';
register(htmx);
```

The package exports ESM (`import`), CommonJS (`require`), and a browser IIFE.
The IIFE self-registers when `window.htmx` is already present. For a CDN
deployment, pin both versions and use the SRI values generated beside the
published artifacts (`dist/*.sri`).

## Implementation guide

1. Load htmx 2 and htmx-query, then add `hx-ext="query"` to the nearest
   inherited container.
2. Add `hx-swr="TTL"` only to cacheable GET fragments. Start with a short TTL
   and confirm the response is public or otherwise safe to reuse.
3. Add `hx-trigger="..., hq:invalidated from:body"` to lists that should
   refresh after a mutation.
4. Invalidate after a successful mutation, or let the server send an
   `HX-Cache-Invalidate` response header.
5. Add retry, optimistic, prefetch, or header-vary behavior only where the
   endpoint semantics justify it.

The smallest useful integration is:

```html
<body hx-ext="query">
  <ul hx-get="/todos"
      hx-trigger="load, hq:invalidated from:body"
      hx-swr="30"></ul>

  <form hx-post="/todos" hx-on::after-request="htmx.query.invalidate('/todos')">
    <input name="text" required>
    <button>Add</button>
  </form>
</body>
```

For production hardening—SRI, cache headers, account namespaces, CSRF, and
deployment checks—see [docs/production.md](docs/production.md).

## Quick tour

```html
<!-- SWR: instant cached render, background refresh, fresh for 30s -->
<div hx-get="/todos" hx-trigger="load" hx-swr="30"></div>

<!-- retry: 3 attempts, exponential backoff starting at 1s -->
<div hx-get="/flaky" hx-trigger="load" hx-retry="3"></div>

<!-- optimistic: template shows instantly, reverted on error -->
<form hx-post="/todos" hx-target="#list" hx-swap="beforeend"
      hx-optimistic="#pending">...</form>
<template id="pending"><li class="opacity-50">Saving…</li></template>

<!-- refetch when the todos cache is invalidated -->
<ul hx-get="/todos" hx-trigger="load, hq:invalidated from:body" hx-swr="60"></ul>
```

```js
// after a mutation elsewhere (e.g. an HX-Trigger header handler):
htmx.query.invalidate('/todos'); // drops matching entries + fires hq:invalidated
```

### Optional prefetch

Prefetch is off by default. Add it only to a same-origin GET that already has
`hx-swr`; a single best-effort request fills the cache and never swaps the
element. `hover` covers pointer users, `focus` covers keyboard users — list
both for parity:

```html
<a href="/reports" hx-get="/reports" hx-swr="60"
   hx-swr-prefetch="hover focus">Reports</a>
```

### Drag-and-drop reorder

Use native drag events or an accessible drag-and-drop library to move rows in
the DOM, then submit the ordered IDs through htmx. On success, invalidate the
cached list; on failure, restore the captured DOM order in the drag script.

```html
<ol id="tasks" hx-get="/tasks"
    hx-trigger="load, hq:invalidated from:body" hx-swr="60"></ol>
<form id="reorder" hx-post="/tasks/reorder" hx-swap="none"></form>
```

Do not enable `hx-retry-unsafe` for reorder POSTs unless the endpoint is
idempotent and uses an idempotency key. Native drag events alone are not a
complete accessible solution: provide keyboard move controls or use an
accessible drag-and-drop library in production.

## Attributes

| Attribute | On | Meaning |
|---|---|---|
| `hx-swr="TTL"` | GET elements | Cache the response. Cached copy renders instantly on later requests; request is cancelled while the entry is younger than TTL seconds, otherwise it revalidates in the background. `hx-swr="0"` = always stale, always revalidate. Also opts the element into dedupe. |
| `hx-swr-key="key"` | GET elements | Override the cache key (default `get:<final URL>`). |
| `hx-swr-vary="Header, ..."` | GET elements | Opt in safe request-header values as cache-key dimensions, for example `Accept-Language`. `Cookie` and `Authorization` are rejected. |
| `hx-swr-prefetch="hover focus"` | GET elements with `hx-swr` | Token list. One same-origin, best-effort request per element that populates the cache without swapping it: `hover` for pointer users, `focus` for keyboard users. |
| `hx-retry="N"` | any request | Retry failed requests up to N times (maximum 10). |
| `hx-retry-delay="ms"` | with `hx-retry` | Base backoff delay, default 1000. Delay = `base * 2^(attempt-1)`, capped at 10× base and 30 seconds; equal jitter spreads retries. A seconds or HTTP-date `Retry-After` header overrides it before the same cap. |
| `hx-retry-unsafe` | with `hx-retry` | Allow retrying non-GET verbs (off by default — retrying a POST can duplicate a write). |
| `hx-optimistic="#tpl"` | mutating elements | Append the `<template>`'s content to the target immediately; restored before the real response swaps in, and on error. |

## Events

| Event | Fired on | When |
|---|---|---|
| `hq:invalidated` | `body` (bubbles) | After `htmx.query.invalidate(prefix)`. Detail carries `{ prefix, mode, count }` — the invalidated-entry count makes server-driven invalidation debuggable. Listen with `hx-trigger="hq:invalidated from:body"` to refetch. Elements whose cache was *not* invalidated short-circuit on their still-fresh entry — no wasted requests. |
| `hq:prefetch` | `body` (bubbles) | An explicit prefetch completed or was skipped. Detail is `{ action: 'success' | 'error' | 'skip', path?, reason? }`. |
| `hq:retryExhausted` | the element (bubbles) | All retry attempts failed. |
| `hq:staleError` | `body` (bubbles) | A stale fragment was rendered, then its background revalidation failed. Detail includes `key` and HTTP `status`. |
| `hq:cache` | `body` (bubbles) | Cache lifecycle event; `detail.action` is one of `hit`, `miss`, `store`, `evict`, `skip`, or `clear`. |

## JS API

```js
htmx.query.invalidate(prefix); // backwards-compatible substring invalidation
htmx.query.invalidate('/todos', { mode: 'path' }); // /todos, /todos/:id, and /todos?… only
htmx.query.clear();            // empty the cache
htmx.query.peek();             // copy of the cache Map (debugging)
htmx.query.stats();            // cache bytes, hitRate, staleErrors, and dedupe counts
htmx.query.debug();            // read-only stats plus cache keys
htmx.query.resetMetrics();     // reset diagnostic counters without clearing entries
htmx.query.setNamespace('acme'); // scope keys to an account; changing it clears old entries
htmx.query.configure({ cacheEvents: ['evict', 'skip'] }); // true, false, or event-action filter

document.body.addEventListener('hq:cache', (event) => {
  console.debug(event.detail); // { action: 'hit' | 'miss' | 'store' | 'evict' | 'skip' | 'clear', ... }
});
```

A successful server response can invalidate entries without handwritten client
code. Send JSON in `HX-Cache-Invalidate`; an object or array is accepted:

```http
HX-Cache-Invalidate: {"path":"/todos","mode":"path"}
```

## Semantics worth knowing

- **Only GETs on elements with `hx-swr` are cached or deduped.** Everything
  else passes through untouched. htmx-query's own `hx-swr*`/`hx-retry*`
  attributes are read from the requesting element directly (no inheritance);
  `hx-select` follows htmx's inheritance on cached swaps — closest ancestor,
  `data-hx-select`, `"unset"`, `hx-disinherit`, and `hx-inherit` under
  `htmx.config.disableInheritance` — matching the network path.
- `stale-while-revalidate=N` on a response bounds how long past *origin*
  freshness (the longer of `hx-swr` and `max-age`/`Expires`, per RFC 5861)
  its stale HTML may still render; beyond that the revalidation runs without
  a stale swap. `stale-if-error=N` lets rendered stale HTML stand through a
  failed revalidation without an `hq:staleError` event. Both are
  server-controlled and combine with ETag validation — a `304` that follows
  a refused or skipped stale render swaps the validated entry in.
- Cached swaps bypass other htmx extensions' `transformResponse` (htmx runs
  it after the point where the response is cached). Avoid `hx-swr` on
  elements that depend on a transforming extension.
- Error responses, empty bodies, and responses containing `hx-swap-oob` are
  never cached.
- Responses with `Cache-Control: no-store` or `private` are never cached.
  Parameterized forms such as `private="Set-Cookie"` are also rejected.
  Responses that vary on request headers other than `HX-Request` are skipped,
  because those headers are not part of the cache key.
  Use `hx-swr-vary` only for non-sensitive headers you explicitly want to
  partition, such as `Accept-Language`.
- `no-cache` validates before every reuse; `max-age` caps the configured
  `hx-swr` TTL; a stale `must-revalidate` response waits for validation rather
  than rendering stale HTML.
- `Age` and apparent age from `Date` reduce client freshness. Without
  `Cache-Control: max-age`, `Expires` sets an origin-relative lifetime.
- Browsers do not expose `Set-Cookie` response headers to JavaScript. Mark
  personalized endpoints `Cache-Control: private` or `no-store`; do not rely
  on a browser extension to infer that a response set a cookie.
  A stale entry with an `ETag` is revalidated with `If-None-Match`; a `304`
  keeps the displayed HTML and refreshes its cache age.
- Cached swaps honor the first token of the element's `hx-swap`
  (default `innerHTML`).
- Duplicate in-flight GETs (same key) are collapsed to one request; the
  waiters render from cache when it lands, and are dropped on failure.
- A retrying element bypasses the cache, so a retry can never be
  short-circuited by the entry it is refreshing.
- The cache holds at most 100 entries and 1 MiB of raw plus selected HTML
  (oldest entries evicted), and lives for the page's lifetime — navigation
  clears it. An entry, including retained variants, cannot exceed 256 KiB.
- Each cached response retains at most 16 `hx-select` variants (oldest
  evicted). A variant that exceeds the byte budget is still used for its
  current swap but is not retained.
- For predictable first-hit latency, cache a small server fragment directly;
  reserve `hx-select` for extracting a small part of a larger response.

## Security

htmx-query swaps **server-rendered HTML**, exactly like htmx itself. The
trust boundary is unchanged: your server's HTML is trusted. Two things to
keep in mind:

- Do not point `hx-swr` at endpoints that reflect unsanitized user input —
  the cached copy is re-inserted verbatim on every hit.
- `hx-optimistic` templates are developer-authored markup in your page, not
  user data. Keep them that way.
- Call `htmx.query.setNamespace(accountId)` after sign-in or account switching;
  it scopes future keys and clears the old account's fragments. `clear()` remains
  appropriate when no account namespace is used.

### TypeScript users

The runtime is JavaScript, but the package includes `src/index.d.ts` for
typed `register()`, `htmx.query`, cache stats, and `hq:cache` events. No
TypeScript build step is required by applications that use the CDN build.

## Compatibility contract

The documented attributes, `register()` return value, `htmx.query` methods,
cache statistics, and `hq:*` event detail shapes are the public API. Additions
are released as backward-compatible minor changes; removals or behavior changes
include a changelog entry and migration notes. The declaration file and the
consumer type test are updated with every public API change. While the package
is still pre-1.0, review the changelog before upgrading minor versions.

## Performance baseline

`npm run bench` reports the bounded-cache baseline. `npm run bench:check`
uses intentionally generous local limits (5 ms for invalidating 100 entries,
250 ms for materializing 16 selectors, 25 ms for 1,000 prefetch cache hits) to catch major regressions in CI
without turning normal machine variance into failures.

## Browser support and verification

The supported runtime is htmx 2.x in modern browsers. The repository runs
the unit suite in jsdom plus real-browser checks in Chromium, Firefox, and
WebKit. The WebKit suite keeps the browser-specific conditional-request and
rendering checks enabled; one mutation-trigger assertion is isolated because
WebKit's htmx `from:body` event bridge differs from Chromium and Firefox. The
same server invalidation behavior is covered by the Chromium/Firefox suites
and direct server tests.

## Publishing

`npm run build` writes a SHA-384 SRI file next to each script-tag artifact:
`dist/htmx-query.min.js.sri` (what unpkg serves by default via the package's
`unpkg` field) and `dist/htmx-query.iife.js.sri`. Pin a published version and
copy the value matching the file you actually load into the script tag's
`integrity` attribute. The release workflow uses npm Trusted Publishing
(OIDC); before the first release, an owner must bind this GitHub repository
and release workflow at npmjs.com. It intentionally has no npm
automation-token fallback. The step-by-step owner checklist lives in
[RELEASING.md](RELEASING.md).

## What this is NOT

This is not a client-side data store. There is no `setQueryData`, no offline
mutation queue, no cross-view sharing of one cache entry, no devtools cache
inspector — those need a JSON data cache, which is React Query territory. If
your app needs them, that's the signal to reach for a SPA stack, not to
extend this further.

## Demo

```bash
npm run build
npm run demo   # http://127.0.0.1:8484 (local-only by default)

# Optional: use another local port
PORT=8485 npm run demo

# Only when intentionally sharing on a trusted network
HOST=0.0.0.0 PORT=8485 npm run demo
```

The local demo serves versioned JavaScript assets with a one-hour browser
cache. Its HTML and mutation responses are `no-store`; its public SWR list
responses use `public, max-age=60`, so their server freshness contract agrees
with the visible `hx-swr` demonstration.

The demo server is deliberately not a production server: it uses in-memory
state, accepts only same-origin htmx mutations, and applies a small request
body limit. Production applications need their own authentication,
authorization, CSRF protection, rate limiting, and durable storage.
