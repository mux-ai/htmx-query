import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeNetwork, tick } from './helpers.js';

let net;
beforeEach(() => {
  net = fakeNetwork();
});
afterEach(() => {
  net.restore();
  htmx.query.clear();
  document.body.innerHTML = '';
});

describe('retry and dedupe isolation', () => {
  it('keeps a scheduled retry alive while an identical GET is in flight', async () => {
    document.body.setAttribute('hx-ext', 'query');
    document.body.innerHTML =
      '<div id="a" hx-get="/api/items" hx-trigger="load" hx-swr="60" hx-retry="3" hx-retry-delay="20"></div>' +
      '<div id="b" hx-get="/api/items" hx-trigger="go" hx-swr="60"></div>';
    htmx.process(document.body);
    const a = document.getElementById('a');
    const b = document.getElementById('b');

    await tick();
    expect(net.requests.length).toBe(1); // A's initial request

    net.respond(0, 500, 'boom'); // A fails -> retry scheduled in 20ms
    await tick(1); // Fetch completion is asynchronous under htmx 4.
    htmx.trigger(b, 'go'); // B issues an identical GET immediately
    await tick();
    expect(net.requests.length).toBe(3); // B and A's scheduled retry both fly

    net.respond(1, 500, 'boom'); // B fails independently
    net.respond(2, 500, 'boom'); // A retry schedules its second retry
    await tick(80);
    expect(net.requests.length).toBe(4);

    net.respond(3, 200, 'recovered');
    await tick();
    expect(a.innerHTML).toBe('recovered');
  });
});
