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

describe('retry state is scoped by request URL', () => {
  it('does not exhaust after first failures against different URLs', async () => {
    // Search-box shape: GET params change between triggers, so each request
    // has a different finalRequestPath. Huge retry delay isolates the counter:
    // scheduled retries never fire inside the test window.
    document.body.setAttribute('hx-ext', 'query');
    document.body.innerHTML =
      '<input id="q" name="q" value="">' +
      '<div id="s" hx-get="/search" hx-trigger="go" hx-include="#q" hx-retry="3" hx-retry-delay="60000"></div>';
    htmx.process(document.body);
    const q = document.getElementById('q');
    const s = document.getElementById('s');

    let exhausted = 0;
    document.body.addEventListener('hq:retryExhausted', () => exhausted++);

    q.value = 'ab';
    htmx.trigger(s, 'go');
    await tick();
    expect(net.requests.length).toBe(1);
    expect(net.requests[0].url).toContain('q=ab');
    net.respond(0, 500, 'boom'); // first-ever failure for q=ab -> attempts should be 1 for THIS url
    await tick();

    q.value = 'abc';
    htmx.trigger(s, 'go');
    await tick();
    expect(net.requests.length).toBe(2);
    expect(net.requests[1].url).toContain('q=abc');
    net.respond(1, 500, 'boom'); // first-ever failure for q=abc
    await tick();

    q.value = 'abcd';
    htmx.trigger(s, 'go');
    await tick();
    expect(net.requests.length).toBe(3);
    net.respond(2, 500, 'boom'); // first-ever failure for q=abcd
    await tick();

    expect(exhausted).toBe(0); // sanity: not exhausted yet

    q.value = 'abcde';
    htmx.trigger(s, 'go');
    await tick();
    expect(net.requests.length).toBe(4);
    net.respond(3, 500, 'boom'); // first-ever failure for q=abcde
    await tick();

    expect(exhausted).toBe(0);
  });
});
