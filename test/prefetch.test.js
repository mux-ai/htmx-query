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
});

describe('hx-swr-prefetch="focus"', () => {
  it('prefetches on keyboard focus when opted in', async () => {
    const el = mount('<a href="/k" hx-get="/kbd" hx-swr="60" hx-swr-prefetch="hover focus">Open</a>');
    el.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
    await tick();
    expect(net.requests).toHaveLength(1);
    net.respond(0, 200, '<li>kbd</li>');
    await tick();
    expect(htmx.query.peek().get('get:/kbd')?.html).toBe('<li>kbd</li>');
    expect(el.innerHTML).toBe('Open');
  });

  it('hover-only opt-in ignores focus', async () => {
    const el = mount('<a href="/h" hx-get="/hov" hx-swr="60" hx-swr-prefetch="hover">Open</a>');
    el.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
    await tick();
    expect(net.requests).toHaveLength(0);
  });
});
