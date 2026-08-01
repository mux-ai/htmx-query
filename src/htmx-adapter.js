const contexts = new WeakMap();
const requestStates = new WeakMap();

export function isHtmx4(htmx) {
  const major = Number.parseInt(String(htmx?.version || '').split('.')[0], 10);
  return major === 4 || (!htmx?.defineExtension && typeof htmx?.registerExtension === 'function');
}

function responseHeader(ctx, name) {
  try {
    return ctx.response?.headers?.get(name) || null;
  } catch {
    return null;
  }
}

function transportFor(ctx) {
  return {
    get status() {
      return ctx.response?.status || 0;
    },
    getResponseHeader(name) {
      return responseHeader(ctx, name);
    },
    setRequestHeader(name, value) {
      ctx.request.headers[name] = String(value);
    },
  };
}

function eventFor(elt, detail) {
  const ctx = detail?.ctx;
  if (!ctx) return null;
  let event = contexts.get(ctx);
  if (event) return event;

  const requestSwap = ctx.swap;
  const requestConfig = {};
  Object.defineProperties(requestConfig, {
    verb: { get: () => String(ctx.request?.method || '').toLowerCase() },
    elt: { get: () => ctx.sourceElement || elt },
    headers: { get: () => ctx.request?.headers || {} },
    triggeringEvent: { get: () => ctx.sourceEvent || null },
    select: { get: () => ctx.select || null },
    swap: { get: () => requestSwap || null },
  });

  const pathInfo = {};
  Object.defineProperty(pathInfo, 'finalRequestPath', {
    get: () => ctx.request?.action || '',
  });

  const normalized = {
    requestConfig,
    pathInfo,
    xhr: transportFor(ctx),
    get elt() {
      return ctx.sourceElement || elt;
    },
    get target() {
      return ctx.target || ctx.sourceElement || elt;
    },
    get serverResponse() {
      return ctx.text || '';
    },
    get successful() {
      const status = ctx.response?.status || 0;
      return status >= 200 && status < 400;
    },
    get isError() {
      return (ctx.response?.status || 0) >= 400;
    },
  };

  event = {
    detail: normalized,
    htmx4: true,
    context: ctx,
  };
  contexts.set(ctx, event);
  return event;
}

function stateFor(ctx) {
  let state = requestStates.get(ctx);
  if (!state) {
    state = { timeout: 0, timer: null, timedOut: false, failed: false };
    requestStates.set(ctx, state);
  }
  return state;
}

function parseTimeout(htmx, value) {
  if (value == null) value = htmx.config?.defaultTimeout;
  const parsed = typeof htmx.parseInterval === 'function' ? htmx.parseInterval(value) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function configureRequest(htmx, detail) {
  const ctx = detail?.ctx;
  if (!ctx?.request) return;
  const state = stateFor(ctx);
  state.timeout = parseTimeout(htmx, ctx.request.timeout);
  // htmx 4 turns timeouts into an undifferentiated AbortError. Own the timer
  // so retry logic can distinguish a timeout from an intentional abort.
  ctx.request.timeout = 0;
}

function startTimeout(detail) {
  const ctx = detail?.ctx;
  if (!ctx) return;
  const state = stateFor(ctx);
  if (!state.timeout) return;
  state.timer = setTimeout(() => {
    state.timedOut = true;
    ctx.request?.abort?.();
  }, state.timeout);
}

function finishRequest(detail) {
  const ctx = detail?.ctx;
  if (!ctx) return;
  const state = requestStates.get(ctx);
  if (state?.timer) window.clearTimeout(state.timer);
}

function isAbort(detail) {
  const ctx = detail?.ctx;
  const state = ctx && requestStates.get(ctx);
  if (state?.timedOut) return false;
  return ctx?.request?.signal?.aborted || detail?.error?.name === 'AbortError';
}

function failOnce(detail) {
  const ctx = detail?.ctx;
  if (!ctx) return false;
  const state = stateFor(ctx);
  if (state.failed) return false;
  state.failed = true;
  return true;
}

export function isInternalSwap(evt) {
  return evt?.htmx4 === true && evt.context?.htmxQueryCachedSwap === true;
}

export function observeTransportFailure(evt, fail) {
  if (evt?.htmx4) return;
  const xhr = evt?.detail?.xhr;
  if (!xhr || xhr.__htmxQueryDedupeObserved) return;
  xhr.__htmxQueryDedupeObserved = true;
  xhr.addEventListener('error', fail, { once: true });
  xhr.addEventListener('abort', fail, { once: true });
  xhr.addEventListener('timeout', fail, { once: true });
}

export function registerHtmxExtension(htmx, handlers) {
  if (!isHtmx4(htmx)) {
    htmx.defineExtension('query', {
      onEvent(name, evt) {
        switch (name) {
          case 'htmx:beforeRequest':
            return handlers.beforeRequest(evt);
          case 'htmx:beforeSwap': {
            const shouldSwap = handlers.beforeSwap(evt);
            if (shouldSwap === false) {
              evt.detail.shouldSwap = false;
              if (evt.detail.xhr?.status === 304) evt.detail.isError = false;
            }
            return true;
          }
          case 'htmx:afterSwap':
            handlers.afterSwap(evt);
            break;
          case 'htmx:afterRequest':
            handlers.afterRequest(evt);
            break;
          case 'htmx:responseError':
          case 'htmx:sendError':
          case 'htmx:timeout':
            handlers.error(evt);
            break;
          case 'htmx:sendAbort':
            handlers.abort(evt);
            break;
        }
        return true;
      },
    });
    return;
  }

  htmx.registerExtension('query', {
    htmx_config_request(_elt, detail) {
      configureRequest(htmx, detail);
    },
    htmx_before_request(elt, detail) {
      startTimeout(detail);
      const evt = eventFor(elt, detail);
      return evt ? handlers.beforeRequest(evt) : true;
    },
    htmx_before_swap(elt, detail) {
      const evt = eventFor(elt, detail);
      if (!evt || isInternalSwap(evt)) return true;
      return handlers.beforeSwap(evt);
    },
    htmx_after_swap(elt, detail) {
      const evt = eventFor(elt, detail);
      if (evt && !isInternalSwap(evt)) handlers.afterSwap(evt);
    },
    htmx_response_error(elt, detail) {
      const evt = eventFor(elt, detail);
      if (evt && failOnce(detail)) handlers.error(evt);
    },
    htmx_error(elt, detail) {
      const evt = eventFor(elt, detail);
      if (!evt || !failOnce(detail)) return;
      if (isAbort(detail)) handlers.abort(evt);
      else handlers.error(evt);
    },
    htmx_finally_request(elt, detail) {
      finishRequest(detail);
      const evt = eventFor(elt, detail);
      const status = detail?.ctx?.response?.status || 0;
      if (evt && status > 0 && status < 400) handlers.afterRequest(evt);
    },
  });
}
