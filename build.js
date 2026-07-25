import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const shared = { entryPoints: ['src/index.js'], bundle: true, target: 'es2018' };

await Promise.all([
  // script-tag / CDN builds — the primary distribution; self-register on window.htmx
  build({ ...shared, format: 'iife', minify: true, outfile: 'dist/htmx-query.min.js' }),
  build({ ...shared, format: 'iife', outfile: 'dist/htmx-query.iife.js' }),
  // bundler users
  build({ ...shared, format: 'esm', outfile: 'dist/htmx-query.js' }),
  build({ ...shared, format: 'cjs', outfile: 'dist/htmx-query.cjs' }),
]);

// One declaration copy per module format: .d.ts for ESM, .d.cts so
// node16/nodenext CommonJS consumers do not see the types masquerade as ESM.
const declarations = await readFile('src/index.d.ts');
await writeFile('dist/htmx-query.d.ts', declarations);
await writeFile('dist/htmx-query.d.cts', declarations);

// SRI for every script-tag artifact; unpkg serves htmx-query.min.js by default.
for (const file of ['htmx-query.min.js', 'htmx-query.iife.js']) {
  const content = await readFile(`dist/${file}`);
  const integrity = `sha384-${createHash('sha384').update(content).digest('base64')}`;
  await writeFile(`dist/${file}.sri`, `${integrity}\n`);
}
