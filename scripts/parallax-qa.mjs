import { readFile } from 'node:fs/promises';

const checks = [
  ['schema parallax settings', 'src/project/projectSchema.ts', ['ParallaxSettings', "quality: 'economy' | 'standard' | 'premium'", 'distortionMask']],
  ['renderer camera and depth wiring', 'src/ParallaxCanvas.tsx', ['cameraMode', 'deviceorientation', 'drawDisplaced', 'distortionMask']],
  ['composer controls', 'src/App.tsx', ['LAYER COMPOSER', 'DepthMapEditor', 'Auto fix', 'Enable gyroscope']],
];

for (const [label, file, needles] of checks) {
  const source = await readFile(file, 'utf8');
  for (const needle of needles) {
    if (!source.includes(needle)) throw new Error(`FAIL ${label}: missing ${needle}`);
  }
  console.log(`PASS ${label}`);
}

console.log('Parallax QA wiring checks passed.');
