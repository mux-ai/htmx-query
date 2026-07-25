import { attr } from './utils.js';

const requests = new WeakSet();
const reported = new WeakSet();
const attempted = new WeakSet();
let installed = false;

export const isPrefetch = (evt) => requests.has(evt.detail.requestConfig);

/** Emit a prefetch lifecycle event: success, error, or skip (with reason). */
export function announce(action, detail = {}) {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.dispatchEvent(
    new CustomEvent('hq:prefetch', { detail: { action, ...detail }, bubbles: true })
  );
}

/** Report the outcome of a completed prefetch request from lifecycle events. */
export function report(evt, outcome) {
  const config = evt.detail.requestConfig;
  if (!isPrefetch(evt) || !config || reported.has(config)) return false;
  reported.add(config);
  announce(outcome || (evt.detail.successful === true ? 'success' : 'error'), {
    path: evt.detail.pathInfo?.finalRequestPath,
  });
  return true;
}

/** hx-swr-prefetch is a token list: "hover", "focus", or both. */
function prefetchTriggers(elt) {
  return new Set((attr(elt, 'hx-swr-prefetch') || '').split(/[\s,]+/).filter(Boolean));
}

/**
 * Why a prefetch may not run. "untriggered" and "attempted" are normal
 * control flow and stay silent; the rest emit an hq:prefetch skip event.
 */
function blockReason(elt, trigger) {
  if (!prefetchTriggers(elt).has(trigger)) return 'untriggered';
  if (attr(elt, 'hx-swr') === null || !attr(elt, 'hx-get')) return 'missing-swr';
  if (attempted.has(elt)) return 'attempted';
  if (navigator.connection?.saveData) return 'save-data';
  try {
    if (new URL(attr(elt, 'hx-get'), window.location.href).origin !== window.location.origin) {
      return 'cross-origin';
    }
  } catch {
    return 'cross-origin';
  }
  return null;
}

function prefetch(htmx, elt, trigger) {
  const reason = blockReason(elt, trigger);
  if (reason) {
    if (reason !== 'untriggered' && reason !== 'attempted') {
      announce('skip', { reason, path: attr(elt, 'hx-get') });
    }
    return;
  }
  attempted.add(elt);
  const event = new CustomEvent('htmx-query:prefetch');
  htmx.ajax('GET', attr(elt, 'hx-get'), { source: elt, target: elt, event })
    .catch(() => {}); // A prefetch is intentionally best-effort.
}

/**
 * Install the explicit, same-origin `hx-swr-prefetch` opt-in.
 * "hover" covers pointer users; "focus" covers keyboard users.
 */
export function installPrefetch(htmx) {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const handle = (trigger) => (event) => {
    const elt = event.target.closest?.('[hx-swr-prefetch]');
    if (elt) prefetch(htmx, elt, trigger);
  };
  document.addEventListener('pointerenter', handle('hover'), true);
  document.addEventListener('focusin', handle('focus'), true);
}

/** Mark request configs before the extension handles the associated lifecycle event. */
export function observePrefetch(evt) {
  if (evt.detail.requestConfig?.triggeringEvent?.type === 'htmx-query:prefetch') {
    requests.add(evt.detail.requestConfig);
    return true;
  }
  return false;
}
