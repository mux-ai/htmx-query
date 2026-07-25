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

// jsdom has no CSS.escape; htmx needs it for hx-swap-oob id selectors.
// Escaping every non-alphanumeric char is stricter than the spec but safe.
if (!window.CSS) window.CSS = {};
if (!window.CSS.escape) {
  window.CSS.escape = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}
