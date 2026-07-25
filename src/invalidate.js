import { cache } from './cache.js';

const HEADER = 'HX-Cache-Invalidate';

function instructions(xhr) {
  try {
    const raw = xhr?.getResponseHeader(HEADER);
    if (!raw) return [];
    const decoded = JSON.parse(raw);
    return Array.isArray(decoded) ? decoded : [decoded];
  } catch {
    return [];
  }
}

/** Apply trusted, same-response cache invalidation instructions from the server. */
export function invalidateFromResponse(evt) {
  if (evt.detail.successful !== true) return 0;
  let count = 0;
  for (const instruction of instructions(evt.detail.xhr)) {
    if (!instruction || typeof instruction.path !== 'string' || !instruction.path) continue;
    cache.invalidate(instruction.path, { mode: instruction.mode === 'path' ? 'path' : 'contains' });
    count += 1;
  }
  return count;
}
