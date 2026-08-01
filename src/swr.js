import { cache } from './cache.js';
import { attr, cacheKey, cacheRequestAllowed, isGet, requester, requestSelect, swapCached, varyHeaders } from './utils.js';
import { isRetrying } from './retry.js';

const staleRendered = new WeakSet();
let staleErrors = 0;

function splitDirectives(header) {
  const parts = [];
  let start = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < header.length; index += 1) {
    const char = header[index];
    if (escaped) {
      escaped = false;
    } else if (char === '\\' && quoted) {
      escaped = true;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      parts.push(header.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(header.slice(start));
  return parts;
}

function cacheControl(xhr) {
  try {
    const header = xhr?.getResponseHeader('Cache-Control');
    const directives = header ? splitDirectives(header).map((directive) => {
        const [name, value = ''] = directive.trim().split('=', 2);
        return [name.trim().toLowerCase(), value.trim().replace(/^"|"$/g, '')];
      }) : [];
    const value = (name) => directives.find(([directive]) => directive === name)?.[1];
    const seconds = (name) => {
      const raw = value(name);
      if (!raw) return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };
    const maxAgeValue = value('max-age');
    const maxAge = maxAgeValue ? Number(maxAgeValue) : NaN;
    const responseAge = Number(xhr?.getResponseHeader('Age'));
    const date = Date.parse(xhr?.getResponseHeader('Date') || '');
    const expires = Date.parse(xhr?.getResponseHeader('Expires') || '');
    const apparentAge = Number.isFinite(date) ? Math.max(0, (Date.now() - date) / 1000) : 0;
    const age = Math.max(Number.isFinite(responseAge) && responseAge >= 0 ? responseAge : 0, apparentAge);
    const expiresTtl = Number.isFinite(expires)
      ? Math.max(0, (expires - (Number.isFinite(date) ? date : Date.now())) / 1000)
      : null;
    return {
      maxAge: Number.isFinite(maxAge) && maxAge >= 0 ? maxAge : null,
      expiresTtl,
      age,
      mustRevalidate: directives.some(([directive]) => directive === 'must-revalidate'),
      noCache: directives.some(([directive]) => directive === 'no-cache'),
      private: directives.some(([directive]) => directive === 'private'),
      noStore: directives.some(([directive]) => directive === 'no-store'),
      staleWhileRevalidate: seconds('stale-while-revalidate'),
      staleIfError: seconds('stale-if-error'),
    };
  } catch {
    return {};
  }
}

const responseAllowsCache = (policy) => !policy.noStore && !policy.private;

/** The cache key has no request-header dimension, so only htmx's constant vary is safe. */
function responseVariesByRequestHeader(xhr, elt) {
  try {
    const allowed = new Set(['hx-request', ...varyHeaders(elt)]);
    return xhr?.getResponseHeader('Vary')
      ?.split(',')
      .map((header) => header.trim().toLowerCase())
      .some((header) => header && !allowed.has(header)) || false;
  } catch {
    return false;
  }
}

function responseHeader(xhr, name) {
  try {
    return xhr?.getResponseHeader(name) || null;
  } catch {
    return null;
  }
}

/** Client TTL capped by origin freshness (max-age or Expires), plus derived age. */
function freshness(entry, elt) {
  const policy = entry.cacheControl || {};
  const age = (Date.now() - entry.time) / 1000;
  const requested = Number(attr(elt, 'hx-swr'));
  // Garbage TTLs degrade to 0 ("always stale, always revalidate"), never NaN —
  // NaN comparisons would silently disable every downstream freshness gate.
  const clientTtl = Number.isFinite(requested) && requested >= 0 ? requested : 0;
  const originTtl = Number.isFinite(policy.maxAge) ? policy.maxAge : policy.expiresTtl;
  const effectiveTtl = Number.isFinite(originTtl) ? Math.min(clientTtl, originTtl) : clientTtl;
  return { policy, age, effectiveTtl, originTtl, fresh: !policy.noCache && age < effectiveTtl };
}

/** An ETag is the stronger validator, so Last-Modified is only the fallback. */
function addValidator(evt, entry) {
  const [header, value] = entry.etag
    ? ['If-None-Match', entry.etag]
    : ['If-Modified-Since', entry.lastModified];
  if (!value) return;
  try {
    evt.detail.xhr?.setRequestHeader(header, value);
  } catch {
    // htmx/browser rejected the late header; continue with a normal revalidation.
  }
}

/**
 * beforeRequest: serve the cached copy immediately when present.
 * Returns true (cancel the request) while the entry is still fresh;
 * a stale entry is rendered too, but the request proceeds and revalidates.
 * A retrying element skips the cache so a retry is never short-circuited
 * by the entry it is trying to refresh.
 */
export function serveFromCache(evt) {
  const elt = requester(evt);
  const ttl = attr(elt, 'hx-swr');
  if (ttl === null || !isGet(evt) || isRetrying(evt) || !cacheRequestAllowed(evt)) return false;
  const entry = cache.get(cacheKey(evt));
  if (!entry) return false;
  const { policy, age, effectiveTtl, originTtl, fresh } = freshness(entry, elt);
  const needsValidationBeforeUse = policy.noCache || (policy.mustRevalidate && !fresh);
  if (needsValidationBeforeUse) {
    addValidator(evt, entry);
    return false;
  }
  // stale-while-revalidate bounds how long past freshness stale HTML may
  // still render. Per RFC 5861 the window extends past ORIGIN freshness, so
  // anchor it there — a shorter client hx-swr must not shrink the grant.
  const staleAnchor = Number.isFinite(originTtl) ? Math.max(effectiveTtl, originTtl) : effectiveTtl;
  const staleServable = policy.staleWhileRevalidate == null || age < staleAnchor + policy.staleWhileRevalidate;
  if (!fresh && !staleServable) {
    addValidator(evt, entry);
    return false;
  }
  const selected = cache.selected(entry, requestSelect(evt));
  swapCached(evt, selected.html, selected.selected);
  if (!fresh) {
    staleRendered.add(evt.detail.requestConfig);
    addValidator(evt, entry);
  }
  return fresh;
}

export function clearStaleState(evt) {
  staleRendered.delete(evt.detail.requestConfig);
}

/** Announce a failed background revalidation only when stale HTML was rendered first. */
export function reportStaleError(evt) {
  const config = evt.detail.requestConfig;
  if (!config || !staleRendered.has(config)) return false;
  staleRendered.delete(config);
  const entry = cache.entry(cacheKey(evt));
  if (entry) {
    const { policy, age, effectiveTtl } = freshness(entry, requester(evt));
    // stale-if-error: the origin explicitly allows this stale entry to stand
    // in for an error within the window, so it is not an error condition.
    if (policy.staleIfError != null && age < effectiveTtl + policy.staleIfError) return true;
  }
  document.body.dispatchEvent(new CustomEvent('hq:staleError', {
    detail: { key: cacheKey(evt), status: evt.detail.xhr?.status || 0 },
    bubbles: true,
  }));
  staleErrors += 1;
  return true;
}

export function stats() {
  return { staleErrors };
}

export function resetStats() {
  staleErrors = 0;
}

/**
 * beforeSwap: store successful GET responses for opted-in elements.
 * Error responses, empty bodies, and hx-swap-oob payloads are never cached.
 */
export function storeResponse(evt) {
  const d = evt.detail;
  if (!isGet(evt) || d.isError || attr(requester(evt), 'hx-swr') === null || !cacheRequestAllowed(evt)) return;
  const html = d.serverResponse;
  const policy = cacheControl(d.xhr);
  if (!html || html.includes('hx-swap-oob') || !responseAllowsCache(policy) || responseVariesByRequestHeader(d.xhr, requester(evt))) return;
  cache.set(cacheKey(evt), html, {
    etag: responseHeader(d.xhr, 'ETag'),
    lastModified: responseHeader(d.xhr, 'Last-Modified'),
    cacheControl: policy,
    age: policy.age,
  });
}

/** Requests whose 304 already rendered the validated entry (idempotency guard). */
const notModifiedRendered = new WeakSet();

/**
 * A 304 refreshes the cached entry's age. When no stale HTML was rendered in
 * beforeRequest (no-cache validation, or a refused stale render beyond the
 * stale-while-revalidate window), the validated entry must be swapped in now —
 * otherwise the suppressed empty 304 body would leave the target unrendered.
 */
export function refreshNotModified(evt, render = true) {
  const d = evt.detail;
  const elt = requester(evt);
  if (!isGet(evt) || d.xhr?.status !== 304 || attr(elt, 'hx-swr') === null) return false;
  const key = cacheKey(evt);
  if (!cache.refresh(key)) return false;
  const config = d.requestConfig;
  if (render && config && !staleRendered.has(config) && !notModifiedRendered.has(config)) {
    notModifiedRendered.add(config);
    const entry = cache.entry(key);
    if (entry) {
      const selected = cache.selected(entry, requestSelect(evt));
      swapCached(evt, selected.html, selected.selected);
    }
  }
  return true;
}
