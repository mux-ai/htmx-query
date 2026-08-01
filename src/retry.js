import { attr, hx, isGet, requester } from './utils.js';

const attempts = new WeakMap();
const timers = new WeakMap();
const retryingXhrs = new WeakSet();
const requestContexts = new WeakMap();
const retryEvents = new WeakSet();
const MAX_BACKOFF_FACTOR = 10;
const MAX_RETRIES = 10;
const DEFAULT_RETRY_DELAY_MS = 1000;
export const MAX_RETRY_DELAY_MS = 30_000;

function requestContext(evt) {
  const d = evt.detail;
  const config = d.requestConfig;
  const elt = requester(evt);
  const verb = config.verb;
  const path = d.pathInfo.finalRequestPath;
  return { elt, verb, path, target: d.target, key: `${verb}:${path}` };
}

function attemptsFor(elt) {
  let values = attempts.get(elt);
  if (!values) {
    values = new Map();
    attempts.set(elt, values);
  }
  return values;
}

/** Capture the original target before an error response can apply HX-Retarget. */
export function prepare(evt) {
  const xhr = evt.detail.xhr;
  if (!xhr) return;
  requestContexts.set(xhr, requestContext(evt));
  if (retryEvents.has(evt.detail.requestConfig.triggeringEvent)) retryingXhrs.add(xhr);
}

/** True only for the XHR created by a scheduled retry, not other element traffic. */
export function isRetrying(evt) {
  return retryingXhrs.has(evt.detail.xhr);
}

function clearTimer(elt, key) {
  const pending = timers.get(elt);
  if (!pending) return;
  const id = pending.get(key);
  if (id === undefined) return;
  clearTimeout(id);
  pending.delete(key);
  if (pending.size === 0) timers.delete(elt);
}

export function reset(evt) {
  const context = requestContexts.get(evt.detail.xhr) || requestContext(evt);
  // A success makes any still-pending retry for the same request moot.
  clearTimer(context.elt, context.key);
  const values = attempts.get(context.elt);
  if (!values) return;
  values.delete(context.key);
  if (values.size === 0) attempts.delete(context.elt);
}

function retryAfterMs(xhr) {
  try {
    const header = xhr && xhr.getResponseHeader && xhr.getResponseHeader('Retry-After');
    if (!header) return null;
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
    const date = Date.parse(header);
    return Number.isFinite(date) && date > Date.now() ? date - Date.now() : null;
  } catch {
    return null;
  }
}

export function retryDelay(elt, xhr, attempt) {
  const configured = Number(attr(elt, 'hx-retry-delay') || DEFAULT_RETRY_DELAY_MS);
  const base = Number.isFinite(configured) && configured > 0
    ? Math.min(configured, MAX_RETRY_DELAY_MS)
    : DEFAULT_RETRY_DELAY_MS;
  const computed = Math.min(base * 2 ** (attempt - 1), base * MAX_BACKOFF_FACTOR, MAX_RETRY_DELAY_MS);
  const ceiling = Math.min(retryAfterMs(xhr) ?? computed, MAX_RETRY_DELAY_MS);
  return Math.round(ceiling * (0.5 + Math.random() * 0.5));
}

/**
 * Error events: schedule a reissue with exponential backoff.
 * Non-idempotent verbs are never retried unless hx-retry-unsafe is set.
 */
export function maybeRetry(evt) {
  const d = evt.detail;
  const context = requestContexts.get(d.xhr) || requestContext(evt);
  const { elt } = context;
  const max = Math.min(Number(attr(elt, 'hx-retry') || 0), MAX_RETRIES);
  if (!max) return;
  if (!isGet(evt) && attr(elt, 'hx-retry-unsafe') === null) return;

  const values = attemptsFor(elt);
  const n = (values.get(context.key) || 0) + 1;
  if (n > max) {
    values.delete(context.key);
    if (values.size === 0) attempts.delete(elt);
    elt.dispatchEvent(new CustomEvent('hq:retryExhausted', { bubbles: true }));
    return;
  }
  values.set(context.key, n);

  const delay = retryDelay(elt, d.xhr, n);
  clearTimer(elt, context.key);
  let pending = timers.get(elt);
  if (!pending) {
    pending = new Map();
    timers.set(elt, pending);
  }
  pending.set(context.key, setTimeout(() => {
    clearTimer(elt, context.key);
    if (!document.contains(elt)) {
      values.delete(context.key);
      if (values.size === 0) attempts.delete(elt);
      return;
    }
    const event = new CustomEvent('htmx-query:retry');
    retryEvents.add(event);
    hx.ajax(context.verb, context.path, { source: elt, target: context.target, event });
  }, delay));
}
