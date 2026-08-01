import { cache } from './cache.js';
import { getNamespace } from './scope.js';

const PREFIX = 'htmx-query';
let enabled = false;
let installed = false;

const storageKey = () => `${PREFIX}::${getNamespace()}`;

let savedRevision = -1;
let savedKey = null;

/** sessionStorage throws in private modes and when the quota is exhausted. */
function storage() {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

/**
 * hx-select variants are recomputable from the entry HTML, so only the
 * validators and freshness metadata are worth the serialized bytes.
 */
function serialize() {
  const entries = [];
  for (const [key, entry] of cache.peek()) {
    entries.push({
      key,
      html: entry.html,
      time: entry.time,
      etag: entry.etag,
      lastModified: entry.lastModified,
      cacheControl: entry.cacheControl,
    });
  }
  return entries;
}

export function save() {
  const store = storage();
  if (!enabled || !store) return false;
  const key = storageKey();
  // Serializing the whole cache is the expensive part of the mirror, and save
  // runs on every visibilitychange. Skip it when nothing changed since the
  // last successful write to this key.
  if (key === savedKey && cache.revision() === savedRevision) return true;
  const revision = cache.revision();
  try {
    store.setItem(key, JSON.stringify(serialize()));
    savedKey = key;
    savedRevision = revision;
    return true;
  } catch {
    // Quota exceeded or storage disabled mid-session: the in-memory cache is
    // still authoritative, so a failed mirror is not an error condition.
    return false;
  }
}

/**
 * Replay a stored record through the ordinary bounded cache.set path so the
 * current limits, eviction, and metrics apply to restored data exactly as
 * they do to a network response. A malformed record is discarded whole.
 */
export function hydrate() {
  const store = storage();
  if (!store) return 0;
  let records;
  try {
    records = JSON.parse(store.getItem(storageKey()) || '[]');
  } catch {
    return 0;
  }
  if (!Array.isArray(records)) return 0;
  let restored = 0;
  for (const record of records) {
    if (!record || typeof record.key !== 'string' || typeof record.html !== 'string') continue;
    if (!cache.set(record.key, record.html, {
      etag: record.etag ?? null,
      lastModified: record.lastModified ?? null,
      cacheControl: record.cacheControl && typeof record.cacheControl === 'object' ? record.cacheControl : {},
    })) continue;
    // Restore the original age; cache.set stamps entries as new.
    const entry = cache.entry(record.key);
    if (entry && Number.isFinite(record.time)) entry.time = record.time;
    restored += 1;
  }
  return restored;
}

export function drop() {
  savedKey = null;
  savedRevision = -1;
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(storageKey());
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/**
 * Enable or disable the per-tab mirror. Enabling hydrates immediately and
 * writes back when the page is hidden or unloaded — the last points at which
 * a full-page navigation can still run script.
 */
export function configure(value) {
  if (value === undefined) return enabled;
  const next = value === true;
  if (next === enabled) return enabled;
  enabled = next;
  if (!enabled) {
    drop();
    return enabled;
  }
  hydrate();
  if (!installed && typeof document !== 'undefined') {
    installed = true;
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') save();
    });
  }
  return enabled;
}

export function isEnabled() {
  return enabled;
}
