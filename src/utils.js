import { scopedKey } from './scope.js';

const FORBIDDEN_VARY_HEADERS = new Set(['authorization', 'cookie']);

/** htmx instance the extension was registered with. */
export let hx = null;

export function setHtmx(instance) {
  hx = instance;
}

export function attr(elt, name) {
  return elt && elt.getAttribute ? elt.getAttribute(name) : null;
}

/**
 * Closest-ancestor attribute lookup mirroring htmx's inheritance rules for
 * hx-select: data-hx- fallback, "unset" termination, hx-disinherit blocking,
 * and hx-inherit allow-listing when htmx.config.disableInheritance is on.
 */
const readAttr = (node, attrName) => {
  const direct = node.getAttribute(attrName);
  return direct !== null ? direct : node.getAttribute(`data-${attrName}`);
};
const listsAttr = (value, name) => value === '*' || value.split(/\s+/).includes(name);

export function closestAttr(elt, name) {
  for (let node = elt; node && node.getAttribute; node = node.parentElement) {
    let value = readAttr(node, name);
    if (node !== elt) {
      if (hx?.config?.disableInheritance) {
        if (value !== null) {
          const inherit = readAttr(node, 'hx-inherit');
          if (!(inherit && listsAttr(inherit, name))) value = null;
        }
      } else {
        const disinherit = readAttr(node, 'hx-disinherit');
        if (disinherit && listsAttr(disinherit, name)) value = 'unset';
      }
    }
    if (value !== null) return value === 'unset' ? null : value;
  }
  return null;
}

export function isGet(evt) {
  const config = evt.detail.requestConfig;
  return !!config && config.verb === 'get';
}

/**
 * The element that issued the request. htmx's triggerEvent overwrites
 * detail.elt with whatever element the event is dispatched on (the target
 * for beforeSwap/afterSwap), so the stable handle is requestConfig.elt.
 */
export function requester(evt) {
  const config = evt.detail.requestConfig;
  return (config && config.elt) || evt.detail.elt;
}

// varyHeaders runs up to three times per request (key, allow-gate, response
// vary check) on the same attribute string, so the last parse is reused.
let lastVaryValue = null;
let lastVaryResult = [];

export function varyHeaders(elt) {
  const value = attr(elt, 'hx-swr-vary');
  if (!value) return [];
  if (value !== lastVaryValue) {
    lastVaryValue = value;
    lastVaryResult = [...new Set(value.split(',').map((header) => header.trim().toLowerCase()).filter(Boolean))];
  }
  return lastVaryResult;
}

export function cacheRequestAllowed(evt) {
  return !varyHeaders(requester(evt)).some((header) => FORBIDDEN_VARY_HEADERS.has(header));
}

function requestHeaderValue(headers, name) {
  const found = Object.entries(headers || {}).find(([header]) => header.toLowerCase() === name);
  return found ? String(found[1]) : '';
}

/** Cache key: explicit hx-swr-key wins, else verb + final URL. */
export function cacheKey(evt) {
  const d = evt.detail;
  const elt = requester(evt);
  const key = attr(elt, 'hx-swr-key') || `${d.requestConfig.verb}:${d.pathInfo.finalRequestPath}`;
  const vary = varyHeaders(elt)
    .map((header) => `${header}=${encodeURIComponent(requestHeaderValue(d.requestConfig.headers, header))}`)
    .join('&');
  return scopedKey(vary ? `${key}|vary:${vary}` : key);
}

export function requestSelect(evt) {
  if (!evt?.htmx4) return closestAttr(requester(evt), 'hx-select');
  const configured = evt.detail.requestConfig.select;
  if (configured) return configured;
  // htmx 4 makes inheritance explicit with the :inherited meta attribute.
  for (let node = requester(evt)?.parentElement; node?.getAttribute; node = node.parentElement) {
    const inherited = node.getAttribute('hx-select:inherited') ??
      node.getAttribute('data-hx-select:inherited');
    if (inherited !== null) {
      const value = node.getAttribute('hx-select') ?? inherited;
      return value === 'unset' ? null : value;
    }
  }
  return null;
}

/** Swap cached html into the event's target, honoring the requester's htmx attributes. */
export function swapCached(evt, html, alreadySelected = false) {
  const d = evt.detail;
  const elt = requester(evt);
  const target = d.target || d.elt;
  const swapAttr = evt?.htmx4 ? d.requestConfig.swap : attr(elt, 'hx-swap');
  const swapStyle = swapAttr ? swapAttr.split(' ')[0] : 'innerHTML';
  const select = alreadySelected ? null : requestSelect(evt);
  if (evt?.htmx4) {
    const context = {
      text: html,
      target,
      swap: swapStyle,
      select,
      sourceElement: elt,
      htmxQueryCachedSwap: true,
    };
    return hx.swap(context);
  }
  hx.swap(
    target,
    html,
    { swapStyle, swapDelay: 0, settleDelay: 0 },
    { select, contextElement: elt }
  );
}
