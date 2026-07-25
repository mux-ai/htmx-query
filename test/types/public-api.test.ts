import { register, type CacheEventDetail, type HtmxLike, type InvalidatedDetail, type PrefetchDetail, type StaleErrorDetail } from '../../src/index.js';

declare const htmx: HtmxLike;

const query = register(htmx);
query.setNamespace('tenant-a');
query.invalidate('/todos', { mode: 'path' });
const removed: number = query.invalidate('/todos');
const stats = query.stats();
const bytes: number = stats.cache.bytes;
const hitRate: number = stats.cache.hitRate;
const debugKeys: string[] = query.debug().keys;
const eventDetail: CacheEventDetail = { action: 'store', key: 'get:/todos', bytes };

document.body.addEventListener('hq:cache', (event) => {
  const action: CacheEventDetail['action'] = event.detail.action;
  void action;
});

document.body.addEventListener('hq:staleError', (event) => {
  const status: StaleErrorDetail['status'] = event.detail.status;
  void status;
});

document.body.addEventListener('hq:invalidated', (event) => {
  const detail: InvalidatedDetail = event.detail;
  void detail.count;
});

document.body.addEventListener('hq:prefetch', (event) => {
  const detail: PrefetchDetail = event.detail;
  void detail.action;
});

void eventDetail;
void removed;
void hitRate;
void debugKeys;
