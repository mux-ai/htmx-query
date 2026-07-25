export type CacheEventAction = 'hit' | 'miss' | 'store' | 'evict' | 'skip' | 'clear';

export interface CacheEventDetail {
  action: CacheEventAction;
  key?: string;
  bytes?: number;
  entries?: number;
  reason?: 'entry-too-large' | 'variant-too-large';
}

export interface StaleErrorDetail {
  key: string;
  status: number;
}

export interface InvalidatedDetail {
  prefix: string;
  mode: 'contains' | 'path';
  count: number;
}

export type PrefetchAction = 'success' | 'error' | 'skip';

export interface PrefetchDetail {
  action: PrefetchAction;
  path?: string;
  reason?: 'missing-swr' | 'save-data' | 'cross-origin';
}

export interface CacheStats {
  entries: number;
  bytes: number;
  evictions: number;
  hits: number;
  misses: number;
  skippedEntries: number;
  skippedVariants: number;
  stores: number;
  variantHits: number;
  variantMisses: number;
  hitRate: number;
}

export interface DedupeStats {
  inflight: number;
  waiters: number;
}

export interface QueryStats {
  namespace: string;
  cache: CacheStats;
  dedupe: DedupeStats;
  staleErrors: number;
}

export interface QueryDebug extends QueryStats {
  keys: string[];
}

export interface QueryConfig {
  cacheEvents?: boolean | CacheEventAction[];
}

export interface InvalidationOptions {
  mode?: 'contains' | 'path';
}

export interface QueryApi {
  /** Returns the number of cache entries removed. */
  invalidate(prefix: string, options?: InvalidationOptions): number;
  clear(): void;
  peek(): Map<string, unknown>;
  stats(): QueryStats;
  debug(): QueryDebug;
  resetMetrics(): void;
  configure(options?: QueryConfig): { cacheEvents: boolean | CacheEventAction[] };
  setNamespace(value: string | null | undefined): string;
}

export interface HtmxLike {
  defineExtension(name: string, extension: { onEvent(name: string, event: Event): boolean }): void;
  query?: QueryApi;
}

export function register(htmx: HtmxLike): QueryApi;

declare global {
  interface HTMLElementEventMap {
    'hq:cache': CustomEvent<CacheEventDetail>;
    'hq:staleError': CustomEvent<StaleErrorDetail>;
    'hq:invalidated': CustomEvent<InvalidatedDetail>;
    'hq:prefetch': CustomEvent<PrefetchDetail>;
  }
}
