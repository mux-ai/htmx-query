import { afterEach, describe, expect, it, vi } from 'vitest';
import { cache, MAX_CACHE_BYTES, MAX_ENTRY_BYTES } from '../../src/cache.js';

afterEach(() => cache.clear());

describe('cache store', () => {
  it('stores and returns entries with a timestamp', () => {
    cache.set('get:/a', '<b>a</b>');
    const entry = cache.get('get:/a');
    expect(entry.html).toBe('<b>a</b>');
    expect(typeof entry.time).toBe('number');
  });

  it('reports bounded-cache activity through stats', () => {
    const before = cache.stats();
    cache.set('get:/stats', 'stored');
    cache.get('get:/stats');
    cache.get('get:/missing');
    const after = cache.stats();

    expect(after.stores - before.stores).toBe(1);
    expect(after.hits - before.hits).toBe(1);
    expect(after.misses - before.misses).toBe(1);
    expect(after.entries).toBe(1);
    expect(after.bytes).toBeGreaterThan(0);
  });

  it('emits cache lifecycle events for application observability', () => {
    const events = [];
    const observe = (event) => events.push(event.detail);
    document.body.addEventListener('hq:cache', observe);
    cache.get('get:/missing');
    cache.set('get:/event', 'stored');
    cache.get('get:/event');
    cache.clear();
    document.body.removeEventListener('hq:cache', observe);

    expect(events.map(({ action }) => action)).toEqual(['miss', 'store', 'hit', 'clear']);
    expect(events[1]).toMatchObject({ key: 'get:/event', bytes: 6 });
  });

  it('filters or disables cache lifecycle events without changing stats', () => {
    const events = [];
    const observe = (event) => events.push(event.detail.action);
    document.body.addEventListener('hq:cache', observe);
    expect(cache.configureEvents(['store'])).toEqual(['store']);
    cache.get('get:/missing');
    cache.set('get:/event', 'stored');
    expect(cache.configureEvents(false)).toBe(false);
    cache.clear();
    cache.configureEvents(true);
    document.body.removeEventListener('hq:cache', observe);

    expect(events).toEqual(['store']);
    expect(cache.stats().misses).toBeGreaterThan(0);
  });

  it('caches one selected HTML variant per selector', () => {
    cache.set('get:/a', '<div class="skip">skip</div><div class="keep">keep</div>');
    const entry = cache.get('get:/a');
    expect(cache.selected(entry, '.keep')).toEqual({ html: '<div class="keep">keep</div>', selected: true });
    expect(cache.selected(entry, '.keep')).toEqual({ html: '<div class="keep">keep</div>', selected: true });
    expect(entry.variants.size).toBe(1);
  });

  it('discards selected variants when fresh response HTML replaces an entry', () => {
    cache.set('get:/a', '<div class="keep">old</div>');
    const oldEntry = cache.get('get:/a');
    cache.selected(oldEntry, '.keep');
    cache.set('get:/a', '<div class="keep">new</div>');
    const entry = cache.get('get:/a');
    expect(cache.selected(entry, '.keep')).toEqual({ html: '<div class="keep">new</div>', selected: true });
    expect(entry.variants.size).toBe(1);
  });

  it('bounds selector variants per entry and evicts the oldest variant first', () => {
    cache.set('get:/a', '<div>content</div>');
    const entry = cache.get('get:/a');
    for (let i = 0; i < 17; i++) cache.selected(entry, `.selector-${i}`);
    expect(entry.variants.size).toBe(16);
    expect(entry.variants.has('.selector-0')).toBe(false);
    expect(entry.variants.has('.selector-16')).toBe(true);
  });

  it('evicts the oldest insertion beyond 100 entries', () => {
    for (let i = 0; i < 101; i++) cache.set(`get:/k${i}`, 'x');
    expect(cache.peek().size).toBe(100);
    expect(cache.get('get:/k0')).toBeUndefined();
    expect(cache.get('get:/k100')).toBeDefined();
  });

  it('re-setting an existing key refreshes its insertion order', () => {
    for (let i = 0; i < 100; i++) cache.set(`get:/k${i}`, 'x');
    cache.set('get:/k0', 'refreshed');
    cache.set('get:/new', 'x'); // evicts k1, not k0
    expect(cache.get('get:/k0').html).toBe('refreshed');
    expect(cache.get('get:/k1')).toBeUndefined();
  });

  it('rejects an entry that exceeds the per-entry byte budget', () => {
    expect(cache.set('get:/large', 'x'.repeat(MAX_ENTRY_BYTES + 1))).toBe(false);
    expect(cache.get('get:/large')).toBeUndefined();
  });

  it('evicts oldest entries to stay within the total byte budget', () => {
    const entry = 'x'.repeat(Math.floor(MAX_CACHE_BYTES / 5));
    for (let i = 0; i < 6; i++) cache.set(`get:/large-${i}`, entry);
    expect(cache.peek().size).toBe(5);
    expect(cache.get('get:/large-0')).toBeUndefined();
    expect(cache.get('get:/large-5')).toBeDefined();
  });

  it('uses oversized selector output once without retaining it', () => {
    const content = 'x'.repeat(MAX_ENTRY_BYTES - 100);
    cache.set('get:/select', `<div class="keep">${content}</div>`);
    const entry = cache.get('get:/select');
    expect(cache.selected(entry, '.keep').html).toContain(content);
    expect(entry.variants.size).toBe(0);
  });

  it('materializes a large selector once and reuses the retained result', () => {
    const rows = Array.from({ length: 5000 }, (_, index) => `<li class="row">${index}</li>`).join('');
    cache.set('get:/rows', rows);
    const entry = cache.get('get:/rows');
    const createElement = vi.spyOn(document, 'createElement');
    cache.selected(entry, '.row');
    cache.selected(entry, '.row');
    expect(createElement.mock.calls.filter(([tag]) => tag === 'template')).toHaveLength(1);
    createElement.mockRestore();
  });

  it('invalidate drops matching keys, returns the count, and fires hq:invalidated', () => {
    cache.set('get:/todos', 'a');
    cache.set('get:/todos/1', 'b');
    cache.set('get:/users', 'c');
    let detail = null;
    document.body.addEventListener('hq:invalidated', (e) => (detail = e.detail), { once: true });
    expect(cache.invalidate('/todos')).toBe(2);
    expect(cache.peek().size).toBe(1);
    expect(cache.get('get:/users')).toBeDefined();
    expect(detail).toMatchObject({ prefix: '/todos', mode: 'contains', count: 2 });
  });

  it('invalidate reports mode and zero count when nothing matches', () => {
    cache.set('get:/users', 'c');
    let detail = null;
    document.body.addEventListener('hq:invalidated', (e) => (detail = e.detail), { once: true });
    expect(cache.invalidate('/todos', { mode: 'path' })).toBe(0);
    expect(detail).toMatchObject({ prefix: '/todos', mode: 'path', count: 0 });
  });

  it('invalidates the full entry-count bound in one pass', () => {
    for (let i = 0; i < 100; i++) cache.set(`get:/reports/${i}`, 'x');
    cache.invalidate('/reports/');
    expect(cache.peek().size).toBe(0);
  });

  it('supports path-boundary invalidation without matching similarly named resources', () => {
    cache.set('get:/todos', 'a');
    cache.set('get:/todos/1', 'b');
    cache.set('get:/todos-archive', 'c');
    cache.invalidate('/todos', { mode: 'path' });
    expect([...cache.peek().keys()]).toEqual(['get:/todos-archive']);
  });

  it('preserves entry and byte bounds under a seeded mixed-operation sequence', () => {
    let state = 0x1234abcd;
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 2 ** 32;
    };

    for (let step = 0; step < 1_000; step += 1) {
      const key = `get:/${random() < 0.5 ? 'todos' : 'users'}/${Math.floor(random() * 180)}`;
      const operation = Math.floor(random() * 5);
      if (operation === 0) cache.invalidate('/todos', { mode: 'path' });
      else if (operation === 1) cache.get(key);
      else if (operation === 2) {
        const entry = cache.get(key);
        if (entry) cache.selected(entry, `.variant-${Math.floor(random() * 24)}`);
      } else {
        cache.set(key, `<div class="variant-${Math.floor(random() * 24)}">${'x'.repeat(Math.floor(random() * 8_000))}</div>`);
      }

      const entries = [...cache.peek().values()];
      const stats = cache.stats();
      expect(stats.entries).toBeLessThanOrEqual(100);
      expect(stats.bytes).toBeLessThanOrEqual(MAX_CACHE_BYTES);
      expect(entries.every((entry) => entry.bytes <= MAX_ENTRY_BYTES)).toBe(true);
      expect(stats.bytes).toBe(entries.reduce((sum, entry) => sum + entry.bytes, 0));
    }
  });
});
