import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const browser = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(existsSync);
if (!browser) throw new Error('Edge or Chrome is required for visual matrix tests.');
const output = path.join(root, 'visual-baselines');
mkdirSync(output, { recursive: true });
const cases = [
  ['16x9', 1600, 900],
  ['21x9', 1680, 720],
  ['32x9', 2560, 720],
  ['9x16', 432, 768],
];
const pointers = [['center', '0.5,0.5'], ['corner', '0.03,0.97'], ['edge', '0.97,0.5']];
for (const [name, width, height] of cases) {
  for (const [pointerName, pointer] of pointers) {
    const id = `${name}-${pointerName}`;
    const profile = path.join(output, `.profile-${id}`);
    mkdirSync(profile, { recursive: true });
    execFileSync(browser, [
      '--headless=new', '--no-sandbox', `--user-data-dir=${profile}`,
      '--disable-gpu-sandbox', '--enable-unsafe-swiftshader',
      `--window-size=${width},${height}`, '--virtual-time-budget=5000',
      `--screenshot=${path.join(output, `${id}.png`)}`, `http://127.0.0.1:5173/?pointer=${pointer}`,
    ], { stdio: 'ignore' });
    console.log(`PASS ${id} ${width}x${height} pointer=${pointerName}`);
  }
}
