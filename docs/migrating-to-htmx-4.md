# Migrating from htmx-query 0.2.x to htmx 4

The htmx 4-compatible htmx-query release supports both:

- `htmx.org >=2.0.0 <3`
- `htmx.org >=4.0.0-beta6 <5`

Upgrading htmx-query does not require upgrading htmx at the same time. The
safest rollout is to upgrade htmx-query first while keeping htmx 2, verify the
application, and then upgrade htmx separately.

htmx 4 is still prerelease software. Pin the exact verified version
`4.0.0-beta6` until this project verifies a newer release. In the CDN examples,
replace `HTMX_QUERY_VERSION` with the published htmx-query version containing
this guide.

## Choose a migration path

| Goal | Required application changes |
|---|---|
| Upgrade htmx-query and stay on htmx 2 | None. Keep htmx 2 pinned and retain `hx-ext="query"`. |
| Upgrade the application to htmx 4 | Update htmx, remove htmx-query's `hx-ext` activation, migrate application-owned htmx events, and audit the htmx 4 behavior changes below. |

The public htmx-query surface is unchanged in both paths. Existing
`hx-swr`, `hx-retry`, `hx-optimistic`, `hx-swr-prefetch`, `htmx.query.*`, and
`hq:*` usage remains valid.

## Recommended two-stage rollout

### Stage 1: upgrade htmx-query only

Keep htmx `2.0.10` and upgrade htmx-query to the new release:

```html
<script src="https://unpkg.com/htmx.org@2.0.10"></script>
<script src="https://unpkg.com/htmx-query@HTMX_QUERY_VERSION"></script>

<body hx-ext="query">
  ...
</body>
```

Run the existing application tests at this point. This separates any
htmx-query regression from the htmx major-version migration.

### Stage 2: switch htmx to version 4

Load htmx first, then htmx-query:

```html
<script src="https://unpkg.com/htmx.org@4.0.0-beta6"></script>
<script src="https://unpkg.com/htmx-query@HTMX_QUERY_VERSION"></script>

<body>
  ...
</body>
```

For a package-manager installation after the new release is published:

```bash
npm install htmx-query@latest htmx.org@4.0.0-beta6
```

Bundler registration is unchanged:

```js
import htmx from 'htmx.org';
import { register } from 'htmx-query';

register(htmx);
```

Commit the lockfile so the htmx prerelease cannot move unexpectedly.

## Remove htmx-query's `hx-ext` activation

htmx 2 activates extensions on a DOM subtree with `hx-ext`. htmx 4 extensions
are registered page-wide, so remove `query` from `hx-ext`:

```diff
- <body hx-ext="query">
+ <body>
```

Audit other values before deleting an entire `hx-ext` attribute; another
htmx 2 extension may need its own htmx 4 migration.

If the application uses htmx 4's extension allowlist, include `query` in the
configuration declared before htmx loads:

```html
<meta name="htmx-config" content='{"extensions":"query, sse"}'>
```

Leave the allowlist unset when it is not needed.

