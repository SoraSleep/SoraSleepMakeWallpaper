export function inspectPairPixels(a: Uint8ClampedArray, b: Uint8ClampedArray, mask: Uint8ClampedArray) {
  if (a.length !== b.length || a.length !== mask.length || a.length % 4) throw new Error('Invalid pair buffers.');
  const difference = new Uint8ClampedArray(a.length / 4);
  let changed = 0, outside = 0, protectedPixels = 0;
  for (let i = 0; i < a.length; i += 4) {
    const delta = Math.max(Math.abs(a[i]-b[i]), Math.abs(a[i+1]-b[i+1]), Math.abs(a[i+2]-b[i+2]));
    const allowed = mask[i] / 255 * mask[i+3] / 255;
    difference[i/4] = Math.round(Math.max(0, Math.min(1, (delta-12)/32)) * allowed * 255);
    if (delta > 24) changed++;
    if (allowed < 0.1) { protectedPixels++; if (delta > 24) outside++; }
  }
  return { difference, changedFraction: changed/(a.length/4), protectedChangeFraction: outside/Math.max(1,protectedPixels) };
}
