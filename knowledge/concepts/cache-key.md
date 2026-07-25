---
type: Domain Entity
title: Cache Key
description: Identity of a cache entry, defaulting to "verb:finalRequestPath"; an hx-swr-key attribute on the requesting element overrides it.
---

## Definition

Built from evt.detail.requestConfig.verb and evt.detail.pathInfo.finalRequestPath. An explicit hx-swr-key can replace that base. hx-swr-vary may append approved normalized request header values; Cookie and Authorization are forbidden dimensions. Prefix matching against keys is how invalidation selects entries to drop.
