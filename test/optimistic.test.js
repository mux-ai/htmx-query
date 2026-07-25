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

const PAGE =
  '<ul id="list"><li>old</li></ul>' +
  '<form hx-post="/todos" hx-target="#list" hx-swap="beforeend" hx-trigger="submit"' +
  ' hx-optimistic="#pending"></form>' +
  '<template id="pending"><li class="pending">saving…</li></template>';

describe('hx-optimistic', () => {
  it('renders the template instantly and replaces it with the response', async () => {
    mount(PAGE);
    const form = document.querySelector('form');
    const list = document.querySelector('#list');
    htmx.trigger(form, 'submit');
    expect(list.innerHTML).toContain('saving…');
    await tick();
    net.respond(0, 200, '<li>real</li>');
    await tick();
    expect(list.innerHTML).toBe('<li>old</li><li>real</li>');
  });

  it('reverts on error', async () => {
    mount(PAGE);
    const form = document.querySelector('form');
    const list = document.querySelector('#list');
    htmx.trigger(form, 'submit');
    expect(list.innerHTML).toContain('saving…');
    await tick();
    net.respond(0, 500, 'boom');
    await tick();
    expect(list.innerHTML).toBe('<li>old</li>');
  });

  it('preserves unrelated target changes when reverting', async () => {
    mount(PAGE);
    const form = document.querySelector('form');
    const list = document.querySelector('#list');
    htmx.trigger(form, 'submit');
    list.insertAdjacentHTML('beforeend', '<li class="other">unrelated</li>');
    await tick();
    net.respond(0, 500, 'boom');
    await tick();
    expect(list.innerHTML).toBe('<li>old</li><li class="other">unrelated</li>');
  });

  it('removes every optimistic node while retaining concurrent DOM changes', async () => {
    const page =
      '<ul id="list"><li>old</li></ul>' +
      '<form hx-post="/todos" hx-target="#list" hx-swap="beforeend" hx-trigger="submit" hx-optimistic="#pending"></form>' +
      '<template id="pending"><li class="pending">saving one</li><li class="pending">saving two</li></template>';
    mount(page);
    const form = document.querySelector('form');
    const list = document.querySelector('#list');
    htmx.trigger(form, 'submit');
    expect(list.querySelectorAll('.pending')).toHaveLength(2);
    list.insertAdjacentHTML('beforeend', '<li class="other">unrelated</li>');
    await tick();
    net.respond(0, 500, 'boom');
    await tick();
    expect(list.innerHTML).toBe('<li>old</li><li class="other">unrelated</li>');
  });
});
