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

export interface CacheLimits {
  maxEntries: number;
  maxVariants: number;
  maxCacheBytes: number;
  maxEntryBytes: number;
}

export interface QueryConfig {
  cacheEvents?: boolean | CacheEventAction[];
  cache?: Partial<CacheLimits>;
  /** Mirror the cache into sessionStorage for the lifetime of the tab. Off by default. */
  persist?: boolean;
  /** Propagate invalidation to other same-origin tabs in the same namespace. Off by default. */
  crossTab?: boolean;
}

export interface QueryConfigResult {
  cacheEvents: boolean | CacheEventAction[];
  cache: CacheLimits;
  persist: boolean;
  crossTab: boolean;
}

export interface PutOptions {
  /** Freshness in seconds, recorded as an origin max-age; effective TTL is min(hx-swr, ttl). */
  ttl?: number;
}

export interface InvalidationOptions {
  mode?: 'contains' | 'path';
}

export interface QueryApi {
  /** Returns the number of cache entries removed. */
  invalidate(prefix: string, options?: InvalidationOptions): number;
  /**
   * Store a rendered HTML fragment under a cache key (an hx-swr-key value or
   * the implicit "get:<path>" form), scoped to the active namespace. Returns
   * false when the value is rejected (oversized or non-string input).
   */
  put(key: string, html: string, options?: PutOptions): boolean;
  clear(): void;
  peek(): Map<string, unknown>;
  stats(): QueryStats;
  debug(): QueryDebug;
  resetMetrics(): void;
  configure(options?: QueryConfig): QueryConfigResult;
  setNamespace(value: string | null | undefined): string;
}

export interface HtmxLike {
  version?: string;
  defineExtension?(name: string, extension: { onEvent(name: string, event: Event): boolean }): void;
  registerExtension?(name: string, extension: Record<string, unknown>): void;
  query?: QueryApi;
}

export function register(htmx: HtmxLike): QueryApi;

declare global {
  interface HTMLElementEventMap {
    'hq:cache': CustomEvent<CacheEventDetail>;
    'hq:staleError': CustomEvent<StaleErrorDetail>;
    'hq:invalidated': CustomEvent<InvalidatedDetail>;
    'hq:prefetch': CustomEvent<PrefetchDetail>;
    'hq:retryExhausted': CustomEvent<undefined>;
  }
}
