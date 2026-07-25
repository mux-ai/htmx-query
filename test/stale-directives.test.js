import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeNetwork, mount, tick } from './helpers.js';

let net;
beforeEach(() => {
  net = fakeNetwork();
});
afterEach(() => {
  net.restore();
  htmx.query.clear();
  document.body.innerHTML = '';
});

describe('stale-while-revalidate response directive', () => {
  it('serves stale HTML inside the window while revalidating', async () => {
    const el = mount('<div hx-get="/sw-inside" hx-trigger="load, refresh" hx-swr="0"></div>');
    await tick();
    net.respond(0, 200, '<li>v1</li>', { 'Cache-Control': 'max-age=0, stale-while-revalidate=60' });
    await tick();

    htmx.trigger(el, 'refresh');
    expect(el.innerHTML).toBe('<li>v1</li>'); // stale render allowed inside window
    await tick();
    expect(net.requests.length).toBe(2); // revalidation still fired
  });

  it('refuses a stale render beyond the window but still revalidates', async () => {
    const el = mount('<div hx-get="/sw-beyond" hx-trigger="load, refresh" hx-swr="0"></div>');
    await tick();
    net.respond(0, 200, '<li>v1</li>', { 'Cache-Control': 'max-age=0, stale-while-revalidate=0' });
    await tick();
    el.innerHTML = ''; // make any stale swap observable

    htmx.trigger(el, 'refresh');
    expect(el.innerHTML).toBe(''); // window exhausted -> no stale swap
    await tick();
    expect(net.requests.length).toBe(2);
    net.respond(1, 200, '<li>v2</li>', { 'Cache-Control': 'max-age=0, stale-while-revalidate=0' });
    await tick();
    expect(el.innerHTML).toBe('<li>v2</li>'); // network response still renders
  });

  it('without the directive stale serving stays unlimited (existing behavior)', async () => {
    const el = mount('<div hx-get="/sw-none" hx-trigger="load, refresh" hx-swr="0"></div>');
    await tick();
    net.respond(0, 200, '<li>v1</li>');
    await tick();
    el.innerHTML = '';
    htmx.trigger(el, 'refresh');
    expect(el.innerHTML).toBe('<li>v1</li>');
  });
});

describe('stale-if-error response directive', () => {
  it('suppresses hq:staleError while the error window covers the entry', async () => {
    let staleError = null;
    document.body.addEventListener('hq:staleError', (e) => (staleError = e.detail));
    const el = mount('<div hx-get="/sie-inside" hx-trigger="load, refresh" hx-swr="0"></div>');
    await tick();
    net.respond(0, 200, '<li>v1</li>', { 'Cache-Control': 'max-age=0, stale-if-error=60' });
    await tick();

    htmx.trigger(el, 'refresh'); // stale render + revalidation
    await tick();
    net.respond(1, 500, 'boom');
    await tick();
    expect(staleError).toBeNull(); // origin allows stale on error
    expect(el.innerHTML).toBe('<li>v1</li>'); // stale HTML stands
  });

  it('emits hq:staleError when no window covers the failure', async () => {
    let staleError = null;
    document.body.addEventListener('hq:staleError', (e) => (staleError = e.detail));
    const el = mount('<div hx-get="/sie-none" hx-trigger="load, refresh" hx-swr="0"></div>');
    await tick();
    net.respond(0, 200, '<li>v1</li>');
    await tick();

    htmx.trigger(el, 'refresh');
    await tick();
    net.respond(1, 500, 'boom');
    await tick();
    expect(staleError).toMatchObject({ key: 'get:/sie-none', status: 500 });
  });
});
