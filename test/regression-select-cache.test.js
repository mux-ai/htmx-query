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

const RESPONSE = '<div id="junk">JUNK</div><div id="content">GOOD</div>';

describe('cached swaps vs hx-select', () => {
  it('network render honors hx-select but a cache hit injects the full raw response', async () => {
    const el = mount(
      '<div id="a" hx-get="/api/page" hx-trigger="go" hx-swr="60" hx-select="#content"></div>'
    );

    // First trigger: real network request, htmx filters through hx-select.
    htmx.trigger(el, 'go');
    await tick();
    expect(net.requests.length).toBe(1);
    net.respond(0, 200, RESPONSE);
    await tick();

    expect(el.innerHTML).toContain('GOOD');
    expect(el.innerHTML).not.toContain('JUNK'); // hx-select applied on network path

    // Second trigger inside TTL: served from cache, request cancelled.
    htmx.trigger(el, 'go');
    await tick();
    expect(net.requests.length).toBe(1); // fresh entry -> request cancelled

    // Defect: cached serve ignores hx-select and injects the raw response.
    expect(el.innerHTML).toContain('GOOD');
    expect(el.innerHTML).not.toContain('JUNK'); // FAILS if the defect is real
  });

  it('dedupe waiter serve also ignores hx-select', async () => {
    document.body.setAttribute('hx-ext', 'query');
    document.body.innerHTML =
      '<div id="a" hx-get="/api/page" hx-trigger="go" hx-swr="60" hx-select="#content"></div>' +
      '<div id="b" hx-get="/api/page" hx-trigger="go" hx-swr="60" hx-select="#content"></div>';
    htmx.process(document.body);
    const a = document.getElementById('a');
    const b = document.getElementById('b');

    htmx.trigger(a, 'go'); // winner
    await tick();
    htmx.trigger(b, 'go'); // duplicate -> cancelled, becomes waiter
    await tick();
    expect(net.requests.length).toBe(1);

    net.respond(0, 200, RESPONSE);
    await tick();

    expect(a.innerHTML).not.toContain('JUNK'); // winner: htmx applied hx-select
    expect(b.innerHTML).not.toContain('JUNK'); // FAILS if the defect is real
  });
});
