import { request } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDemoServer, escapeHtml } from '../examples/server.js';

let server;
let origin;

const send = ({ path, method = 'GET', body, headers = {} }) => new Promise((resolveRequest, reject) => {
  const req = request(`${origin}${path}`, { method, headers }, (res) => {
    let response = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { response += chunk; });
    res.on('end', () => resolveRequest({ body: response, headers: res.headers, status: res.statusCode }));
  });
  req.on('error', reject);
  if (body) req.write(body);
  req.end();
});

const mutationHeaders = () => ({
  'Content-Type': 'application/x-www-form-urlencoded',
  'HX-Request': 'true',
  Origin: origin,
});

describe('demo server security boundary', () => {
  beforeAll(async () => {
    server = createDemoServer();
    await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
    const { port } = server.address();
    origin = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolveClose) => server.close(resolveClose));
  });

  it('escapes user-controlled HTML', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('uses nonce-based CSP and baseline browser protections', async () => {
    const response = await send({ path: '/' });
    expect(response.status).toBe(200);
    expect(response.headers['content-security-policy']).toMatch(/script-src 'self' 'nonce-/);
    expect(response.headers['content-security-policy']).not.toContain('unsafe-inline');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.body).toContain('nonce="');
    expect(response.body).not.toContain('__CSP_NONCE__');
  });

  it('allows short-lived browser caching only for local static scripts', async () => {
    const page = await send({ path: '/' });
    const script = await send({ path: '/htmx.js?v=4.0.0-beta6' });
    expect(page.headers['cache-control']).toBe('no-store');
    expect(script.headers['cache-control']).toBe('public, max-age=3600');
  });

  it('returns escaped todo HTML only to same-origin htmx mutations', async () => {
    const response = await send({
      path: '/todos',
      method: 'POST',
      body: 'text=%3Cimg%20src%3Dx%20onerror%3Dalert%281%29%3E',
      headers: mutationHeaders(),
    });
    expect(response.status).toBe(200);
    expect(response.body).toBe('<li>&lt;img src=x onerror=alert(1)&gt;</li>');
  });

  it('serves a real 304 for a matching ETag', async () => {
    const first = await send({ path: '/etag' });
    const second = await send({ path: '/etag', headers: { 'If-None-Match': first.headers.etag } });
    expect(first.status).toBe(200);
    expect(second.status).toBe(304);
    expect(second.headers.etag).toBe(first.headers.etag);
  });

  it('rejects cross-origin or non-htmx mutations', async () => {
    const response = await send({
      path: '/todos',
      method: 'POST',
      body: 'text=blocked',
      headers: { ...mutationHeaders(), Origin: 'https://attacker.example' },
    });
    expect(response.status).toBe(403);
  });

  it('accepts same-origin provenance when a browser omits Origin', async () => {
    const headers = mutationHeaders();
    delete headers.Origin;
    const response = await send({
      path: '/todos',
      method: 'POST',
      body: 'text=referer-ok',
      headers: { ...headers, Referer: `${origin}/` },
    });
    expect(response.status).toBe(200);
    expect(response.body).toContain('referer-ok');
  });

  it('accepts explicit same-origin Fetch Metadata when Firefox sends Origin null', async () => {
    const response = await send({
      path: '/todos',
      method: 'POST',
      body: 'text=fetch-metadata-ok',
      headers: { ...mutationHeaders(), Origin: 'null', 'Sec-Fetch-Site': 'same-origin' },
    });
    expect(response.status).toBe(200);
    expect(response.body).toContain('fetch-metadata-ok');
  });

  it('rejects Origin null without same-origin provenance', async () => {
    const response = await send({
      path: '/todos',
      method: 'POST',
      body: 'text=fetch-metadata-blocked',
      headers: { ...mutationHeaders(), Origin: 'null', 'Sec-Fetch-Site': 'cross-site' },
    });
    expect(response.status).toBe(403);
  });

  it('rejects an absent Origin with a cross-origin Referer', async () => {
    const headers = mutationHeaders();
    delete headers.Origin;
    const response = await send({
      path: '/todos',
      method: 'POST',
      body: 'text=referer-blocked',
      headers: { ...headers, Referer: 'https://attacker.example/' },
    });
    expect(response.status).toBe(403);
  });

  it('rejects oversized request bodies', async () => {
    const response = await send({
      path: '/todos',
      method: 'POST',
      body: `text=${'a'.repeat(8 * 1024)}`,
      headers: mutationHeaders(),
    });
    expect(response.status).toBe(413);
  });
});
