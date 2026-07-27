import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeNetwork, mount, tick } from './helpers.js';

/** A second BroadcastChannel stands in for another tab; senders never self-receive. */
function otherTab() {
  const channel = new BroadcastChannel('htmx-query');
  const received = [];
  channel.onmessage = (event) => received.push(event.data);
  return { channel, received, close: () => channel.close() };
}

let net;
let tab;
beforeEach(() => {
  net = fakeNetwork();
  tab = otherTab();
});
afterEach(() => {
  tab.close();
  net.restore();
  htmx.query.configure({ crossTab: false });
  htmx.query.setNamespace('');
  htmx.query.clear();
  document.body.innerHTML = '';
});

async function cacheTodos() {
  mount('<div hx-get="/todos" hx-trigger="load" hx-swr="60"></div>');
  await tick();
  net.respond(0, 200, '<li>cached</li>');
  await tick();
}

describe('opt-in cross-tab invalidation', () => {
  it('is off by default and reports its state through configure', () => {
    expect(htmx.query.configure().crossTab).toBe(false);
    expect(htmx.query.configure({ crossTab: true }).crossTab).toBe(true);
    expect(htmx.query.configure().crossTab).toBe(true);
    expect(htmx.query.configure({ crossTab: false }).crossTab).toBe(false);
  });

  it('publishes local invalidations to other tabs', async () => {
    htmx.query.configure({ crossTab: true });
    htmx.query.setNamespace('alice');
    htmx.query.invalidate('/todos', { mode: 'path' });
    await tick();

    expect(tab.received).toEqual([{ namespace: 'alice', prefix: '/todos', mode: 'path' }]);
  });

  it('stays silent while disabled', async () => {
    htmx.query.invalidate('/todos');
    await tick();
    expect(tab.received).toEqual([]);
  });

  it('applies a remote invalidation and announces it like a local one', async () => {
    htmx.query.configure({ crossTab: true });
    await cacheTodos();
    expect(htmx.query.peek().size).toBe(1);

    const announced = [];
    document.body.addEventListener('hq:invalidated', (event) => announced.push(event.detail));
    tab.channel.postMessage({ namespace: '', prefix: '/todos', mode: 'path' });
    await tick();

    expect(htmx.query.peek().size).toBe(0);
    expect(announced).toHaveLength(1);
    expect(announced[0]).toMatchObject({ prefix: '/todos', mode: 'path', count: 1 });
  });

  it('never rebroadcasts a received invalidation', async () => {
    htmx.query.configure({ crossTab: true });
    await cacheTodos();
    tab.received.length = 0;
    tab.channel.postMessage({ namespace: '', prefix: '/todos', mode: 'path' });
    await tick();

    expect(htmx.query.peek().size).toBe(0);
    expect(tab.received).toEqual([]); // no ping-pong back to the sender's peers
  });

  it('ignores invalidations addressed to a different namespace', async () => {
    htmx.query.configure({ crossTab: true });
    htmx.query.setNamespace('alice');
    await cacheTodos();

    tab.channel.postMessage({ namespace: 'bob', prefix: '/todos', mode: 'path' });
    await tick();
    expect(htmx.query.peek().size).toBe(1);

    tab.channel.postMessage({ namespace: 'alice', prefix: '/todos', mode: 'path' });
    await tick();
    expect(htmx.query.peek().size).toBe(0);
  });

  it('ignores malformed messages', async () => {
    htmx.query.configure({ crossTab: true });
    await cacheTodos();

    tab.channel.postMessage(null);
    tab.channel.postMessage({ namespace: '' });
    tab.channel.postMessage({ namespace: '', prefix: 42 });
    await tick();
    expect(htmx.query.peek().size).toBe(1);
  });
});
