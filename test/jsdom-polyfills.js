// jsdom's legacy XPath impl requires an explicit result type argument;
// htmx calls XPathExpression.evaluate(node) per spec, where type defaults
// to ANY_TYPE (0). Default it here so htmx's hx-on scan works under jsdom.
const proto = window.XPathExpression && window.XPathExpression.prototype;
if (proto) {
  const original = proto.evaluate;
  proto.evaluate = function (contextNode, type, result) {
    return original.call(this, contextNode, type ?? 0, result ?? null);
  };
}

// jsdom has no IntersectionObserver and never lays elements out, so viewport
// entry cannot happen on its own. This records what the extension observes and
// lets a test drive intersection explicitly via window.__intersect(element).
if (!window.IntersectionObserver) {
  const observers = new Set();
  window.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
      this.elements = new Set();
      observers.add(this);
    }
    observe(element) {
      this.elements.add(element);
    }
    unobserve(element) {
      this.elements.delete(element);
    }
    disconnect() {
      this.elements.clear();
      observers.delete(this);
    }
  };
  window.__intersect = (element) => {
    for (const observer of observers) {
      if (observer.elements.has(element)) {
        observer.callback([{ target: element, isIntersecting: true }], observer);
      }
    }
  };
  window.__observedCount = (element) =>
    [...observers].filter((observer) => observer.elements.has(element)).length;
}

// jsdom has no CSS.escape; htmx needs it for hx-swap-oob id selectors.
// Escaping every non-alphanumeric char is stricter than the spec but safe.
if (!window.CSS) window.CSS = {};
if (!window.CSS.escape) {
  window.CSS.escape = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}
