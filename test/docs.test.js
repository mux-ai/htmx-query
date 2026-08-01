import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const readProjectFile = (path) => readFile(join(process.cwd(), path), 'utf8');

describe('documentation surface', () => {
  it('ships a landing page with installation and feature examples', async () => {
    const page = await readProjectFile('docs/index.html');
    expect(page).toContain('htmx-query');
    expect(page).toContain('hx-ext="query"');
    expect(page).toContain('hx-swr');
    expect(page).toContain('hx-retry');
    expect(page).toContain('hx-optimistic');
    expect(page).toContain('llms.txt');
    expect(page).toContain('Run the demo locally');
    expect(page).toContain('htmx.org@2.0.10');
    expect(page).toContain('134/134');
    expect(page).toContain('7.13 kB');
    expect(page).toContain('setNamespace');
    expect(page).toContain('If-None-Match');
    expect(page).toContain('hq:cache');
    expect(page).toContain('hx-swr-vary');
    expect(page).toContain('1 MiB');
    expect(page).toContain('hx-swr-prefetch="hover focus visible"');
  });

  it('links the interactive demo back to the landing page with the shared theme', async () => {
    const demo = await readProjectFile('examples/demo.html');
    expect(demo).toContain('href="/docs"');
    expect(demo).toContain('--mint: #64e2b7');
    expect(demo).toContain("setAttribute('hx-ext', 'query')");
    expect(demo).toContain('/htmx.js?v=4.0.0-beta6');
    expect(demo).toContain('/htmx-query.js?v=0.2.0');
    expect(demo).toContain('/tasks/reorder');
    expect(demo).toContain('How to verify:');
    expect(demo).toContain('<summary>Show code</summary>');
    expect(demo).toContain('data-copy-target="#drag-code-source"');
    expect(demo).toContain("closest('[data-move]')");
    expect(demo).toContain("dataTransfer.setData('text/plain'");
  });

  it('copies the displayed drag example and announces success', async () => {
    const page = await readProjectFile('examples/demo.html');
    const script = page.match(/<script nonce="__CSP_NONCE__">\s*([\s\S]*?)\s*<\/script>/)?.[1];
    expect(script).toBeTruthy();

    const dom = new JSDOM(page, { runScripts: 'outside-only' });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(dom.window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(dom.window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    dom.window.eval(script);

    const button = dom.window.document.querySelector('[data-copy-target]');
    const source = dom.window.document.querySelector('#drag-code-source');
    expect(source.querySelector('.tok-tag')).not.toBeNull();
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(writeText).toHaveBeenCalledWith(source.textContent);
    expect(dom.window.document.querySelector('#drag-copy-status').textContent)
      .toBe('Copied to clipboard.');
    dom.window.close();
  });

  it('renders accessible fallback controls for the native drag demo', async () => {
    const server = await readProjectFile('examples/server.js');
    expect(server).toContain('data-move="up"');
    expect(server).toContain('data-move="down"');
    expect(server).toContain('aria-label="Move ${task.title} up"');
    expect(server).toContain('HX-Cache-Invalidate');
  });

  it('ships an AI-agent guide and singular compatibility pointer', async () => {
    const guide = await readProjectFile('llms.txt');
    const pointer = await readProjectFile('llm.txt');
    expect(guide).toContain('## Binding behavior and invariants');
    expect(guide).toContain('npm run prepublishOnly');
    expect(guide).toContain('at most 16 selector variants');
    expect(guide).toContain('hq:prefetch');
    expect(pointer).toContain('llms.txt');
  });

  it('ships production and maintainer release recipes', async () => {
    const production = await readProjectFile('docs/production.md');
    const releasing = await readProjectFile('RELEASING.md');
    expect(production).toContain('htmx-query.min.js.sri');
    expect(production).toContain('setNamespace');
    expect(production).toContain('HX-Cache-Invalidate');
    expect(releasing).toContain('Trusted Publishing');
    expect(releasing).toContain('release:verify');
  });

  it('ships a staged and reversible htmx 4 migration guide', async () => {
    const guide = await readProjectFile('docs/migrating-to-htmx-4.md');
    const readme = await readProjectFile('README.md');
    const changelog = await readProjectFile('CHANGELOG.md');

    expect(guide).toContain('htmx.org >=2.0.0 <3');
    expect(guide).toContain('4.0.0-beta6');
    expect(guide).toContain('hx-ext="query"');
    expect(guide).toContain('htmx:after:request');
    expect(guide).toContain('event.detail.ctx.response.status');
    expect(guide).toContain('hx-select:inherited');
    expect(guide).toContain('htmx.config.defaultTimeout');
    expect(guide).toContain('upgrade-check');
    expect(guide).toContain('## Rollback');
    expect(readme).toContain('docs/migrating-to-htmx-4.md');
    expect(changelog).toContain('docs/migrating-to-htmx-4.md');
  });
});
