// Tiny local-only demo server: npm run demo -> http://127.0.0.1:8484
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(root, '..');
const MAX_BODY_BYTES = 8 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

let todos = ['Learn htmx', 'Ship htmx-query'];
let tasks = [
  { id: 'design', title: 'Sketch the API' },
  { id: 'build', title: 'Build the first flow' },
  { id: 'ship', title: 'Ship the demo' },
];
let flakyHits = 0;
const etag = '"demo-etag-v1"';

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => htmlEntities[char]);

const commonHeaders = {
  'Cache-Control': 'no-store',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

const contentSecurityPolicy = (nonce) => [
  "default-src 'self'",
  "base-uri 'none'",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "object-src 'none'",
  `script-src 'self' 'nonce-${nonce}'`,
  `style-src 'self' 'nonce-${nonce}'`,
].join('; ');

const html = (res, body, status = 200, headers = {}, nonce = randomBytes(16).toString('base64')) => {
  res.writeHead(status, {
    ...commonHeaders,
    'Content-Security-Policy': contentSecurityPolicy(nonce),
    'Content-Type': 'text/html; charset=utf-8',
    ...headers,
  });
  res.end(body);
};

const text = (res, body, contentType, status = 200, headers = {}) => {
  res.writeHead(status, { ...commonHeaders, 'Content-Type': contentType, ...headers });
  res.end(body);
};

const renderDocument = async (path) => {
  const nonce = randomBytes(16).toString('base64');
  const body = (await readFile(path, 'utf8')).replaceAll('__CSP_NONCE__', nonce);
  return { body, nonce };
};

const readBody = async (req) => {
  const declaredLength = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    req.resume();
    return null;
  }

  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= MAX_BODY_BYTES) chunks.push(chunk);
  }
  return size <= MAX_BODY_BYTES ? Buffer.concat(chunks).toString('utf8') : null;
};

const trustedMutation = (req) => {
  const origin = `http://${req.headers.host}`;
  const requestOrigin = req.headers.origin;
  let sameOrigin = requestOrigin === origin;
  if (!requestOrigin || requestOrigin === 'null') {
    sameOrigin = req.headers['sec-fetch-site'] === 'same-origin';
    if (!sameOrigin && req.headers.referer) {
      try {
        sameOrigin = new URL(req.headers.referer).origin === origin;
      } catch {
        sameOrigin = false;
      }
    }
  }
  return sameOrigin && req.headers['hx-request'] === 'true';
};

const renderTodos = () =>
  todos.map((todo) => `<li>${escapeHtml(todo)}</li>`).join('') +
  `<li><small>rendered ${new Date().toLocaleTimeString()}</small></li>`;

const renderTasks = () =>
  tasks.map((task) =>
    `<li draggable="true" data-task-id="${task.id}"><span class="drag-handle" aria-hidden="true">⠿</span><span class="task-title">${task.title}</span><span class="task-actions"><button type="button" data-move="up" aria-label="Move ${task.title} up">↑</button><button type="button" data-move="down" aria-label="Move ${task.title} down">↓</button></span></li>`
  ).join('');

export const createDemoServer = () => {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');

      if (url.pathname === '/') {
        const page = await renderDocument(join(root, 'demo.html'));
        return html(res, page.body, 200, {}, page.nonce);
      }
      if (url.pathname === '/docs' || url.pathname === '/docs/') {
        const page = await renderDocument(join(projectRoot, 'docs', 'index.html'));
        return html(res, page.body, 200, {}, page.nonce);
      }
      if (url.pathname === '/README.md' || url.pathname === '/llms.txt' || url.pathname === '/llm.txt') {
        const name = url.pathname.slice(1);
        return text(res, await readFile(join(projectRoot, name), 'utf8'), 'text/plain; charset=utf-8');
      }
      if (url.pathname === '/htmx-query.js') {
        return text(
          res,
          await readFile(join(projectRoot, 'dist', 'htmx-query.iife.js')),
          'text/javascript; charset=utf-8',
          200,
          { 'Cache-Control': 'public, max-age=3600' },
        );
      }
      if (url.pathname === '/htmx.js') {
        return text(
          res,
          await readFile(join(projectRoot, 'node_modules', 'htmx.org', 'dist', 'htmx.min.js')),
          'text/javascript; charset=utf-8',
          200,
          { 'Cache-Control': 'public, max-age=3600' },
        );
      }
      if (url.pathname === '/todos' && req.method === 'GET') {
        await sleep(800); // make the cache visible
        return html(res, renderTodos(), 200, { 'Cache-Control': 'public, max-age=60' });
      }
      if (url.pathname === '/todos' && req.method === 'POST') {
        if (!trustedMutation(req)) return html(res, 'forbidden', 403);
        const body = await readBody(req);
        if (body === null) return html(res, 'request body too large', 413);
        const todo = new URLSearchParams(body).get('text') || 'untitled';
        await sleep(1000); // make the optimistic row visible
        todos.push(todo);
        return html(res, `<li>${escapeHtml(todo)}</li>`, 200, { 'HX-Trigger': 'todosMutated' });
      }
      if (url.pathname === '/tasks' && req.method === 'GET') {
        await sleep(500); // make the cached order visible
        return html(res, renderTasks(), 200, { 'Cache-Control': 'public, max-age=60' });
      }
      if (url.pathname === '/etag' && req.method === 'GET') {
        if (req.headers['if-none-match'] === etag) {
          return html(res, '', 304, { 'Cache-Control': 'public, max-age=60', ETag: etag });
        }
        return html(res, '<li>ETag response v1</li>', 200, { 'Cache-Control': 'public, max-age=60', ETag: etag });
      }
      if (url.pathname === '/tasks/reorder' && req.method === 'POST') {
        if (!trustedMutation(req)) return html(res, 'forbidden', 403);
        const body = await readBody(req);
        if (body === null) return html(res, 'request body too large', 413);
        const ids = (new URLSearchParams(body).get('order') || '').split(',').filter(Boolean);
        const byId = new Map(tasks.map((task) => [task.id, task]));
        if (ids.length !== tasks.length || new Set(ids).size !== tasks.length || ids.some((id) => !byId.has(id))) {
          return html(res, 'invalid task order', 400);
        }
        tasks = ids.map((id) => byId.get(id));
        // A zero-length 200 keeps the response header observable in engines
        // that do not surface custom headers consistently on 204 responses.
        return html(res, '', 200, { 'HX-Cache-Invalidate': '{"path":"/tasks","mode":"path"}' });
      }
      if (url.pathname === '/flaky') {
        flakyHits += 1;
        if (flakyHits % 3 !== 0) return html(res, 'flaky failure', 500);
        return html(res, `<b>succeeded on hit #${flakyHits}</b>`);
      }
      return html(res, 'not found', 404);
    } catch {
      return html(res, 'internal server error', 500);
    }
  });

  server.headersTimeout = REQUEST_TIMEOUT_MS;
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  return server;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8484);
  const host = process.env.HOST || '127.0.0.1';
  createDemoServer().listen(port, host, () => console.log(`demo on http://${host}:${port}`));
}
