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

describe('inflight leak when requester detached and request errors', () => {
  it('later same-key GETs are permanently cancelled after detached winner errors', async () => {
    mount('<div id="a" hx-get="/leak" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    expect(net.requests.length).toBe(1); // winner in flight, inflight key registered

    // Another swap removes the requester from the DOM while its GET is in flight.
    document.body.innerHTML = '';

    // The in-flight request now fails at the network level.
    net.requests[0].error(); // nise: fires xhr.onerror -> htmx:afterRequest/sendError on detached elt
    await tick();

    // A brand-new element later requests the same URL.
    mount('<div id="b" hx-get="/leak" hx-trigger="load" hx-swr="60"></div>');
    await tick();

    // If settle ran, the registry was cleared and this is a fresh request (length 2).
    // If the leak is real, #b was swallowed as a waiter forever (length 1).
    expect(net.requests.length).toBe(2);
    expect(document.querySelector('#b')).toBeTruthy();
  });

  it('control: same flow with requester still attached recovers fine', async () => {
    mount('<div id="a" hx-get="/leak2" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    expect(net.requests.length).toBe(1);
    net.requests[0].error();
    await tick();
    mount('<div id="b" hx-get="/leak2" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    expect(net.requests.length).toBe(2);
  });
});
