import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeNetwork, mount, tick } from './helpers.js';

const hide = () => window.dispatchEvent(new window.Event('pagehide'));

let net;
beforeEach(() => {
  net = fakeNetwork();
  sessionStorage.clear();
});
afterEach(() => {
  net.restore();
  htmx.query.configure({ persist: false });
  htmx.query.setNamespace('');
  htmx.query.clear();
  sessionStorage.clear();
  document.body.innerHTML = '';
});

describe('opt-in session persistence', () => {
  it('is off by default and reports its state through configure', () => {
    expect(htmx.query.configure().persist).toBe(false);
    expect(htmx.query.configure({ persist: true }).persist).toBe(true);
    expect(htmx.query.configure().persist).toBe(true);
    expect(htmx.query.configure({ persist: false }).persist).toBe(false);
  });

  it('mirrors cached entries into sessionStorage when the page is hidden', async () => {
    htmx.query.configure({ persist: true });
    mount('<div hx-get="/todos" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>persisted</li>', { ETag: '"v1"' });
    await tick();

    hide();
    const stored = JSON.parse(sessionStorage.getItem('htmx-query::'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ key: 'get:/todos', html: '<li>persisted</li>', etag: '"v1"' });
  });

  it('restores a persisted entry and serves it without a network request', async () => {
    htmx.query.configure({ persist: true });
    mount('<div hx-get="/todos" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>persisted</li>');
    await tick();
    hide();

    // Simulate a full-page navigation: memory is gone, sessionStorage is not.
    htmx.query.configure({ persist: false });
    sessionStorage.setItem('htmx-query::', JSON.stringify([
      { key: 'get:/todos', html: '<li>persisted</li>', time: Date.now(), etag: null, lastModified: null, cacheControl: {} },
    ]));
    document.body.innerHTML = '';
    htmx.query.configure({ persist: true });

    expect(htmx.query.peek().get('get:/todos')?.html).toBe('<li>persisted</li>');
    const before = net.requests.length;
    const elt = mount('<div hx-get="/todos" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    expect(net.requests).toHaveLength(before); // restored entry is fresh; nothing flies
    expect(elt.innerHTML).toBe('<li>persisted</li>');
  });

  it('preserves the original entry age so a restored stale entry revalidates', async () => {
    sessionStorage.setItem('htmx-query::', JSON.stringify([
      { key: 'get:/todos', html: '<li>old</li>', time: Date.now() - 600_000, cacheControl: {} },
    ]));
    htmx.query.configure({ persist: true });

    const elt = mount('<div hx-get="/todos" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    expect(elt.innerHTML).toBe('<li>old</li>'); // stale render
    expect(net.requests).toHaveLength(1); // ...followed by revalidation
    net.respond(0, 200, '<li>new</li>'); // settle it so dedupe state does not leak
    await tick();
  });

  it('discards a malformed record instead of repairing it', () => {
    sessionStorage.setItem('htmx-query::', '{not json');
    htmx.query.configure({ persist: true });
    expect(htmx.query.peek().size).toBe(0);

    htmx.query.configure({ persist: false });
    sessionStorage.setItem('htmx-query::', JSON.stringify([{ key: 5 }, null, { html: '<li>x</li>' }]));
    htmx.query.configure({ persist: true });
    expect(htmx.query.peek().size).toBe(0);
  });

  it('scopes the record per namespace and drops the outgoing one on an account switch', async () => {
    htmx.query.configure({ persist: true });
    htmx.query.setNamespace('alice');
    mount('<div hx-get="/todos" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>alice</li>');
    await tick();
    hide();
    expect(sessionStorage.getItem('htmx-query::alice')).toContain('alice');

    htmx.query.setNamespace('bob');
    expect(sessionStorage.getItem('htmx-query::alice')).toBeNull();
    expect(htmx.query.peek().size).toBe(0);
  });

  it('clears the persisted record when the cache is cleared', async () => {
    htmx.query.configure({ persist: true });
    mount('<div hx-get="/todos" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>persisted</li>');
    await tick();
    hide();

    htmx.query.clear();
    expect(sessionStorage.getItem('htmx-query::')).toBeNull();
  });

  it('applies current cache limits to restored entries', () => {
    const records = Array.from({ length: 5 }, (unused, index) => ({
      key: `get:/item/${index}`,
      html: `<li>${index}</li>`,
      time: Date.now(),
      cacheControl: {},
    }));
    sessionStorage.setItem('htmx-query::', JSON.stringify(records));
    htmx.query.configure({ cache: { maxEntries: 2 } });
    htmx.query.configure({ persist: true });

    expect(htmx.query.peek().size).toBe(2);
    htmx.query.configure({ cache: { maxEntries: 100 } });
  });
});
