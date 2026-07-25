# Architecture Decision

* [Adopt OKF Project Knowledge](/decisions/adopt-okf-project-knowledge.md) - Agent-facing knowledge lives in OKF Markdown documents.
* [Attribute Driven API](/decisions/attribute-driven-api.md) - Every feature is opt-in through hx-* attributes and communicates through DOM events; no JavaScript calls are required to use the library. Only cache invalidation has an imperative helper.
* [Automate Dependency And Code Security Review](/decisions/automate-dependency-and-code-security-review.md) - Hosted automation supplements local audit checks with dependency update proposals and static security analysis.
* [Cache Rendered HTML Not Data](/decisions/cache-rendered-html-not-data.md) - htmx-query caches server-rendered HTML fragments keyed by request, never JSON data. This is the fundamental difference from React Query.
* [Cache Versioned Demo Assets](/decisions/cache-versioned-demo-assets.md) - The local demo may cache versioned JavaScript assets while keeping its HTML and data responses uncached.
* [Expose Bounded Diagnostic Metrics](/decisions/expose-bounded-diagnostic-metrics.md) - Applications can inspect cache efficiency and stale failures without receiving mutable cache internals.
* [Keep Bounded Linear Invalidation](/decisions/keep-bounded-linear-invalidation.md) - Cache invalidation scans the bounded cache instead of maintaining a prefix trie or secondary route index.
* [Keep Cache Observability Configurable](/decisions/keep-cache-observability-configurable.md) - Cache lifecycle events are useful during diagnosis but can be filtered or disabled by applications with high-frequency cache traffic.
* [Keep Cache Prefetch Explicit And Non-Rendering](/decisions/keep-cache-prefetch-explicit-and-non-rendering.md) - Prefetch is an optional cache warm-up, never an implicit navigation behavior or a source-element swap.
* [Minimal Toolchain](/decisions/minimal-toolchain.md) - esbuild for builds (IIFE + ESM + CJS), vitest with happy-dom and sinon fake XHR for tests, size-limit budget 5 kB minified.
* [Namespace In Memory Cache](/decisions/namespace-in-memory-cache.md) - Applications can switch an explicit cache namespace when their active account, tenant, or data partition changes.
* [Opt In Header Vary Cache Keys](/decisions/opt-in-header-vary-cache-keys.md) - Responses that vary by request headers are skipped by default; callers may explicitly include approved request headers in their cache key.
* [Pin Security Workflow Actions](/decisions/pin-security-workflow-actions.md) - Security workflows use immutable action revisions so a moving tag cannot silently change the analysis code executed by CI.
* [Preserve Bounded Cache Properties](/decisions/preserve-bounded-cache-properties.md) - Deterministic randomized tests verify cache capacity, memory, and invalidation invariants across mixed operations.
* [Publish Complete Release Metadata](/decisions/publish-complete-release-metadata.md) - The package includes an MIT license, changelog, and npm repository fields whenever a canonical public repository URL is available.
* [Publish Human And Agent Documentation](/decisions/publish-human-and-agent-documentation.md) - A static landing page teaches people how to install and use the library, while root-level llms.txt supplies concise, structured guidance to AI coding agents.
* [Publish Integrity And Provenance Artifacts](/decisions/publish-integrity-and-provenance-artifacts.md) - Releases publish Subresource Integrity digests for CDN script artifacts and use npm Trusted Publishing when the package owner configures it.
* [Release Through Verified Automation](/decisions/release-through-verified-automation.md) - Publishing is a tag/release-driven GitHub workflow that repeats all quality gates before npm publish with provenance.
* [Server Directives Override Client Freshness](/decisions/server-directives-override-client-freshness.md) - hx-swr supplies a client freshness preference, but HTTP directives that require validation place stricter bounds on reuse.
* [Ship JavaScript With Type Declarations](/decisions/ship-javascript-with-type-declarations.md) - The runtime remains plain JavaScript while the package publishes a hand-maintained TypeScript declaration for editor and compiler support.
* [Support htmx 2 Only](/decisions/support-htmx-2-only.md) - The extension targets htmx >=2.0.0 <3 and uses the public htmx.swap and htmx.ajax APIs, which do not exist or differ in htmx 1.x.
* [Verify In Real Browsers](/decisions/verify-in-real-browsers.md) - JSDOM verifies fast unit and integration behavior; Playwright verifies browser-only htmx, CSP, drag, and Clipboard behavior.
* [Verify Public API Compatibility](/decisions/verify-public-api-compatibility.md) - The small public API is protected by declaration checks and a consumer contract test so refactors do not silently break CDN, ESM, CJS, or TypeScript users.
