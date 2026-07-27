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

describe('hx-swr-prefetch', () => {
  it('caches an explicitly opted-in same-origin hover request without swapping the source', async () => {
    const el = mount('<a hx-get="/hover" hx-swr="60" hx-swr-prefetch="hover">Open</a>');
    const events = [];
    document.body.addEventListener('hq:prefetch', (event) => events.push(event.detail));
    el.dispatchEvent(new window.Event('pointerenter', { bubbles: true }));
    await tick();
    expect(net.requests).toHaveLength(1);
    net.respond(0, 200, '<li>prefetched</li>');
    await tick();

    expect(htmx.query.peek().get('get:/hover')?.html).toBe('<li>prefetched</li>');
    expect(el.innerHTML).toBe('Open');
    expect(events).toEqual([{ action: 'success', path: '/hover' }]);
  });

  it('does nothing until prefetch is explicitly enabled', async () => {
    const el = mount('<a hx-get="/plain" hx-swr="60">Open</a>');
    el.dispatchEvent(new window.Event('pointerenter', { bubbles: true }));
    await tick();
    expect(net.requests).toHaveLength(0);
  });

  it('announces an explicit prefetch that is skipped for missing hx-swr', async () => {
    const el = mount('<a hx-get="/no-cache" hx-swr-prefetch="hover">Open</a>');
    const events = [];
    document.body.addEventListener('hq:prefetch', (event) => events.push(event.detail));
    el.dispatchEvent(new window.Event('pointerenter', { bubbles: true }));
    await tick();
    expect(net.requests).toHaveLength(0);
    expect(events).toEqual([{ action: 'skip', reason: 'missing-swr', path: '/no-cache' }]);
  });
  it('prefetches once when an opted-in element scrolls into the viewport', async () => {
    const el = mount('<a hx-get="/visible" hx-swr="60" hx-swr-prefetch="visible">Open</a>');
    const events = [];
    document.body.addEventListener('hq:prefetch', (event) => events.push(event.detail));

    window.__intersect(el);
    await tick();
    expect(net.requests).toHaveLength(1);
    net.respond(0, 200, '<li>prefetched</li>');
    await tick();

    expect(htmx.query.peek().get('get:/visible')?.html).toBe('<li>prefetched</li>');
    expect(el.innerHTML).toBe('Open'); // never renders into the source element
    expect(events.map(({ action }) => action)).toEqual(['success']);

    window.__intersect(el);
    await tick();
    expect(net.requests).toHaveLength(1); // unobserved after one attempt
  });

  it('does not observe elements that did not opt into the visible trigger', () => {
    const el = mount('<a hx-get="/hover-only" hx-swr="60" hx-swr-prefetch="hover">Open</a>');
    expect(window.__observedCount(el)).toBe(0);
  });
  it('observes visible opt-ins that arrive in swapped-in content', async () => {
    mount('<div hx-get="/page" hx-trigger="load"></div>');
    await tick();
    net.respond(0, 200, '<a id="later" hx-get="/later" hx-swr="60" hx-swr-prefetch="visible">Later</a>');
    await tick();

    const later = document.querySelector('#later');
    expect(window.__observedCount(later)).toBe(1);
    window.__intersect(later);
    await tick();
    expect(net.requests).toHaveLength(2);
  });
});
