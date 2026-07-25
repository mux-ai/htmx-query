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
export function closestAttr(elt, name) {
  const read = (node, attrName) => {
    const direct = node.getAttribute(attrName);
    return direct !== null ? direct : node.getAttribute(`data-${attrName}`);
  };
  const listed = (value) => value === '*' || value.split(/\s+/).includes(name);
  for (let node = elt; node && node.getAttribute; node = node.parentElement) {
    let value = read(node, name);
    if (node !== elt) {
      if (hx?.config?.disableInheritance) {
        const inherit = read(node, 'hx-inherit');
        if (!(inherit && listed(inherit))) value = null;
      } else {
        const disinherit = read(node, 'hx-disinherit');
        if (disinherit && listed(disinherit)) value = 'unset';
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

export function varyHeaders(elt) {
  const value = attr(elt, 'hx-swr-vary');
  if (!value) return [];
  return [...new Set(value.split(',').map((header) => header.trim().toLowerCase()).filter(Boolean))];
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

/** Swap cached html into the event's target, honoring the requester's htmx attributes. */
export function swapCached(evt, html, alreadySelected = false) {
  const d = evt.detail;
  const elt = requester(evt);
  const target = d.target || d.elt;
  const swapAttr = attr(elt, 'hx-swap');
  const swapStyle = swapAttr ? swapAttr.split(' ')[0] : 'innerHTML';
  hx.swap(
    target,
    html,
    { swapStyle, swapDelay: 0, settleDelay: 0 },
    { select: alreadySelected ? null : closestAttr(elt, 'hx-select'), contextElement: elt }
  );
}
