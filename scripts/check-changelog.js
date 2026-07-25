import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const packageJson = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'));
const changelog = await readFile(join(process.cwd(), 'CHANGELOG.md'), 'utf8');
const version = packageJson.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

if (!new RegExp(`^## ${version}$`, 'm').test(changelog)) {
  throw new Error(`CHANGELOG.md must contain a level-two heading for ${packageJson.version}.`);
}
