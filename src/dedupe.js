import { cache } from './cache.js';
import { attr, cacheKey, cacheRequestAllowed, closestAttr, isGet, requester, swapCached } from './utils.js';
import { isRetrying } from './retry.js';

/** cache key -> Set of cancelled duplicate request events awaiting the winner */
const inflight = new Map();

/**
 * beforeRequest (after the SWR check): cancel this GET when an identical
 * one is already in flight; the waiter is served from cache on landing.
 */
export function shouldCancel(evt) {
  if (!isGet(evt) || attr(requester(evt), 'hx-swr') === null || isRetrying(evt) || !cacheRequestAllowed(evt)) return false;
  const key = cacheKey(evt);
  const waiters = inflight.get(key);
  if (waiters) {
    waiters.add(evt);
    return true;
  }
  inflight.set(key, new Set());
  return false;
}

/**
 * htmx error events on a detached requester cannot bubble to the extension.
 * Observe the winner's XHR as well so its in-flight registry entry is always
 * released on transport failures.
 */
export function observeFailure(evt) {
  const xhr = evt.detail.xhr;
  if (!xhr || xhr.__htmxQueryDedupeObserved) return;
  xhr.__htmxQueryDedupeObserved = true;
  const fail = () => settle(evt, false);
  xhr.addEventListener('error', fail, { once: true });
  xhr.addEventListener('abort', fail, { once: true });
  xhr.addEventListener('timeout', fail, { once: true });
}

/**
 * Winner landed: serve waiters from the (now fresh) cache on success,
 * drop them on failure. Idempotent — the registry entry is deleted first.
 */
export function settle(evt, success) {
  if (!isGet(evt) || attr(requester(evt), 'hx-swr') === null) return;
  const key = cacheKey(evt);
  const waiters = inflight.get(key);
  if (!waiters) return;
  inflight.delete(key);
  if (!success) return;
  const entry = cache.entry(key); // internal read — keep hit/miss stats honest
  if (!entry) return;
  for (const waiter of waiters) {
    const elt = requester(waiter);
    if (!document.contains(elt)) continue;
    const selected = cache.selected(entry, closestAttr(elt, 'hx-select'));
    swapCached(waiter, selected.html, selected.selected);
  }
}

export function stats() {
  let waiters = 0;
  for (const values of inflight.values()) waiters += values.size;
  return { inflight: inflight.size, waiters };
}
