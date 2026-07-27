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

describe('hx-swr', () => {
  it('caches GET responses and serves fresh hits without a request', async () => {
    const el = mount('<div hx-get="/todos" hx-trigger="load, refresh" hx-swr="60"></div>');
    await tick();
    expect(net.requests.length).toBe(1);
    net.respond(0, 200, '<li>v1</li>');
    await tick();
    expect(el.innerHTML).toBe('<li>v1</li>');

    htmx.trigger(el, 'refresh');
    await tick();
    expect(net.requests.length).toBe(1); // served from cache, no new request
    expect(el.innerHTML).toBe('<li>v1</li>');
  });

  it('serves stale content instantly and revalidates in the background', async () => {
    const el = mount('<div hx-get="/todos" hx-trigger="load, refresh" hx-swr="0"></div>');
    await tick();
    net.respond(0, 200, '<li>v1</li>');
    await tick();

    htmx.trigger(el, 'refresh');
    expect(el.innerHTML).toBe('<li>v1</li>'); // stale copy, synchronously
    await tick();
    expect(net.requests.length).toBe(2); // revalidation fired
    net.respond(1, 200, '<li>v2</li>');
    await tick();
    expect(el.innerHTML).toBe('<li>v2</li>');
  });

  it('announces one stale revalidation error while retaining the rendered fragment', async () => {
    const el = mount('<div hx-get="/unstable" hx-trigger="load, refresh" hx-swr="0"></div>');
    await tick();
    net.respond(0, 200, '<li>stale copy</li>');
    await tick();

    const events = [];
    document.body.addEventListener('hq:staleError', (event) => events.push(event.detail));
    htmx.trigger(el, 'refresh');
    await tick();
    net.respond(1, 500, 'failed refresh');
    await tick();

    expect(el.innerHTML).toBe('<li>stale copy</li>');
    expect(events).toEqual([{ key: 'get:/unstable', status: 500 }]);
  });

  it('does not cache error responses', async () => {
    mount('<div hx-get="/broken" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(0, 500, 'boom');
    await tick();
    expect(htmx.query.peek().size).toBe(0);
  });

  it('does not cache responses containing hx-swap-oob', async () => {
    mount('<div hx-get="/oob" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<div>x</div><span id="c" hx-swap-oob="true">5</span>');
    await tick();
    expect(htmx.query.peek().size).toBe(0);
  });

  it.each(['no-store', 'private'])('does not cache a response marked Cache-Control: %s', async (directive) => {
    mount('<div hx-get="/sensitive" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>do not retain</li>', { 'Cache-Control': directive });
    await tick();
    expect(htmx.query.peek().size).toBe(0);
  });

  it('does not cache parameterized private directives or header-varying responses', async () => {
    mount('<div hx-get="/sensitive" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>private</li>', { 'Cache-Control': 'private="Set-Cookie"' });
    await tick();
    expect(htmx.query.peek().size).toBe(0);

    mount('<div hx-get="/localized" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(1, 200, '<li>localized</li>', { Vary: 'Accept-Language' });
    await tick();
    expect(htmx.query.peek().size).toBe(0);
  });

  it('allows the htmx-specific Vary: HX-Request response', async () => {
    mount('<div hx-get="/fragment" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>fragment</li>', { Vary: 'HX-Request' });
    await tick();
    expect(htmx.query.peek().size).toBe(1);
  });

  it('does not cache a wildcard Vary response', async () => {
    mount('<div hx-get="/wild" hx-trigger="load" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>wild</li>', { Vary: '*' });
    await tick();
    expect(htmx.query.peek().size).toBe(0);
  });

  it('treats quoted and malformed cache ages defensively', async () => {
    const el = mount('<div hx-get="/quoted" hx-trigger="load, refresh" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>quoted</li>', { 'Cache-Control': 'max-age="60", stale-while-revalidate="30"' });
    await tick();
    htmx.trigger(el, 'refresh');
    await tick();
    expect(net.requests).toHaveLength(1);

    const malformed = mount('<div hx-get="/malformed" hx-trigger="load, refresh" hx-swr="60"></div>');
    await tick();
    net.respond(1, 200, '<li>malformed</li>', { 'Cache-Control': 'max-age=, stale-if-error=oops' });
    await tick();
    htmx.trigger(malformed, 'refresh');
    await tick();
    expect(net.requests).toHaveLength(2);
  });

  it('partitions opted-in Vary headers into independent cache entries', async () => {
    mount(
      '<div id="english" hx-get="/greeting" hx-trigger="load, refresh" hx-swr="60" hx-swr-vary="Accept-Language" hx-headers=\'{"Accept-Language":"en"}\'></div>' +
      '<div id="french" hx-get="/greeting" hx-trigger="load, refresh" hx-swr="60" hx-swr-vary="Accept-Language" hx-headers=\'{"Accept-Language":"fr"}\'></div>'
    );
    await tick();
    expect(net.requests).toHaveLength(2);
    net.respond(0, 200, '<li>Hello</li>', { Vary: 'Accept-Language' });
    net.respond(1, 200, '<li>Bonjour</li>', { Vary: 'Accept-Language' });
    await tick();

    expect([...htmx.query.peek().keys()]).toEqual([
      'get:/greeting|vary:accept-language=en',
      'get:/greeting|vary:accept-language=fr',
    ]);
    htmx.trigger(document.querySelector('#english'), 'refresh');
    htmx.trigger(document.querySelector('#french'), 'refresh');
    await tick();
    expect(net.requests).toHaveLength(2);
    expect(document.querySelector('#english').innerHTML).toBe('<li>Hello</li>');
    expect(document.querySelector('#french').innerHTML).toBe('<li>Bonjour</li>');
  });

  it('rejects credential headers as cache vary dimensions', async () => {
    mount('<div hx-get="/account" hx-trigger="load" hx-swr="60" hx-swr-vary="Authorization" hx-headers=\'{"Authorization":"Bearer secret"}\'></div>');
    await tick();
    net.respond(0, 200, '<li>account</li>', { Vary: 'Authorization' });
    await tick();
    expect(htmx.query.peek().size).toBe(0);
  });

  it('caps hx-swr freshness at Cache-Control max-age', async () => {
    const el = mount('<div hx-get="/short" hx-trigger="load, refresh" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>short lived</li>', { 'Cache-Control': 'max-age=1' });
    await tick();
    htmx.query.peek().get('get:/short').time = Date.now() - 2_000;

    htmx.trigger(el, 'refresh');
    await tick();
    expect(net.requests).toHaveLength(2);
    net.respond(1, 200, '<li>refreshed</li>', { 'Cache-Control': 'max-age=1' });
    await tick();
  });

  it('accounts for origin Age before deciding a max-age response is fresh', async () => {
    const el = mount('<div hx-get="/aged" hx-trigger="load, refresh" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>already old</li>', { 'Cache-Control': 'max-age=60', Age: '61' });
    await tick();

    htmx.trigger(el, 'refresh');
    await tick();
    expect(net.requests).toHaveLength(2);
    net.respond(1, 200, '<li>fresh</li>', { 'Cache-Control': 'max-age=60' });
    await tick();
  });

  it('uses Expires relative to Date when Cache-Control has no max-age', async () => {
    const el = mount('<div hx-get="/expired" hx-trigger="load, refresh" hx-swr="60"></div>');
    const date = new Date(Date.now() - 60_000).toUTCString();
    const expires = new Date(Date.now() - 30_000).toUTCString();
    await tick();
    net.respond(0, 200, '<li>expired</li>', { Date: date, Expires: expires });
    await tick();

    htmx.trigger(el, 'refresh');
    await tick();
    expect(net.requests).toHaveLength(2);
    net.respond(1, 200, '<li>fresh</li>');
    await tick();
  });

  it.each(['no-cache', 'max-age=0, must-revalidate'])('validates %s before rendering a cached response', async (directive) => {
    const el = mount('<div hx-get="/validated" hx-trigger="load, refresh" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>cached</li>', { 'Cache-Control': directive, ETag: '"cached"' });
    await tick();
    el.innerHTML = '<li>unchanged while validating</li>';
    if (directive.includes('must-revalidate')) htmx.query.peek().get('get:/validated').time = 0;

    htmx.trigger(el, 'refresh');
    expect(el.innerHTML).toBe('<li>unchanged while validating</li>');
    await tick();
    expect(net.requests).toHaveLength(2);
    const header = Object.entries(net.requests[1].requestHeaders)
      .find(([name]) => name.toLowerCase() === 'if-none-match');
    expect(header?.[1]).toBe('"cached"');
    net.respond(1, 304, '', { ETag: '"cached"', 'Cache-Control': directive });
    await tick();
  });

  it('revalidates stale ETag entries conditionally and refreshes them on 304', async () => {
    const el = mount('<div hx-get="/etag" hx-trigger="load, refresh" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>v1</li>', { ETag: '"v1"' });
    await tick();
    htmx.query.peek().get('get:/etag').time = 0; // make the retained entry stale

    htmx.trigger(el, 'refresh');
    await tick();
    expect(net.requests).toHaveLength(2);
    const header = Object.entries(net.requests[1].requestHeaders)
      .find(([name]) => name.toLowerCase() === 'if-none-match');
    expect(header?.[1]).toBe('"v1"');

    net.respond(1, 304, '', { ETag: '"v1"' });
    await tick();
    expect(el.innerHTML).toBe('<li>v1</li>');
    expect(htmx.query.peek().get('get:/etag')).toBeDefined();

    htmx.trigger(el, 'refresh');
    await tick();
    expect(net.requests).toHaveLength(2); // 304 refreshed its age; fresh hit cancels the request
  });

  it('falls back to If-Modified-Since when a stale entry has no ETag', async () => {
    const modified = 'Wed, 21 Oct 2015 07:28:00 GMT';
    const el = mount('<div hx-get="/modified" hx-trigger="load, refresh" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>v1</li>', { 'Last-Modified': modified });
    await tick();
    htmx.query.peek().get('get:/modified').time = 0; // make the retained entry stale

    htmx.trigger(el, 'refresh');
    await tick();
    expect(net.requests).toHaveLength(2);
    const headers = net.requests[1].requestHeaders;
    const sent = (name) => Object.entries(headers).find(([header]) => header.toLowerCase() === name)?.[1];
    expect(sent('if-modified-since')).toBe(modified);
    expect(sent('if-none-match')).toBeUndefined();

    net.respond(1, 304, '', { 'Last-Modified': modified });
    await tick();
    expect(el.innerHTML).toBe('<li>v1</li>');
  });

  it('prefers the ETag when a response carries both validators', async () => {
    const el = mount('<div hx-get="/both" hx-trigger="load, refresh" hx-swr="60"></div>');
    await tick();
    net.respond(0, 200, '<li>v1</li>', { ETag: '"v1"', 'Last-Modified': 'Wed, 21 Oct 2015 07:28:00 GMT' });
    await tick();
    htmx.query.peek().get('get:/both').time = 0;

    htmx.trigger(el, 'refresh');
    await tick();
    const headers = net.requests[1].requestHeaders;
    const sent = (name) => Object.entries(headers).find(([header]) => header.toLowerCase() === name)?.[1];
    expect(sent('if-none-match')).toBe('"v1"');
    expect(sent('if-modified-since')).toBeUndefined();
    net.respond(1, 304, '', { ETag: '"v1"' });
    await tick();
  });

  it('does not touch elements without hx-swr', async () => {
    const el = mount('<div hx-get="/plain" hx-trigger="load, refresh"></div>');
    await tick();
    net.respond(0, 200, 'one');
    await tick();
    htmx.trigger(el, 'refresh');
    await tick();
    expect(net.requests.length).toBe(2); // no caching, every trigger hits network
    expect(htmx.query.peek().size).toBe(0);
  });

  it('hx-swr-key overrides the cache key', async () => {
    mount('<div hx-get="/todos?page=1" hx-trigger="load" hx-swr="60" hx-swr-key="todos"></div>');
    await tick();
    net.respond(0, 200, '<li>k</li>');
    await tick();
    expect([...htmx.query.peek().keys()]).toEqual(['todos']);
  });
});
