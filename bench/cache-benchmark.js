import { performance } from 'node:perf_hooks';
import { JSDOM } from 'jsdom';
import { cache } from '../src/cache.js';

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.document = dom.window.document;
globalThis.CustomEvent = dom.window.CustomEvent;

const samples = (count, measure) => Array.from({ length: count }, measure).sort((a, b) => a - b);
const median = (values) => values[Math.floor(values.length / 2)];
const time = (work) => {
  const start = performance.now();
  work();
  return performance.now() - start;
};

const invalidation = samples(25, () => {
  cache.clear();
  for (let index = 0; index < 100; index++) cache.set(`get:/reports/${index}`, 'x'.repeat(1024));
  return time(() => cache.invalidate('/reports/'));
});

const selectorHtml = Array.from({ length: 100 }, (_, index) =>
  `<li class="row row-${index % 16}">${index}</li>`
).join('');
const selectorMaterialization = samples(25, () => {
  cache.clear();
  cache.set('get:/rows', selectorHtml);
  const entry = cache.get('get:/rows');
  return time(() => {
    for (let index = 0; index < 16; index++) cache.selected(entry, `.row-${index}`);
  });
});

const prefetchCacheHit = samples(25, () => {
  cache.clear();
  cache.set('get:/prefetch', '<li>prefetched</li>');
  return time(() => {
    for (let index = 0; index < 1_000; index++) cache.get('get:/prefetch');
  });
});

const results = [
  { scenario: 'server invalidation 100 entries', medianMs: median(invalidation) },
  { scenario: 'materialize 16 selectors', medianMs: median(selectorMaterialization) },
  { scenario: 'prefetch cache hit x1000', medianMs: median(prefetchCacheHit) },
];
console.table(results.map((result) => ({ ...result, medianMs: result.medianMs.toFixed(3) })));
if (process.argv.includes('--check')) {
  const limits = [5, 250, 25];
  const failure = results.find((result, index) => result.medianMs > limits[index]);
  if (failure) throw new Error(`${failure.scenario} exceeded its conservative regression limit.`);
}
cache.clear();
dom.window.close();
