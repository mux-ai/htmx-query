import nise from 'nise';

function fakeFetchNetwork() {
  const requests = [];
  const originalFetch = window.fetch;
  window.fetch = (url, options = {}) => new Promise((resolve, reject) => {
    const request = {
      url: String(url),
      method: options.method,
      requestHeaders: { ...(options.headers || {}) },
      requestBody: options.body,
      respond(status, headers, body) {
        const entries = Object.entries(headers || {});
        resolve({
          status,
          headers: {
            get(name) {
              const found = entries.find(([key]) => key.toLowerCase() === String(name).toLowerCase());
              return found ? String(found[1]) : null;
            },
            [Symbol.iterator]() {
              return entries[Symbol.iterator]();
            },
          },
          text: async () => body,
        });
      },
      error() {
        reject(new TypeError('Network request failed'));
      },
    };
    requests.push(request);
    options.signal?.addEventListener('abort', () => {
      reject(new window.DOMException('The operation was aborted', 'AbortError'));
    }, { once: true });
  });
  return {
    requests,
    respond(index, status, body, headers = {}) {
      requests[index].respond(status, { 'Content-Type': 'text/html', ...headers }, body);
    },
    restore() {
      window.fetch = originalFetch;
    },
  };
}

/**
 * Replace htmx's active transport with a fake; returns request log + helpers.
 * htmx 2 uses the existing nise XHR fake; htmx 4 uses the dependency-free
 * Promise/Fetch fake above.
 */
export function fakeNetwork() {
  if (String(globalThis.htmx?.version || '').startsWith('4.')) return fakeFetchNetwork();
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
  if (String(htmx.version || '').startsWith('4.')) document.body.removeAttribute('hx-ext');
  else document.body.setAttribute('hx-ext', 'query');
  document.body.innerHTML = html;
  htmx.process(document.body);
  return document.body.firstElementChild;
}

export const tick = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));
