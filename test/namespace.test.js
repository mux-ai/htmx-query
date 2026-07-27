import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeNetwork, mount, tick } from './helpers.js';

let net;
beforeEach(() => {
  net = fakeNetwork();
  htmx.query.setNamespace('');
});
afterEach(() => {
  net.restore();
  htmx.query.setNamespace('');
  htmx.query.clear();
  document.body.innerHTML = '';
});

describe('cache namespaces and observability', () => {
  it('scopes keys per account and clears entries when the account changes', async () => {
    htmx.query.setNamespace('alice');
    mount('<div hx-get="/todos" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>Alice</li>');
    await tick();

    expect([...htmx.query.peek().keys()]).toEqual(['alice::get:/todos']);
    expect(htmx.query.stats().namespace).toBe('alice');

    expect(htmx.query.setNamespace('bob')).toBe('bob');
    expect(htmx.query.peek().size).toBe(0);
  });

  it('exposes cache and dedupe stats without leaking implementation state', () => {
    const stats = htmx.query.stats();
    expect(stats).toMatchObject({
      namespace: '',
      cache: { entries: 0, bytes: 0 },
      dedupe: { inflight: 0, waiters: 0 },
    });
    expect(stats.cache.hitRate).toBeGreaterThanOrEqual(0);
    expect(stats.staleErrors).toBeGreaterThanOrEqual(0);
    expect(htmx.query.debug().keys).toEqual([]);
  });

  it('resets optional diagnostic metrics without clearing cached entries', () => {
    htmx.query.resetMetrics();
    htmx.query.peek();
    expect(htmx.query.stats().cache.hits).toBe(0);
    expect(htmx.query.stats().cache.misses).toBe(0);
    expect(htmx.query.stats().staleErrors).toBe(0);
  });

  it('configures cache lifecycle events through the public API', () => {
    expect(htmx.query.configure({ cacheEvents: ['evict'] }).cacheEvents).toEqual(['evict']);
    expect(htmx.query.configure({ cacheEvents: false }).cacheEvents).toBe(false);
    expect(htmx.query.configure().cacheEvents).toBe(true);
  });

  it('configures cache limits through the public API and reports them read-only otherwise', () => {
    expect(htmx.query.configure().cache).toMatchObject({
      maxEntries: 100,
      maxVariants: 16,
      maxCacheBytes: 1024 * 1024,
      maxEntryBytes: 256 * 1024,
    });
    expect(htmx.query.configure({ cache: { maxEntries: 200 } }).cache.maxEntries).toBe(200);
    expect(htmx.query.configure().cache.maxEntries).toBe(200);
    expect(htmx.query.configure({ cache: { maxEntries: 100 } }).cache.maxEntries).toBe(100);
  });
});
