# Workflow

* [Benchmark Bounded Request Paths](/workflows/benchmark-bounded-request-paths.md) - Performance checks exercise the hot paths introduced by cache invalidation and optional prefetch without imposing machine-specific strict limits.
* [Conditionally Revalidate Cached HTML](/workflows/conditionally-revalidate-cached-html.md) - A stale response with an ETag is rendered immediately and revalidated with If-None-Match; a 304 refreshes freshness without retransferring or reparsing HTML.
* [Invalidate And Refetch](/workflows/invalidate-and-refetch.md) - htmx.query.invalidate(prefix) drops matching entries and fires hq:invalidated; elements listening via hx-trigger refetch, and non-matching listeners short-circuit on their still-fresh cache.
* [Invalidate From Server Response](/workflows/invalidate-from-server-response.md) - A successful htmx response can declare cache paths to invalidate without page-specific JavaScript.
* [Persist Drag Reorder](/workflows/persist-drag-reorder.md) - A native drag-and-drop interaction reorders task rows immediately, persists the resulting ordered IDs through htmx, and reconciles cached task lists after the server accepts the mutation.
* [Report Stale Revalidation Failure](/workflows/report-stale-revalidation-failure.md) - When a stale fragment has rendered and its background revalidation fails, applications receive a single event without losing the fragment.
* [Retry With Backoff](/workflows/retry-with-backoff.md) - Failed eligible request schedules a delayed htmx.ajax reissue; success resets counters, exhaustion fires hq:retryExhausted.
* [Serve And Revalidate](/workflows/serve-and-revalidate.md) - GET with hx-swr fires; cached copy swaps in immediately; request is cancelled when fresh, otherwise the response overwrites and recaches.
* [Verify A Release Artifact](/workflows/verify-a-release-artifact.md) - A release must have a matching version tag and an installable packed artifact before provenance publishing.
