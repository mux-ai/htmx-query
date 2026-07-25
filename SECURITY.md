# Security policy

Please report suspected vulnerabilities privately via GitHub's private
vulnerability reporting: <https://github.com/mux-ai/htmx-query/security/advisories/new>
(repository Security tab -> "Report a vulnerability"). Expect an
acknowledgement within 7 days. Do not open a public issue with a proof of
concept that could affect users.

The executable demo is local-only by default and is not a production server.
Applications using htmx-query must treat server-rendered HTML as trusted,
sanitize untrusted input on the server, and call `htmx.query.setNamespace()`
when an account changes without a full navigation.

Browsers do not expose `Set-Cookie` response headers to JavaScript. Mark
personalized responses with `Cache-Control: private` or `no-store`; that is
the enforceable signal htmx-query uses to avoid retaining them.
