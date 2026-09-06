import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(root, 'src/project/projectFile.ts'), 'utf8');
const match = source.match(/const portalRuntime = `([\s\S]*?)`;\r?\n\s*const html/);
if (!match) throw new Error('Portal export runtime was not found.');
new Function(match[1]);

const browser = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(existsSync);
if (!browser) throw new Error('Edge or Chrome is required.');

const output = path.join(root, 'portal-export-smoke');
mkdirSync(path.join(output, 'assets'), { recursive: true });
copyFileSync(path.join(root, 'public/demo/wallpaper.jpg'), path.join(output, 'assets/image-a.jpg'));
copyFileSync(path.join(root, 'public/demo/wallpaper-variant-pink.png'), path.join(output, 'assets/image-b-aligned.png'));

const config = {
  preset: 'portal-reveal',
  canvas: { fit: 'cover' },
  lens: { radius: 22, feather: 18, magnification: 100, revealIntensity: 100, followSpeed: 78 },
  portal: { glow: 90, ripple: 70 },
  mobileMotion: { path: 'guided', duration: 8, loop: 'repeat' },
  assets: { imageA: 'assets/image-a.jpg', imageB: 'assets/image-b-aligned.png' },
};
writeFileSync(path.join(output, 'runtime.js'), match[1]);
writeFileSync(path.join(output, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,canvas{margin:0;width:100%;height:100%;overflow:hidden;background:#0b0d10}canvas{display:block;touch-action:none}</style><canvas></canvas><script>window.WALLPAPER_CONFIG=${JSON.stringify(config)}</script><script src="runtime.js"></script>`);

for (const [name, width, height] of [
  ['16x9', 1280, 720],
  ['21x9', 1680, 720],
  ['32x9', 2560, 720],
  ['9x16', 432, 768],
]) {
  const screenshot = path.join(output, `${name}.png`);
  const profile = path.join(output, `.profile-${name}`);
  mkdirSync(profile, { recursive: true });
  execFileSync(browser, [
    '--headless=new', '--no-sandbox', '--allow-file-access-from-files', '--disable-gpu-sandbox', `--user-data-dir=${profile}`,
    '--enable-unsafe-swiftshader', `--window-size=${width},${height}`, '--virtual-time-budget=3500',
    `--screenshot=${screenshot}`, `file:///${path.join(output, 'index.html').replaceAll('\\', '/')}`,
  ], { stdio: 'ignore' });
  const deadline = Date.now() + 8000;
  while ((!existsSync(screenshot) || statSync(screenshot).size < 10_000) && Date.now() < deadline) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  if (!existsSync(screenshot) || statSync(screenshot).size < 10_000) throw new Error(`${name} screenshot is missing or empty.`);
  console.log(`PASS portal export runtime ${name} ${width}x${height}`);
}