The separate
[`htmx-2-compat` extension](https://four.htmx.org/extensions/htmx-2-compat)
can temporarily restore old htmx event names, implicit inheritance, and
`hx-ext` behavior for a larger application. htmx-query does not require it.
Migrating directly avoids adding another script dependency.

## Update application-owned htmx events

htmx-query normalizes lifecycle differences internally. Event listeners in
your application still need htmx 4's colon-separated event names and
Fetch-shaped details.

| htmx 2 | htmx 4 |
|---|---|
| `htmx:configRequest` | `htmx:config:request` |
| `htmx:beforeRequest` | `htmx:before:request` |
| `htmx:afterRequest` | `htmx:after:request` |
| `htmx:beforeSwap` | `htmx:before:swap` |
| `htmx:afterSwap` | `htmx:after:swap` |
| `htmx:responseError` | `htmx:response:error` |
| `htmx:afterProcessNode` | `htmx:after:process` |

For example:

```diff
- <form hx-on::after-request="
-   if (event.detail.successful) htmx.query.invalidate('/todos')
- ">
+ <form hx-on:htmx:after:request="
+   if (event.detail.ctx.response.status < 400) htmx.query.invalidate('/todos')
+ ">
```

For markup or JavaScript that must run with both majors:

```js
const htmxMajor = Number.parseInt(htmx.version, 10);
const afterRequestEvent =
  htmxMajor >= 4 ? 'htmx:after:request' : 'htmx:afterRequest';

document.addEventListener(afterRequestEvent, (event) => {
  const successful = event.detail.ctx
    ? event.detail.ctx.response.status >= 200 &&
      event.detail.ctx.response.status < 400
    : event.detail.successful;

  if (successful) htmx.query.invalidate('/todos');
});
```

When possible, avoid a version-specific listener entirely by returning the
version-neutral invalidation header from a successful mutation:

```http
HX-Cache-Invalidate: {"path":"/todos","mode":"path"}
```

The public `hq:*` events emitted by htmx-query do not change.

## Replace XHR assumptions with Fetch context

htmx 4 uses `fetch()` instead of `XMLHttpRequest`. Application code and test
harnesses that inspect htmx's native request details need updating:

| htmx 2 request detail | htmx 4 request detail |
|---|---|
| `event.detail.xhr.status` | `event.detail.ctx.response.status` |
| `event.detail.xhr.responseText` | `event.detail.ctx.text` |
| `event.detail.xhr.getResponseHeader(name)` | `event.detail.ctx.response.headers.get(name)` |
| `event.detail.requestConfig` | `event.detail.ctx.request` |

This does not change the htmx-query API. The compatibility adapter handles
conditional headers, response caching, retries, dedupe, and swaps for both
transport shapes.

Review any XHR-specific request mocking, upload-progress handling, or global
XHR interception in the host application.

## Make inherited htmx attributes explicit

htmx 2 inherits many attributes from ancestors by default. htmx 4 requires
the `:inherited` modifier unless `htmx.config.implicitInheritance` is enabled.

```diff
- <section hx-target="#results" hx-select=".items">
+ <section hx-target:inherited="#results"
+          hx-select:inherited=".items">
    <button hx-get="/search" hx-swr="30">Search</button>
  </section>
```

Cached htmx-query swaps preserve htmx 4's resolved `hx-target`, `hx-swap`, and
explicitly inherited `hx-select`. Keep htmx-query feature attributes such as
`hx-swr` and `hx-retry` on the element issuing the request.

For a temporary transition, this restores htmx 2-style inheritance globally:

```js
htmx.config.implicitInheritance = true;
```

Prefer explicit inheritance as the final state because it makes request
behavior visible in the markup.

## Audit changed htmx 4 defaults

### Request timeout

htmx 4 defaults requests to a 60-second timeout; htmx 2 defaulted to no
timeout. htmx-query distinguishes that timeout from an intentional abort so
only real failures enter retry handling.

If the application intentionally requires no default timeout:

```js
htmx.config.defaultTimeout = 0;
```

### Error response swapping

htmx 4 normally swaps `4xx` and `5xx` response bodies. While htmx-query is
registered, its compatibility lifecycle retains htmx 2-style no-swap handling
for errors so retry and optimistic rollback behavior remain stable. Test any
application flow that intentionally renders an error response into its target.

### Request queues and out-of-band swaps

- Replace `queue:` modifiers in `hx-trigger` with an `hx-sync` strategy.
- htmx 4 performs the main swap before out-of-band swaps; htmx 2 performed
  out-of-band swaps first.

These are htmx changes rather than htmx-query API changes. Review the
[official htmx 4 migration guide](https://four.htmx.org/docs#migration) for
the complete list.

## Optional upgrade scan

htmx 4 includes an upgrade checker. It is optional and does not add a package
to the application:

```bash
npx htmx.org@4.0.0-beta6 upgrade-check -- .
```

The checker requires Python 3 and reports old event names, inheritance
patterns, removed attributes, and other likely migration work.

## Verification checklist

Run these checks in the application's supported browsers:

- A fresh `hx-swr` cache hit renders without another request.
- A stale ETag response sends `If-None-Match`; a `304` retains the current HTML.
- Simultaneous identical cache-enabled GETs collapse to one network request.
- GET retries occur on eligible response, network, and timeout failures.
- Intentional aborts do not retry.
- Optimistic nodes disappear after success or rollback after failure.
- `HX-Cache-Invalidate` and `htmx.query.invalidate()` refetch the intended views.
- Inherited `hx-target`, `hx-select`, `hx-confirm`, and `hx-include` still
  resolve as intended.
- Application-owned htmx event listeners run once with the expected detail.
- Error responses and out-of-band swaps produce the intended DOM.

For this repository, run:

```bash
npm run prepublishOnly
npm run test:browser
npm run package:verify
```

The project CI matrix verifies htmx `2.0.4`, `2.0.10`, and `4.0.0-beta6`.

## Rollback

The new htmx-query release continues to support htmx 2, so rollback does not
require downgrading htmx-query:

1. Pin `htmx.org@2.0.10`.
2. Restore `hx-ext="query"`.
3. Restore htmx 2 event names and XHR-shaped detail access in application code.
4. Convert htmx 4 `hx-*:inherited` attributes back to their normal htmx 2
   names wherever the application depends on implicit inheritance.

Keep the htmx and htmx-query upgrades in separate commits or deployment
changes so this rollback remains small.
