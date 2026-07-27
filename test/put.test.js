import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeNetwork, mount, tick } from './helpers.js';

let net;
beforeEach(() => {
  net = fakeNetwork();
});
afterEach(() => {
  net.restore();
  htmx.query.setNamespace('');
  htmx.query.clear();
  document.body.innerHTML = '';
});

describe('manual cache seeding', () => {
  it('serves a seeded entry without a network request', async () => {
    expect(htmx.query.put('todos', '<li>seeded</li>')).toBe(true);
    const elt = mount('<div hx-get="/todos" hx-swr-key="todos" hx-trigger="load" hx-swr="60"></div>');
    await tick();

    expect(net.requests.length).toBe(0);
    expect(elt.innerHTML).toBe('<li>seeded</li>');
  });

  it('seeds the implicit verb-and-path key form', async () => {
    htmx.query.put('get:/todos', '<li>seeded</li>');
    const elt = mount('<div hx-get="/todos" hx-trigger="load" hx-swr="60"></div>');
    await tick();

    expect(net.requests.length).toBe(0);
    expect(elt.innerHTML).toBe('<li>seeded</li>');
  });

  it('scopes seeded keys to the active namespace', () => {
    htmx.query.setNamespace('alice');
    htmx.query.put('todos', '<li>alice</li>');
    expect([...htmx.query.peek().keys()]).toEqual(['alice::todos']);
  });

  it('treats ttl as an origin max-age so a zero-ttl seed renders stale and revalidates', async () => {
    htmx.query.put('get:/todos', '<li>stale seed</li>', { ttl: 0 });
    const elt = mount('<div hx-get="/todos" hx-trigger="load" hx-swr="60"></div>');
    await tick();

    expect(elt.innerHTML).toBe('<li>stale seed</li>');
    expect(net.requests.length).toBe(1);
    net.respond(0, 200, '<li>fresh</li>');
    await tick();
    expect(elt.innerHTML).toBe('<li>fresh</li>');
  });

  it('rejects empty and non-string input', () => {
    expect(htmx.query.put('', '<li>x</li>')).toBe(false);
    expect(htmx.query.put('todos', '')).toBe(false);
    expect(htmx.query.put('todos', null)).toBe(false);
    expect(htmx.query.put(null, '<li>x</li>')).toBe(false);
  });
});
