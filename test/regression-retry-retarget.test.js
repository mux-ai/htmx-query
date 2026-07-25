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

describe('retry target preservation', () => {
  it('uses the original target after a 503 with HX-Retarget', async () => {
    document.body.setAttribute('hx-ext', 'query');
    document.body.innerHTML =
      '<div id="main">original-main</div>' +
      '<div id="error-banner">original-banner</div>' +
      '<div id="btn" hx-get="/data" hx-target="#main" hx-trigger="go" hx-retry="2" hx-retry-delay="20"></div>';
    htmx.process(document.body);
    const btn = document.getElementById('btn');

    htmx.trigger(btn, 'go');
    await tick();
    expect(net.requests.length).toBe(1);

    // 503 with HX-Retarget pointing at the error banner (error body not swapped by default config)
    net.respond(0, 503, 'server busy', { 'HX-Retarget': '#error-banner' });
    await tick(60); // let the 20ms retry timer fire

    expect(net.requests.length).toBe(2); // retry was issued

    net.respond(1, 200, 'REAL-CONTENT');
    await tick();

    expect(document.getElementById('main').innerHTML).toBe('REAL-CONTENT');
    expect(document.getElementById('error-banner').innerHTML).toBe('original-banner');
  });
});
