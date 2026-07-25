import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = process.cwd();
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const requiredFiles = [
  'package.json', 'README.md', 'LICENSE', 'CHANGELOG.md', 'RELEASING.md', 'llms.txt', 'llm.txt',
  'src/index.d.ts', 'dist/htmx-query.min.js', 'dist/htmx-query.min.js.sri',
  'dist/htmx-query.iife.js', 'dist/htmx-query.iife.js.sri',
  'dist/htmx-query.js', 'dist/htmx-query.cjs',
];
const sriFiles = ['dist/htmx-query.min.js', 'dist/htmx-query.iife.js'];

let tarball;
let consumer;
try {
  const { stdout } = await exec('npm', ['pack', '--json'], { cwd: root });
  const packed = JSON.parse(stdout)[0];
  tarball = resolve(root, packed.filename);
  const paths = new Set(packed.files.map(({ path }) => path));
  const missing = requiredFiles.filter((path) => !paths.has(path));
  if (missing.length) throw new Error(`Packed artifact is missing: ${missing.join(', ')}`);

  consumer = await mkdtemp(join(tmpdir(), 'htmx-query-smoke-'));
  await exec('npm', ['init', '--yes'], { cwd: consumer });
  await exec('npm', ['install', '--ignore-scripts', '--legacy-peer-deps', '--package-lock=false', tarball], { cwd: consumer });
  const installed = join(consumer, 'node_modules', packageJson.name);
  for (const file of sriFiles) {
    const content = await readFile(join(installed, file));
    const actual = (await readFile(join(installed, `${file}.sri`), 'utf8')).trim();
    const expected = `sha384-${createHash('sha384').update(content).digest('base64')}`;
    if (actual !== expected) throw new Error(`SRI mismatch for ${file}`);
  }
  await exec('node', ['--input-type=module', '-e', "import { register } from 'htmx-query'; if (typeof register !== 'function') process.exit(1)"], { cwd: consumer });
  await exec('node', ['-e', "const { register } = require('htmx-query'); if (typeof register !== 'function') process.exit(1)"], { cwd: consumer });
  console.log(`Verified packed files, SRI, ESM, and CJS for ${packageJson.name}@${packageJson.version}.`);
} finally {
  if (consumer) await rm(consumer, { recursive: true, force: true });
  if (tarball) await rm(tarball, { force: true });
}
