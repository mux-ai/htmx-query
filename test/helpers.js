import nise from 'nise';

/**
 * Replace XMLHttpRequest with nise's fake; returns request log + helpers.
 * Only SENT requests are logged: htmx constructs and opens the XHR before
 * htmx:beforeRequest fires, so cancelled requests still hit onCreate.
 */
export function fakeNetwork() {
  const xhr = nise.fakeXhr.useFakeXMLHttpRequest();
  const requests = [];
  xhr.onCreate = (request) => {
    const originalSend = request.send.bind(request);
    request.send = (body) => {
      requests.push(request);
      originalSend(body);
    };
  };
  globalThis.XMLHttpRequest = xhr;
  return {
    requests,
    respond(index, status, body, headers = {}) {
      requests[index].respond(status, { 'Content-Type': 'text/html', ...headers }, body);
    },
    restore() {
      xhr.restore();
    },
  };
}

/** Mount markup under a body scoped to the query extension and process it. */
export function mount(html) {
  document.body.setAttribute('hx-ext', 'query');
  document.body.innerHTML = html;
  htmx.process(document.body);
  return document.body.firstElementChild;
}

export const tick = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));
