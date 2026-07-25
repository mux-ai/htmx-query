import { attr, requester } from './utils.js';

/** requesting element -> inserted optimistic nodes */
const inserted = new WeakMap();

/** beforeRequest: render the hx-optimistic template into the target now. */
export function apply(evt) {
  const d = evt.detail;
  const elt = requester(evt);
  const selector = attr(elt, 'hx-optimistic');
  if (!selector) return;
  const template = document.querySelector(selector);
  if (!template) return;
  const target = d.target || elt;
  const fragment = template.content
    ? template.content.cloneNode(true)
    : document.createRange().createContextualFragment(template.innerHTML);
  const nodes = [...fragment.childNodes];
  target.append(fragment);
  inserted.set(elt, nodes);
}

/**
 * Restore the pre-optimistic DOM. Runs on beforeSwap (so the real response
 * lands on a clean target) and on request errors. Idempotent.
 */
export function revert(evt) {
  const elt = requester(evt);
  const nodes = inserted.get(elt);
  if (!nodes) return;
  for (const node of nodes) node.remove();
  inserted.delete(elt);
}
