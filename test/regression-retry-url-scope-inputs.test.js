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

describe('retry state is scoped by request URL on input elements', () => {
  it('does not fire hq:retryExhausted when each URL has only failed once', async () => {
    let exhausted = 0;
    document.body.addEventListener('hq:retryExhausted', () => exhausted++);

    // Search-box shape from the claim: same element, URL changes per trigger.
    // Huge retry-delay so no scheduled retry ever fires inside the test —
    // every logged request is a FRESH user-initiated request to a NEW URL.
    const el = mount(
      '<input name="q" hx-get="/search" hx-trigger="go" hx-retry="3" hx-retry-delay="100000">'
    );

    const failOnce = async (value, index) => {
      el.value = value;
      htmx.trigger(el, 'go');
      await tick();
      net.respond(index, 500, 'boom');
      await tick();
    };

    await failOnce('ab', 0);   // GET /search?q=ab    fails -> attempts=1
    await failOnce('abc', 1);  // GET /search?q=abc   fails -> attempts=2
    await failOnce('abcd', 2); // GET /search?q=abcd  fails -> attempts=3
    expect(exhausted).toBe(0);

    await failOnce('abcde', 3); // first failure for q=abcde -> n=4 > 3

    // Prove the URLs really were all distinct and each was attempted once:
    const urls = net.requests.map((r) => r.url);
    expect(urls).toEqual([
      '/search?q=ab',
      '/search?q=abc',
      '/search?q=abcd',
      '/search?q=abcde',
    ]);

    expect(exhausted).toBe(0);
  });
});
