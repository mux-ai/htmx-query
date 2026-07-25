import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeNetwork, mount, tick } from './helpers.js';
import { MAX_RETRY_DELAY_MS, retryDelay } from '../src/retry.js';

let net;
beforeEach(() => {
  net = fakeNetwork();
});
afterEach(() => {
  net.restore();
  htmx.query.clear();
  document.body.innerHTML = '';
});

describe('hx-retry', () => {
  it('retries failed GETs with backoff until success', async () => {
    const el = mount(
      '<div hx-get="/flaky" hx-trigger="load" hx-retry="3" hx-retry-delay="10"></div>'
    );
    await tick();
    net.respond(0, 500, 'boom');
    await tick(60); // backoff 10ms + slack
    expect(net.requests.length).toBe(2);
    net.respond(1, 500, 'boom');
    await tick(80); // backoff 20ms + slack
    expect(net.requests.length).toBe(3);
    net.respond(2, 200, '<b>ok</b>');
    await tick();
    expect(el.innerHTML).toBe('<b>ok</b>');
  });

  it('fires hq:retryExhausted after giving up', async () => {
    let exhausted = false;
    document.body.addEventListener('hq:retryExhausted', () => (exhausted = true));
    mount('<div hx-get="/dead" hx-trigger="load" hx-retry="1" hx-retry-delay="5"></div>');
    await tick();
    net.respond(0, 500, '');
    await tick(50);
    expect(net.requests.length).toBe(2);
    net.respond(1, 500, '');
    await tick(50);
    expect(exhausted).toBe(true);
    expect(net.requests.length).toBe(2); // no further attempts
  });

  it('does not retry POST without hx-retry-unsafe', async () => {
    const form = mount(
      '<form hx-post="/save" hx-trigger="submit" hx-retry="2" hx-retry-delay="5"></form>'
    );
    htmx.trigger(form, 'submit');
    await tick();
    net.respond(0, 500, '');
    await tick(80);
    expect(net.requests.length).toBe(1);
  });

  it('retries POST when hx-retry-unsafe is present', async () => {
    const form = mount(
      '<form hx-post="/save" hx-trigger="submit" hx-retry="1" hx-retry-delay="5" hx-retry-unsafe></form>'
    );
    htmx.trigger(form, 'submit');
    await tick();
    net.respond(0, 500, '');
    await tick(80);
    expect(net.requests.length).toBe(2);
  });

  it('a retry bypasses the cache it is refreshing', async () => {
    // prime cache, then force a failing revalidation with retry enabled
    const el = mount(
      '<div hx-get="/x" hx-trigger="load, refresh" hx-swr="0" hx-retry="1" hx-retry-delay="5"></div>'
    );
    await tick();
    net.respond(0, 200, 'v1');
    await tick();
    htmx.trigger(el, 'refresh'); // stale -> revalidation request
    await tick();
    net.respond(1, 500, '');
    await tick(60);
    // retry fired a real network request instead of serving cached v1 and stopping
    expect(net.requests.length).toBe(3);
    net.respond(2, 200, 'v2');
    await tick();
    expect(el.innerHTML).toBe('v2');
  });

  it('caps configured retries at ten attempts to prevent runaway traffic', async () => {
    let exhausted = false;
    document.body.addEventListener('hq:retryExhausted', () => (exhausted = true));
    mount('<div hx-get="/bounded" hx-trigger="load" hx-retry="999" hx-retry-delay="1"></div>');
    await tick();
    for (let i = 0; i < 10; i++) {
      net.respond(i, 500, 'boom');
      await tick(30);
      expect(net.requests.length).toBe(i + 2);
    }
    net.respond(10, 500, 'boom');
    await tick(30);
    expect(net.requests.length).toBe(11); // initial request plus the maximum ten retries
    expect(exhausted).toBe(true);
  });

  it('clamps retry delay and spreads callers with equal jitter', () => {
    const element = { getAttribute: (name) => (name === 'hx-retry-delay' ? '-1' : null) };
    const xhr = { getResponseHeader: () => '999999' };
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(retryDelay(element, xhr, 1)).toBe(MAX_RETRY_DELAY_MS / 2);
    Math.random.mockRestore();
  });

  it('honors an HTTP-date Retry-After response header', () => {
    const element = { getAttribute: (name) => (name === 'hx-retry-delay' ? '1' : null) };
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2030-01-01T00:00:00Z'));
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const xhr = { getResponseHeader: () => 'Tue, 01 Jan 2030 00:00:10 GMT' };
    expect(retryDelay(element, xhr, 1)).toBe(10_000);
    Date.now.mockRestore();
    Math.random.mockRestore();
  });
});
