---
type: Workflow
title: Persist Drag Reorder
description: A native drag-and-drop interaction reorders task rows immediately, persists the resulting ordered IDs through htmx, and reconciles cached task lists after the server accepts the mutation.
---

## Steps

1. The drag script captures the prior order and moves the row in the DOM for immediate feedback. 2. It serializes the task IDs into an hx-post form. 3. A successful response invalidates the task-list cache, causing hx-trigger listeners to refetch. 4. A failed response restores the captured DOM order. The mutation is not retried by default because reorders are non-GET writes.

## Accessibility

Native HTML drag events demonstrate the request integration but are not a complete keyboard or touch interaction. The demo also exposes move-up and move-down buttons for verifiable keyboard/click fallback; a polite live status announces move position and save/restore state. Production interfaces may still prefer an accessible drag-and-drop library for richer touch behavior.

## Code disclosure

The demo keeps an instructional code card beside the runnable interaction. It shows the task-list markup and reorder handler with local syntax coloring, and its Copy button uses the Clipboard API with an in-page fallback plus an aria-live confirmation. This keeps the runnable and instructional surfaces dependency-free.

## Relationships

- Follows: [Attribute Driven API](/decisions/attribute-driven-api.md)
- Uses: [Cache Store](/components/cache-store.md)
