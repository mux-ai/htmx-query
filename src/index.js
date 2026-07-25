import { cache } from './cache.js';
import * as swr from './swr.js';
import * as retry from './retry.js';
import * as dedupe from './dedupe.js';
import * as optimistic from './optimistic.js';
import { invalidateFromResponse } from './invalidate.js';
import * as prefetch from './prefetch.js';
import { getNamespace, setNamespace } from './scope.js';
import { setHtmx } from './utils.js';

export function register(htmx) {
  setHtmx(htmx);
  prefetch.installPrefetch(htmx);

  htmx.defineExtension('query', {
    onEvent(name, evt) {
      switch (name) {
        // Order is load-bearing: SWR may cancel, dedupe may cancel,
        // optimistic applies only to requests that actually fly.
        case 'htmx:beforeRequest':
          retry.prepare(evt);
          // Prefetches populate the cache but must never render into their
          // source element. They also avoid an unnecessary cached swap.
          if (prefetch.observePrefetch(evt)) {
            if (dedupe.shouldCancel(evt)) return false;
            dedupe.observeFailure(evt);
            break;
          }
          if (swr.serveFromCache(evt)) return false;
          if (dedupe.shouldCancel(evt)) return false;
          dedupe.observeFailure(evt);
          optimistic.apply(evt);
          break;

        case 'htmx:beforeSwap':
          if (prefetch.isPrefetch(evt)) {
            swr.storeResponse(evt);
            evt.detail.shouldSwap = false;
            break;
          }
          // htmx otherwise swaps the empty 304 body over the stale HTML we
          // rendered in beforeRequest. Refresh the cache age and retain it.
          if (swr.refreshNotModified(evt)) {
            evt.detail.shouldSwap = false;
            evt.detail.isError = false;
            break;
          }
          optimistic.revert(evt);
          swr.storeResponse(evt);
          break;

        case 'htmx:afterSwap':
          dedupe.settle(evt, true);
          break;

        case 'htmx:afterRequest':
          {
            const notModified = swr.refreshNotModified(evt);
            dedupe.settle(evt, evt.detail.successful === true || notModified);
            prefetch.report(evt);
            if (evt.detail.successful || notModified) {
              invalidateFromResponse(evt);
              swr.clearStaleState(evt);
              retry.reset(evt);
            }
          }
          break;

        case 'htmx:responseError':
        case 'htmx:sendError':
        case 'htmx:timeout':
          prefetch.report(evt, 'error');
          if (swr.refreshNotModified(evt)) {
            dedupe.settle(evt, true);
            swr.clearStaleState(evt);
            retry.reset(evt);
            break;
          }
          swr.reportStaleError(evt);
          optimistic.revert(evt);
          dedupe.settle(evt, false);
          retry.maybeRetry(evt);
          break;

        // Aborts are intentional (hx-sync etc.) — clean up, never retry.
        case 'htmx:sendAbort':
          prefetch.report(evt, 'error');
          swr.clearStaleState(evt);
          optimistic.revert(evt);
          dedupe.settle(evt, false);
          break;
      }
      return true;
    },
  });

  htmx.query = {
    invalidate: (prefix, options) => cache.invalidate(prefix, options),
    clear: () => cache.clear(),
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
      return { cacheEvents: events };
    },
    setNamespace: (value) => {
      const next = value == null ? '' : String(value);
      if (next !== getNamespace()) {
        setNamespace(next);
        cache.clear();
      }
      return getNamespace();
    },
  };
  return htmx.query;
}

if (typeof window !== 'undefined' && window.htmx) {
  register(window.htmx);
}
