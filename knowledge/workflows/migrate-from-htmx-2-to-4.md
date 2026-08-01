---
type: Workflow
title: Migrate From htmx 2 To 4
description: Applications upgrade htmx-query independently from htmx, then move to htmx 4 through a reversible compatibility checklist.
---

## Steps

1. Upgrade to the dual-runtime htmx-query release while retaining htmx 2 and hx-ext="query"; verify existing behavior. 2. Pin the verified htmx 4 prerelease and keep htmx-query loaded after htmx. 3. Remove hx-ext="query", unless temporarily using htmx's separate htmx-2-compat extension. 4. Rename application-owned lifecycle listeners to htmx 4's colon-separated events and read Fetch response data through detail.ctx. 5. Mark inherited htmx attributes with :inherited, audit timeout, error-swap, hx-trigger queue, and OOB ordering changes, then verify caching, 304 revalidation, dedupe, retries, optimistic rollback, and invalidation in real browsers. Rollback requires repinning htmx 2, restoring hx-ext and old application event listeners, and converting :inherited markup back to normal htmx 2 attribute names. The new htmx-query release itself does not need to be downgraded because it continues supporting htmx 2.

## Relationships

- Applies to: [Publish Human And Agent Documentation](/decisions/publish-human-and-agent-documentation.md)
- Follows: [Support htmx 2 And 4](/decisions/support-htmx-2-and-4.md)
- Uses: [Htmx Compatibility Adapter](/components/htmx-compatibility-adapter.md)
