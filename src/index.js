import { cache } from './cache.js';
import * as swr from './swr.js';
import * as retry from './retry.js';
import * as dedupe from './dedupe.js';
import * as optimistic from './optimistic.js';
import { invalidateFromResponse } from './invalidate.js';
import * as prefetch from './prefetch.js';
import { getNamespace, setNamespace, scopedKey } from './scope.js';
import * as persist from './persist.js';
import * as crosstab from './crosstab.js';
import { setHtmx } from './utils.js';
import { registerHtmxExtension } from './htmx-adapter.js';

function beforeRequest(evt) {
  retry.prepare(evt);
  // Prefetches populate the cache but must never render into their source
  // element. They also avoid an unnecessary cached swap.
  if (prefetch.observePrefetch(evt)) {
    if (dedupe.shouldCancel(evt)) return false;
    dedupe.observeFailure(evt);
    return true;
  }
  // Order is load-bearing: SWR may cancel, dedupe may cancel, and optimistic
  // markup applies only to requests that actually fly.
  if (swr.serveFromCache(evt)) return false;
  if (dedupe.shouldCancel(evt)) return false;
  dedupe.observeFailure(evt);
  optimistic.apply(evt);
  return true;
}

function beforeSwap(evt) {
  if (prefetch.isPrefetch(evt)) {
    swr.storeResponse(evt);
    return false;
  }
  // htmx otherwise swaps the empty 304 body over the stale HTML we rendered
  // before the request. Refresh the cache age and retain it.
  // htmx 4's swap hook is asynchronous; refresh now, then render the retained
  // entry from finally:request after the cancelled empty swap has unwound.
  if (swr.refreshNotModified(evt, !evt.htmx4)) return false;
  optimistic.revert(evt);
  swr.storeResponse(evt);
  // htmx 4 swaps 4xx/5xx responses by default. Preserve htmx-query's htmx 2
  // behavior: error responses are neither cached nor swapped.
  return evt.detail.isError !== true;
}

function afterSwap(evt) {
  dedupe.settle(evt, true);
}

function afterRequest(evt) {
  const notModified = swr.refreshNotModified(evt);
  dedupe.settle(evt, evt.detail.successful === true || notModified);
  prefetch.report(evt);
  if (evt.detail.successful || notModified) {
    invalidateFromResponse(evt);
    swr.clearStaleState(evt);
    retry.reset(evt);
  }
}

function requestError(evt) {
  prefetch.report(evt, 'error');
  if (swr.refreshNotModified(evt)) {
    dedupe.settle(evt, true);
    swr.clearStaleState(evt);
    retry.reset(evt);
    return;
  }
  swr.reportStaleError(evt);
  optimistic.revert(evt);
  dedupe.settle(evt, false);
  retry.maybeRetry(evt);
}

function requestAbort(evt) {
  prefetch.report(evt, 'error');
  swr.clearStaleState(evt);
  optimistic.revert(evt);
  dedupe.settle(evt, false);
}

export function register(htmx) {
  setHtmx(htmx);
  prefetch.installPrefetch(htmx);

  registerHtmxExtension(htmx, {
    beforeRequest,
    beforeSwap,
    afterSwap,
    afterRequest,
    error: requestError,
    abort: requestAbort,
  });

  htmx.query = {
    invalidate: (prefix, options) => cache.invalidate(prefix, options),
    // Manual seeding: same key a consumer would put in hx-swr-key (or the
    // implicit "get:<path>" form), scoped to the active namespace like every
    // request-derived key. An optional ttl (seconds) is recorded as an origin
    // max-age, so effective freshness stays min(hx-swr, ttl).
    put: (key, html, options = {}) => {
      if (typeof key !== 'string' || !key || typeof html !== 'string' || !html) return false;
      const ttl = Number(options.ttl);
      const cacheControl = Number.isFinite(ttl) && ttl >= 0 ? { maxAge: ttl } : {};
      return cache.set(scopedKey(key), html, { cacheControl });
    },
    clear: () => {
      cache.clear();
      persist.drop();
    },
    peek: () => cache.peek(),
    stats: () => ({ cache: cache.stats(), dedupe: dedupe.stats(), staleErrors: swr.stats().staleErrors, namespace: getNamespace() }),
    debug: () => ({
      ...htmx.query.stats(),
      keys: [...cache.peek().keys()],
    }),
    resetMetrics: () => {
      cache.resetMetrics();
      swr.resetStats();
    },
    configure: (options = {}) => {
      const events = Object.hasOwn(options, 'cacheEvents')
        ? cache.configureEvents(options.cacheEvents)
        : cache.configureEvents();
      const limits = cache.configureLimits(Object.hasOwn(options, 'cache') ? options.cache : null);
      const persisted = persist.configure(Object.hasOwn(options, 'persist') ? options.persist : undefined);
      const crossTab = crosstab.configure(Object.hasOwn(options, 'crossTab') ? options.crossTab : undefined);
      return { cacheEvents: events, cache: limits, persist: persisted, crossTab };
    },
    setNamespace: (value) => {
      const next = value == null ? '' : String(value);
      if (next !== getNamespace()) {
        // An account switch is a security boundary: drop the outgoing
        // namespace's persisted record before the new one becomes active.
        persist.drop();
        setNamespace(next);
        cache.clear();
        if (persist.isEnabled()) persist.hydrate();
      }
      return getNamespace();
    },
  };
  return htmx.query;
}

if (typeof window !== 'undefined' && window.htmx) {
  register(window.htmx);
}
