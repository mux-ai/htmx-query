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

/** Entries in peek() are live references; backdating simulates cache age. */
const backdate = (key, seconds) => {
  const entry = htmx.query.peek().get(key);
  entry.time -= seconds * 1000;
};

describe('304 after a refused stale render', () => {
  it('renders the validated cached entry instead of leaving the target empty', async () => {
    mount('<div id="a" hx-get="/nc" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>validated</li>', {
      'Cache-Control': 'no-cache',
      ETag: '"nc-v1"',
    });
    await tick();

    // Fresh element, same key: no-cache refuses the render before validation.
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="b" hx-get="/nc" hx-trigger="go" hx-swr="60"></div>'
    );
    const b = document.querySelector('#b');
    htmx.process(b);
    htmx.trigger(b, 'go');
    await tick();
    expect(net.requests[1].requestHeaders['If-None-Match']).toBe('"nc-v1"');
    net.respond(1, 304, '', { ETag: '"nc-v1"' });
    await tick();
    expect(b.innerHTML).toBe('<li>validated</li>'); // validated entry rendered
  });
});

describe('stale-while-revalidate window anchor', () => {
  it('serves stale HTML while the entry is still origin-fresh despite a shorter hx-swr', async () => {
    const el = mount('<div hx-get="/anchor" hx-trigger="load, refresh" hx-swr="1"></div>');
    await tick();
    net.respond(0, 200, '<li>origin-fresh</li>', {
      'Cache-Control': 'max-age=3600, stale-while-revalidate=60',
    });
    await tick();
    backdate('get:/anchor', 120); // stale for hx-swr=1, origin-fresh for ~58 min
    el.innerHTML = '';

    htmx.trigger(el, 'refresh');
    expect(el.innerHTML).toBe('<li>origin-fresh</li>'); // rendered immediately
    await tick();
    expect(net.requests.length).toBe(2); // revalidation still fired
  });
});

describe('garbage hx-swr TTL', () => {
  it('degrades to 0 (always stale) instead of disabling serving under a directive', async () => {
    const el = mount('<div hx-get="/nan" hx-trigger="load, refresh" hx-swr="abc"></div>');
    await tick();
    net.respond(0, 200, '<li>nan-safe</li>', {
      'Cache-Control': 'max-age=0, stale-while-revalidate=60',
    });
    await tick();
    el.innerHTML = '';

    htmx.trigger(el, 'refresh');
    expect(el.innerHTML).toBe('<li>nan-safe</li>'); // stale render still works
  });
});

describe('hx-select inheritance on cached swaps', () => {
  const FULL = '<div id="junk">JUNK</div><div id="content">GOOD</div>';

  it('honors an inherited ancestor hx-select', async () => {
    mount(
      '<div hx-select="#content" hx-select:inherited="#content">' +
        '<div id="kid" hx-get="/inh" hx-trigger="go" hx-swr="60"></div>' +
        '</div>'
    );
    const kid = document.querySelector('#kid');
    htmx.trigger(kid, 'go');
    await tick();
    net.respond(0, 200, FULL);
    await tick();
    kid.innerHTML = '';
    htmx.trigger(kid, 'go'); // fresh cache hit
    expect(kid.innerHTML).toContain('GOOD');
    expect(kid.innerHTML).not.toContain('JUNK');
  });

  it('hx-select="unset" and hx-disinherit stop inheritance', async () => {
    mount(
      '<div hx-select="#content" hx-disinherit="hx-select">' +
        '<div id="kid" hx-get="/dis" hx-trigger="go" hx-swr="60"></div>' +
        '</div>'
    );
    const kid = document.querySelector('#kid');
    htmx.trigger(kid, 'go');
    await tick();
    net.respond(0, 200, FULL);
    await tick();
    kid.innerHTML = '';
    htmx.trigger(kid, 'go'); // fresh cache hit — no inherited selection
    expect(kid.innerHTML).toContain('JUNK');
    expect(kid.innerHTML).toContain('GOOD');
  });
});
