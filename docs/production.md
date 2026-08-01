# Production recipe

Migrating an existing htmx 2 application? Follow the
[htmx 4 migration guide](migrating-to-htmx-4.md) before applying this recipe.

## Install with pinned artifacts

Use exact versions. The package's `unpkg` field resolves to the minified IIFE,
so use the matching `dist/htmx-query.min.js.sri` value from that release:

```html
<script src="https://unpkg.com/htmx.org@4.0.0-beta6"
        integrity="sha384-REPLACE_WITH_HTMX_4_BETA6_VALUE"
        crossorigin="anonymous"></script>
<script src="https://unpkg.com/htmx-query@0.2.0/dist/htmx-query.min.js"
        integrity="sha384-REPLACE_WITH_THE_MATCHING_RELEASE_VALUE"
        crossorigin="anonymous"></script>
<body>...</body>
```

htmx 4 extensions are global. For htmx 2, pin `htmx.org@2.0.10` and add
`hx-ext="query"` to the body or intended subtree. Do not use a prerelease htmx
version in production unless your deployment policy explicitly permits it;
the htmx 4 range is pinned to the beta verified by this project until 4.0.0 is
stable.

Never copy an SRI value across versions or between the minified and readable
IIFE files. The release notes and packaged `.sri` files are the source of
truth.

## Cache only public fragments

```html
<ul hx-get="/todos" hx-trigger="load, hq:invalidated from:body" hx-swr="60"></ul>
```

Send HTTP cache directives from the server. Use `no-store` or `private` for
personalized responses, and use `ETag` for conditional revalidation. On sign
in, sign-out, or tenant change, isolate future reads and clear old fragments:

```js
htmx.query.setNamespace(account.id);
```

## Invalidate after mutations

The mutation response can invalidate related paths without page-specific
JavaScript:

```http
HX-Cache-Invalidate: {"path":"/todos","mode":"path"}
```

Listen for `hq:invalidated` only when a view should refetch. Its detail is
`{ prefix, mode, count }`, so logging can reveal unexpectedly broad rules.

## Prefetch accessibly

Prefetch is opt-in. Use both triggers for navigation links; the request is
same-origin, GET-only, respects Save-Data, and never swaps the link itself.

```html
<a href="/reports" hx-get="/reports" hx-swr="60"
   hx-swr-prefetch="hover focus">Reports</a>
```

`hq:prefetch` reports `{ action: 'success' | 'error' | 'skip', ... }` for
diagnostics. It is not a navigation-completion event.

## Content Security Policy and trust boundary

htmx-query reuses server-rendered HTML just as htmx does. Sanitize untrusted
server output before it reaches htmx. Keep a restrictive CSP appropriate for
your application; the library itself requires no inline handlers or `eval`.
Your server remains responsible for authentication, authorization, CSRF
protection, rate limits, and durable storage.
