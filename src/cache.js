import { hx } from './utils.js';

export const MAX_ENTRIES = 100;
export const MAX_VARIANTS = 16;
export const MAX_CACHE_BYTES = 1024 * 1024;
export const MAX_ENTRY_BYTES = 256 * 1024;

const store = new Map();
const encoder = new TextEncoder();
let totalBytes = 0;
const metrics = {
  evictions: 0,
  hits: 0,
  misses: 0,
  skippedEntries: 0,
  skippedVariants: 0,
  stores: 0,
  variantHits: 0,
  variantMisses: 0,
};
const CACHE_EVENT_ACTIONS = new Set(['hit', 'miss', 'store', 'evict', 'skip', 'clear']);
let cacheEventFilter = null;

const bytes = (html) => encoder.encode(html).byteLength;

function emit(action, detail = {}) {
  if (typeof document === 'undefined' || !document.body) return;
  if (cacheEventFilter && !cacheEventFilter.has(action)) return;
  document.body.dispatchEvent(
    new CustomEvent('hq:cache', { detail: { action, ...detail }, bubbles: true })
  );
}

function pathForKey(key) {
  const start = key.indexOf('get:');
  const path = start === -1 ? key : key.slice(start + 4);
  return path.split('|vary:', 1)[0];
}

function removeEntry(key, evicted = false) {
  const entry = store.get(key);
  if (!entry) return;
  totalBytes -= entry.bytes;
  store.delete(key);
  if (evicted) {
    metrics.evictions += 1;
    emit('evict', { key, bytes: entry.bytes });
  }
}

function removeOldestVariant(entry) {
  const key = entry.variants.keys().next().value;
  const variant = entry.variants.get(key);
  entry.variants.delete(key);
  entry.bytes -= variant.bytes;
  totalBytes -= variant.bytes;
}

export const cache = {
  get(key) {
    const entry = store.get(key);
    if (entry) {
      metrics.hits += 1;
      emit('hit', { key });
    } else {
      metrics.misses += 1;
      emit('miss', { key });
    }
    return entry;
  },

  /** Internal lookup that leaves hit/miss metrics and events untouched. */
  entry(key) {
    return store.get(key);
  },

  set(key, html, { etag = null, cacheControl = {}, age = 0 } = {}) {
    const entryBytes = bytes(html);
    removeEntry(key);
    if (entryBytes > MAX_ENTRY_BYTES) {
      metrics.skippedEntries += 1;
      emit('skip', { key, reason: 'entry-too-large', bytes: entryBytes });
      return false;
    }
    while (store.size >= MAX_ENTRIES || totalBytes + entryBytes > MAX_CACHE_BYTES) {
      removeEntry(store.keys().next().value, true);
    }
    // Age (or apparent age derived from Date) belongs to the origin response,
    // not this tab. Backdating ensures it can only shorten freshness here.
    const responseAge = Number.isFinite(age) && age > 0 ? age : 0;
    store.set(key, {
      html,
      time: Date.now() - responseAge * 1000,
      bytes: entryBytes,
      etag,
      cacheControl,
      variants: new Map(),
    });
    totalBytes += entryBytes;
    metrics.stores += 1;
    emit('store', { key, bytes: entryBytes });
    return true;
  },

  /**
   * Materialize one hx-select result per cache entry and selector. htmx still
   * owns the final target-specific swap, but repeated hits avoid reselecting
   * the same raw response. A variant that would exceed a byte budget is used
   * for this swap but deliberately not retained.
   */
  selected(entry, selector) {
    if (!selector) return { html: entry.html, selected: false };
    const cached = entry.variants.get(selector);
    if (cached) {
      metrics.variantHits += 1;
      return { html: cached.html, selected: true };
    }
    metrics.variantMisses += 1;

    const template = document.createElement('template');
    template.innerHTML = entry.html;
    const html = [...template.content.querySelectorAll(selector)].map((node) => node.outerHTML).join('');
    const variant = { html, bytes: bytes(html) };
    while (entry.variants.size && (entry.variants.size >= MAX_VARIANTS || entry.bytes + variant.bytes > MAX_ENTRY_BYTES)) {
      removeOldestVariant(entry);
    }
    if (entry.bytes + variant.bytes <= MAX_ENTRY_BYTES && totalBytes + variant.bytes <= MAX_CACHE_BYTES) {
      entry.variants.set(selector, variant);
      entry.bytes += variant.bytes;
      totalBytes += variant.bytes;
    } else {
      metrics.skippedVariants += 1;
      emit('skip', { reason: 'variant-too-large', bytes: variant.bytes });
    }
    return { html, selected: true };
  },

  refresh(key) {
    const entry = store.get(key);
    if (!entry) return false;
    entry.time = Date.now();
    return true;
  },

  /** Drop entries by backwards-compatible substring or a resource-path boundary. */
  invalidate(prefix, { mode = 'contains' } = {}) {
    let count = 0;
    for (const key of [...store.keys()]) {
      const path = pathForKey(key);
      const matchesPath = path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`);
      if (mode === 'path' ? matchesPath : key.includes(prefix)) {
        removeEntry(key);
        count += 1;
      }
    }
    if (typeof document !== 'undefined' && document.body) {
      const detail = { prefix, mode, count };
      // htmx.trigger normalizes extension listeners across engines, notably
      // WebKit's `from:body` handling. Keep the native fallback for consumers
      // that use the cache module without htmx.
      if (hx?.trigger) hx.trigger(document.body, 'hq:invalidated', detail);
      else document.body.dispatchEvent(new CustomEvent('hq:invalidated', { detail, bubbles: true }));
    }
    return count;
  },

  clear() {
    const entries = store.size;
    store.clear();
    totalBytes = 0;
    emit('clear', { entries });
  },

  configureEvents(value) {
    if (value === true || value === undefined) cacheEventFilter = null;
    else if (value === false) cacheEventFilter = new Set();
    else if (Array.isArray(value)) cacheEventFilter = new Set(value.filter((action) => CACHE_EVENT_ACTIONS.has(action)));
    return cacheEventFilter === null ? true : cacheEventFilter.size ? [...cacheEventFilter] : false;
  },

  peek() {
    return new Map(store);
  },

  stats() {
    const lookups = metrics.hits + metrics.misses;
    return {
      ...metrics,
      bytes: totalBytes,
      entries: store.size,
      hitRate: lookups ? metrics.hits / lookups : 0,
    };
  },

  resetMetrics() {
    for (const key of Object.keys(metrics)) metrics[key] = 0;
  },
};
