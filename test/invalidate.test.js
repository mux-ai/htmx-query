import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeNetwork, mount, tick } from './helpers.js';

let net;
beforeEach(() => {
  net = fakeNetwork();
});
afterEach(() => {
  net.restore();
  htmx.query.clear();
  document.body.innerHTML = '';
});

describe('htmx.query.invalidate', () => {
  it('drops matching entries and listening elements refetch', async () => {
    const el = mount(
      '<div hx-get="/todos" hx-trigger="load, hq:invalidated from:body" hx-swr="60"></div>'
    );
    await tick();
    net.respond(0, 200, '<li>v1</li>');
    await tick();
    expect(htmx.query.peek().size).toBe(1);

    htmx.query.invalidate('/todos');
    expect(htmx.query.peek().size).toBe(0);
    await tick();
    expect(net.requests.length).toBe(2); // refetch fired
    net.respond(1, 200, '<li>v2</li>');
    await tick();
    expect(el.innerHTML).toBe('<li>v2</li>');
  });

  it('non-matching listeners short-circuit on their still-fresh cache', async () => {
    const el = mount(
      '<div hx-get="/users" hx-trigger="load, hq:invalidated from:body" hx-swr="60"></div>'
    );
    await tick();
    net.respond(0, 200, '<li>u</li>');
    await tick();

    htmx.query.invalidate('/todos'); // different prefix
    await tick();
    expect(net.requests.length).toBe(1); // fresh cache cancelled the refetch
    expect(el.innerHTML).toBe('<li>u</li>');
  });

  it('honors successful server invalidation instructions for cached resources', async () => {
    const list = mount('<div hx-get="/todos" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>v1</li>');
    await tick();
    expect(htmx.query.peek().size).toBe(1);

    const mutation = mount('<button hx-post="/todos" hx-trigger="save" hx-swap="none">Save</button>');
    htmx.trigger(mutation, 'save');
    await tick();
    net.respond(1, 200, '', { 'HX-Cache-Invalidate': '{"path":"/todos","mode":"path"}' });
    await tick();

    expect(htmx.query.peek().size).toBe(0);
    expect(list.innerHTML).toBe('<li>v1</li>');
  });

  it('ignores malformed or failed server invalidation instructions', async () => {
    mount('<div hx-get="/todos" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>v1</li>');
    await tick();
    const mutation = mount('<button hx-post="/todos" hx-trigger="save" hx-swap="none">Save</button>');
    htmx.trigger(mutation, 'save');
    await tick();
    net.respond(1, 500, '', { 'HX-Cache-Invalidate': 'not-json' });
    await tick();

    expect(htmx.query.peek().size).toBe(1);
  });
});

describe('htmx.query.invalidate options', () => {
  it('passes mode through and reports count + mode in the event', async () => {
    mount(
      '<div hx-get="/todos" hx-trigger="load" hx-swr="60"></div>' +
        '<div hx-get="/todos-archive" hx-trigger="load" hx-swr="60"></div>'
    );
    await tick();
    net.respond(0, 200, 'a');
    net.respond(1, 200, 'b');
    await tick();

    let detail = null;
    document.body.addEventListener('hq:invalidated', (e) => (detail = e.detail), { once: true });
    // path mode must not match /todos-archive the way substring mode would
    expect(htmx.query.invalidate('/todos', { mode: 'path' })).toBe(1);
    expect(detail).toMatchObject({ prefix: '/todos', mode: 'path', count: 1 });
    expect(htmx.query.peek().has('get:/todos-archive')).toBe(true);
  });
});
