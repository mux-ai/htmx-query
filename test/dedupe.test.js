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

describe('dedupe', () => {
  it('collapses identical in-flight GETs and serves all from one response', async () => {
    mount(
      '<div id="a" hx-get="/todos" hx-trigger="load" hx-swr="60"></div>' +
        '<div id="b" hx-get="/todos" hx-trigger="load" hx-swr="60"></div>'
    );
    await tick();
    expect(net.requests.length).toBe(1);
    net.respond(0, 200, '<li>shared</li>');
    await tick();
    expect(document.querySelector('#a').innerHTML).toBe('<li>shared</li>');
    expect(document.querySelector('#b').innerHTML).toBe('<li>shared</li>');
  });

  it('settles a large group of waiting targets from one response', async () => {
    const count = 50;
    mount(Array.from({ length: count }, (_, index) =>
      `<div id="waiter-${index}" hx-get="/shared" hx-trigger="load" hx-swr="60"></div>`
    ).join(''));
    await tick();
    expect(net.requests.length).toBe(1);
    net.respond(0, 200, '<li>shared</li>');
    await tick();
    expect(document.querySelectorAll('[id^="waiter-"]')).toHaveLength(count);
    expect([...document.querySelectorAll('[id^="waiter-"]')].every((node) => node.innerHTML === '<li>shared</li>')).toBe(true);
  });

  it('reuses selector variants while preserving each duplicate target selection', async () => {
    mount(
      '<div id="a" hx-get="/page" hx-trigger="load, refresh" hx-swr="60" hx-select="#one"></div>' +
        '<div id="b" hx-get="/page" hx-trigger="load, refresh" hx-swr="60" hx-select="#two"></div>'
    );
    await tick();
    expect(net.requests.length).toBe(1);
    net.respond(0, 200, '<div id="one">one</div><div id="two">two</div>');
    await tick();

    const a = document.querySelector('#a');
    const b = document.querySelector('#b');
    expect(a.innerHTML).toBe('<div id="one">one</div>');
    expect(b.innerHTML).toBe('<div id="two">two</div>');

    htmx.trigger(a, 'refresh');
    htmx.trigger(b, 'refresh');
    await tick();
    expect(net.requests.length).toBe(1);
    expect([...htmx.query.peek().values()][0].variants.size).toBe(2);
  });

  it('drops waiters when the winner fails', async () => {
    mount(
      '<div id="a" hx-get="/todos" hx-trigger="load" hx-swr="60"></div>' +
        '<div id="b" hx-get="/todos" hx-trigger="load" hx-swr="60"></div>'
    );
    await tick();
    expect(net.requests.length).toBe(1);
    net.respond(0, 500, 'boom');
    await tick();
    expect(document.querySelector('#b').innerHTML).toBe('');
    // registry cleared: a later trigger issues a fresh request, not a waiter
    htmx.trigger(document.querySelector('#b'), 'htmx:load'); // no-op custom event
    expect(net.requests.length).toBe(1);
  });

  it('does not dedupe GETs without hx-swr', async () => {
    mount(
      '<div hx-get="/p" hx-trigger="load"></div>' + '<div hx-get="/p" hx-trigger="load"></div>'
    );
    await tick();
    expect(net.requests.length).toBe(2);
  });
});
