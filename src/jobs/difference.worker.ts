import type { MaskStroke } from '../project/projectSchema';

type Request = {
  id: string;
  sourceA: string;
  sourceB: string;
  alignment: [number, number, number, number, number, number];
  thresholdLow: number;
  thresholdHigh: number;
  strokes: MaskStroke[];
};

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (value: unknown, transfer?: Transferable[]) => void;
};

async function decode(source: string, width: number, height: number) {
  const response = await fetch(source);
  if (!response.ok) throw new Error('Could not load an image for difference analysis.');
  const bitmap = await createImageBitmap(await response.blob(), { imageOrientation: 'from-image' });
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('OffscreenCanvas is unavailable.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return context.getImageData(0, 0, width, height).data;
}

function boxBlur(source: Float32Array, width: number, height: number, radius: number) {
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let row = 0;
    for (let x = 0; x < width; x += 1) {
      row += source[y * width + x];
      integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1] + row;
    }
  }
  const result = new Float32Array(source.length);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const x0 = Math.max(0, x - radius); const x1 = Math.min(width - 1, x + radius);
    const y0 = Math.max(0, y - radius); const y1 = Math.min(height - 1, y + radius);
    const stride = width + 1;
    const sum = integral[(y1 + 1) * stride + x1 + 1] - integral[y0 * stride + x1 + 1]
      - integral[(y1 + 1) * stride + x0] + integral[y0 * stride + x0];
    result[y * width + x] = sum / ((x1 - x0 + 1) * (y1 - y0 + 1));
  }
  return result;
}

function percentile(values: Float32Array, fraction: number) {
  const sample: number[] = [];
  const step = Math.max(1, Math.floor(values.length / 12000));
  for (let index = 0; index < values.length; index += step) sample.push(values[index]);
  sample.sort((a, b) => a - b);
  return sample[Math.min(sample.length - 1, Math.floor(sample.length * fraction))];
}

function smoothstep(low: number, high: number, value: number) {
  const normalized = Math.max(0, Math.min(1, (value - low) / Math.max(1e-5, high - low)));
  return normalized * normalized * (3 - 2 * normalized);
}

function extractRegions(mask: Uint8ClampedArray, width: number, height: number) {
  const visited = new Uint8Array(mask.length);
  const regions: Array<{ id: number; area: number; x: number; y: number; width: number; height: number; strength: number }> = [];
  const queue = new Int32Array(mask.length);
  for (let start = 0; start < mask.length; start += 1) {
    if (visited[start] || mask[start] < 70) continue;
    let head = 0; let tail = 0; queue[tail++] = start; visited[start] = 1;
    let area = 0; let sum = 0; let minX = width; let minY = height; let maxX = 0; let maxY = 0;
    while (head < tail) {
      const index = queue[head++]; const x = index % width; const y = Math.floor(index / width);
      area += 1; sum += mask[index]; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      const neighbors = [index - 1, index + 1, index - width, index + width];
      neighbors.forEach((next, direction) => {
        if (next < 0 || next >= mask.length || visited[next] || mask[next] < 70) return;
        if (direction === 0 && x === 0 || direction === 1 && x === width - 1) return;
        visited[next] = 1; queue[tail++] = next;
      });
    }
    if (area < 18) {
      for (let index = 0; index < tail; index += 1) mask[queue[index]] = 0;
      continue;
    }
    regions.push({ id: regions.length + 1, area, x: minX / width, y: minY / height, width: (maxX - minX + 1) / width, height: (maxY - minY + 1) / height, strength: sum / area / 255 });
  }
  return regions.sort((a, b) => b.area - a.area).slice(0, 24);
}

function applyStrokes(mask: Uint8ClampedArray, width: number, height: number, strokes: MaskStroke[]) {
  strokes.forEach((stroke) => stroke.points.forEach((point) => {
    const radius = Math.max(1, Math.round(stroke.radius * Math.min(width, height)));
    const centerX = Math.round(point.x * width);
    const centerY = Math.round((1 - point.y) * height);
    for (let y = Math.max(0, centerY - radius); y <= Math.min(height - 1, centerY + radius); y += 1) {
      for (let x = Math.max(0, centerX - radius); x <= Math.min(width - 1, centerX + radius); x += 1) {
        const distance = Math.hypot(x - centerX, y - centerY) / radius;
        if (distance > 1) continue;
        const influence = distance <= stroke.hardness ? 1 : 1 - (distance - stroke.hardness) / Math.max(0.01, 1 - stroke.hardness);
        const index = y * width + x;
        if (stroke.mode === 'reveal') mask[index] = Math.max(mask[index], Math.round(influence * 255));
        else mask[index] = Math.round(mask[index] * (1 - influence));
      }
    }
  }));
}

scope.onmessage = async ({ data }) => {
  const { id, sourceA, sourceB, alignment, thresholdLow, thresholdHigh, strokes } = data;
  try {
    const width = 512; const height = 512;
    scope.postMessage({ id, type: 'progress', stage: 'decode', progress: 0.12 });
    const [aPixels, bPixels] = await Promise.all([decode(sourceA, width, height), decode(sourceB, width, height)]);
    const raw = new Float32Array(width * height);
    const [a, b, c, d, tx, ty] = alignment;
    scope.postMessage({ id, type: 'progress', stage: 'residual', progress: 0.35 });
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width; const v = 1 - (y + 0.5) / height;
      const bu = a * u + c * v + tx; const bv = b * u + d * v + ty;
      if (bu < 0 || bu > 1 || bv < 0 || bv > 1) continue;
      const bx = Math.max(0, Math.min(width - 1, Math.round(bu * width - 0.5)));
      const by = Math.max(0, Math.min(height - 1, Math.round((1 - bv) * height - 0.5)));
      const ai = (y * width + x) * 4; const bi = (by * width + bx) * 4;
      const dr = Math.abs(aPixels[ai] - bPixels[bi]) / 255;
      const dg = Math.abs(aPixels[ai + 1] - bPixels[bi + 1]) / 255;
      const db = Math.abs(aPixels[ai + 2] - bPixels[bi + 2]) / 255;
      raw[y * width + x] = Math.max(dr, dg, db);
    }
    const fine = boxBlur(raw, width, height, 1);
    const medium = boxBlur(raw, width, height, 4);
    const broad = boxBlur(raw, width, height, 12);
    const noiseFloor = percentile(raw, 0.7);
    const low = Math.max(thresholdLow, noiseFloor * 1.45);
    const high = Math.max(thresholdHigh, low + 0.045);
    const mask = new Uint8ClampedArray(width * height);
    for (let index = 0; index < mask.length; index += 1) {
      const residual = fine[index] * 0.58 + medium[index] * 0.29 + broad[index] * 0.13;
      mask[index] = Math.round(smoothstep(low, high, residual) * 255);
    }
    scope.postMessage({ id, type: 'progress', stage: 'regions', progress: 0.74 });
    applyStrokes(mask, width, height, strokes);
    const regions = extractRegions(mask, width, height);
    const coverage = mask.reduce((sum, value) => sum + value / 255, 0) / mask.length;
    scope.postMessage({ id, type: 'result', width, height, mask: mask.buffer, regions, noiseFloor, effectiveLow: low, effectiveHigh: high, coverage }, [mask.buffer]);
  } catch (error) {
    scope.postMessage({ id, type: 'error', message: error instanceof Error ? error.message : 'Difference analysis failed.' });
  }
};

export {};
