import { cache } from './cache.js';
import { getNamespace } from './scope.js';

const CHANNEL = 'htmx-query';
let channel = null;
let applying = false;

/**
 * Only invalidation crosses tabs; cached HTML never does. A received message
 * is applied without rebroadcasting, so two tabs cannot ping-pong.
 */
function receive(event) {
  const message = event.data;
  if (!message || message.namespace !== getNamespace() || typeof message.prefix !== 'string') return;
  applying = true;
  try {
    cache.invalidate(message.prefix, { mode: message.mode === 'path' ? 'path' : 'contains' });
  } finally {
    applying = false;
  }
}

function broadcast(prefix, mode) {
  if (!channel || applying) return;
  try {
    channel.postMessage({ namespace: getNamespace(), prefix, mode });
  } catch {
    // A closed channel or an unclonable payload must not break invalidation.
  }
}

/**
 * Enable or disable propagation. Environments without BroadcastChannel accept
 * the option and stay single-tab rather than failing the call.
 */
export function configure(value) {
  if (value === undefined) return channel !== null;
  if (value === true) {
    if (!channel && typeof BroadcastChannel === 'function') {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = receive;
      cache.setInvalidateObserver(broadcast);
    }
  } else if (channel) {
    cache.setInvalidateObserver(null);
    channel.close();
    channel = null;
  }
  return channel !== null;
}
