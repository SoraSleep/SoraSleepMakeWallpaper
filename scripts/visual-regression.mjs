import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'visual-baselines');
const manifestPath = path.join(dir, 'checksums.json');
const screenshots = ['16x9-center', '16x9-corner', '16x9-edge', '21x9-center', '21x9-corner', '21x9-edge', '32x9-center', '32x9-corner', '32x9-edge', '9x16-center', '9x16-corner', '9x16-edge'];
const hashes = Object.fromEntries(screenshots.map((name) => {
  const file = path.join(dir, `${name}.png`);
  if (!existsSync(file)) throw new Error(`Missing screenshot: ${name}.png`);
  return [name, createHash('sha256').update(readFileSync(file)).digest('hex')];
}));
if (process.argv.includes('--update') || !existsSync(manifestPath)) {
  writeFileSync(manifestPath, `${JSON.stringify(hashes, null, 2)}\n`);
  console.log('UPDATED visual-baselines/checksums.json');
} else {
  const expected = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const changed = screenshots.filter((name) => expected[name] !== hashes[name]);
  if (changed.length) throw new Error(`Visual regression detected: ${changed.join(', ')}`);
  console.log(`PASS visual regression (${screenshots.length} screenshots)`);
}
