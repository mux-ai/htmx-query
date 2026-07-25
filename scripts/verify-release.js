import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const packageJson = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'));
const expectedTag = `v${packageJson.version}`;
if (process.env.RELEASE_TAG !== expectedTag) {
  throw new Error(`RELEASE_TAG must equal ${expectedTag}; received ${process.env.RELEASE_TAG || '(unset)'}.`);
}

await import('./verify-package.js');
