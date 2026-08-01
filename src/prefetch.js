import { attr } from './utils.js';
import { isHtmx4 } from './htmx-adapter.js';

const requests = new WeakSet();
const reported = new WeakSet();
const attempted = new WeakSet();
let installed = false;
let visibleObserver = null;

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

/** hx-swr-prefetch is a token list: "hover", "focus", "visible", or any mix. */
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
 * Watch opted-in elements for viewport entry. One shared observer; an element
 * is unobserved as soon as it is attempted, so re-scrolling past it is free.
 * Without IntersectionObserver the "visible" token is simply inert — a lazy
 * trigger must never degrade into an eager fetch.
 */
function observeVisible(root) {
  if (!visibleObserver) return;
  // htmx:load fires on the processed element itself, which querySelectorAll
  // would not return, so the root is considered alongside its descendants.
  const candidates = [...(root.querySelectorAll?.('[hx-swr-prefetch]') || [])];
  if (root.matches?.('[hx-swr-prefetch]')) candidates.push(root);
  for (const elt of candidates) {
    if (prefetchTriggers(elt).has('visible') && !attempted.has(elt)) visibleObserver.observe(elt);
  }
}

/**
 * Install the explicit, same-origin `hx-swr-prefetch` opt-in.
 * "hover" covers pointer users, "focus" keyboard users, "visible" scrolling.
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

  if (typeof IntersectionObserver === 'function') {
    visibleObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          // Removal from the DOM reports as a non-intersection; release the
          // element instead of observing it forever.
          if (!entry.target.isConnected) visibleObserver.unobserve(entry.target);
          continue;
        }
        visibleObserver.unobserve(entry.target);
        prefetch(htmx, entry.target, 'visible');
      }
    });
  }
  // The process-complete event covers htmx.process on existing markup and
  // every later swap, so new opt-ins are picked up without a MutationObserver.
  // The initial sweep covers content htmx processed before registration.
  const processEvent = isHtmx4(htmx) ? 'htmx:after:process' : 'htmx:afterProcessNode';
  document.addEventListener(processEvent, (event) => observeVisible(event.target));
  observeVisible(document);
}

/** Mark request configs before the extension handles the associated lifecycle event. */
export function observePrefetch(evt) {
  if (evt.detail.requestConfig?.triggeringEvent?.type === 'htmx-query:prefetch') {
    requests.add(evt.detail.requestConfig);
    return true;
  }
  return false;
}
