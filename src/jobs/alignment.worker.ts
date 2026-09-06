import cvModule from '@techstark/opencv-js';

type Point = { x: number; y: number };
type Pair = { from: Point; to: Point; distance: number };
type Similarity = { a: number; b: number; tx: number; ty: number };

type AlignmentRequest = { id: string; sourceA: string; sourceB: string };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<AlignmentRequest>) => void) | null;
  postMessage: (value: unknown) => void;
};

async function getOpenCv(): Promise<any> {
  let cv: any = cvModule;
  if (cv && typeof cv.then === 'function') cv = await cv;
  if (cv?.Mat) return cv;
  await new Promise<void>((resolve) => { cv.onRuntimeInitialized = resolve; });
  return cv;
}

async function sourceToImageData(source: string, maxEdge = 640) {
  const response = await fetch(source);
  if (!response.ok) throw new Error('Could not load an image for alignment.');
  const bitmap = await createImageBitmap(await response.blob(), { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('OffscreenCanvas is unavailable.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { imageData: context.getImageData(0, 0, width, height), width, height };
}

function modelFromTwoPairs(first: Pair, second: Pair): Similarity | null {
  const px = second.from.x - first.from.x;
  const py = second.from.y - first.from.y;
  const qx = second.to.x - first.to.x;
  const qy = second.to.y - first.to.y;
  const denominator = px * px + py * py;
  if (denominator < 1e-6) return null;
  const a = (px * qx + py * qy) / denominator;
  const b = (px * qy - py * qx) / denominator;
  return {
    a,
    b,
    tx: first.to.x - a * first.from.x + b * first.from.y,
    ty: first.to.y - b * first.from.x - a * first.from.y,
  };
}

function error(model: Similarity, pair: Pair) {
  const x = model.a * pair.from.x - model.b * pair.from.y + model.tx;
  const y = model.b * pair.from.x + model.a * pair.from.y + model.ty;
  return Math.hypot(x - pair.to.x, y - pair.to.y);
}

function refineSimilarity(pairs: Pair[]): Similarity {
  const fromCenter = pairs.reduce((sum, pair) => ({ x: sum.x + pair.from.x, y: sum.y + pair.from.y }), { x: 0, y: 0 });
  const toCenter = pairs.reduce((sum, pair) => ({ x: sum.x + pair.to.x, y: sum.y + pair.to.y }), { x: 0, y: 0 });
  fromCenter.x /= pairs.length; fromCenter.y /= pairs.length;
  toCenter.x /= pairs.length; toCenter.y /= pairs.length;
  let numeratorA = 0;
  let numeratorB = 0;
  let denominator = 0;
  pairs.forEach((pair) => {
    const px = pair.from.x - fromCenter.x;
    const py = pair.from.y - fromCenter.y;
    const qx = pair.to.x - toCenter.x;
    const qy = pair.to.y - toCenter.y;
    numeratorA += px * qx + py * qy;
    numeratorB += px * qy - py * qx;
    denominator += px * px + py * py;
  });
  const a = numeratorA / Math.max(denominator, 1e-9);
  const b = numeratorB / Math.max(denominator, 1e-9);
  return {
    a,
    b,
    tx: toCenter.x - a * fromCenter.x + b * fromCenter.y,
    ty: toCenter.y - b * fromCenter.x - a * fromCenter.y,
  };
}

function estimateRansac(pairs: Pair[]) {
  const threshold = 0.006;
  let seed = 0x4d595df4;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  let best: Pair[] = [];
  for (let iteration = 0; iteration < 700; iteration += 1) {
    const firstIndex = Math.floor(random() * pairs.length);
    let secondIndex = Math.floor(random() * pairs.length);
    if (secondIndex === firstIndex) secondIndex = (secondIndex + 1) % pairs.length;
    const model = modelFromTwoPairs(pairs[firstIndex], pairs[secondIndex]);
    if (!model) continue;
    const scale = Math.hypot(model.a, model.b);
    if (scale < 0.75 || scale > 1.3) continue;
    const inliers = pairs.filter((pair) => error(model, pair) < threshold);
    if (inliers.length > best.length) best = inliers;
  }
  if (best.length < 4) throw new Error('Not enough consistent feature matches.');
  const model = refineSimilarity(best);
  return { model, inliers: best, medianError: best.map((pair) => error(model, pair)).sort((a, b) => a - b)[Math.floor(best.length / 2)] };
}

function invertSimilarity(model: Similarity): [number, number, number, number, number, number] {
  const determinant = model.a * model.a + model.b * model.b;
  const a = model.a / determinant;
  const b = -model.b / determinant;
  const tx = -(a * model.tx - b * model.ty);
  const ty = -(b * model.tx + a * model.ty);
  return [a, b, -b, a, tx, ty];
}

function coverage(transform: [number, number, number, number, number, number]) {
  const [a, b, c, d, tx, ty] = transform;
  const grid = 20;
  let valid = 0;
  for (let y = 0; y < grid; y += 1) for (let x = 0; x < grid; x += 1) {
    const u = (x + 0.5) / grid;
    const v = (y + 0.5) / grid;
    const bu = a * u + c * v + tx;
    const bv = b * u + d * v + ty;
    if (bu >= 0 && bu <= 1 && bv >= 0 && bv <= 1) valid += 1;
  }
  return valid / (grid * grid);
}

scope.onmessage = async ({ data }) => {
  const { id, sourceA, sourceB } = data;
  const resources: any[] = [];
  try {
    scope.postMessage({ id, type: 'progress', stage: 'opencv', progress: 0.08 });
    const cv = await getOpenCv();
    scope.postMessage({ id, type: 'progress', stage: 'decode', progress: 0.2 });
    const [aImage, bImage] = await Promise.all([sourceToImageData(sourceA), sourceToImageData(sourceB)]);
    const a = cv.matFromImageData(aImage.imageData);
    const b = cv.matFromImageData(bImage.imageData);
    const grayA = new cv.Mat(); const grayB = new cv.Mat();
    const mask = new cv.Mat(); const descriptorsA = new cv.Mat(); const descriptorsB = new cv.Mat();
    const pointsA = new cv.KeyPointVector(); const pointsB = new cv.KeyPointVector();
    const orb = new cv.ORB(1600, 1.2, 8, 31, 0, 2, cv.ORB_HARRIS_SCORE, 31, 16);
    resources.push(a, b, grayA, grayB, mask, descriptorsA, descriptorsB, pointsA, pointsB, orb);
    cv.cvtColor(a, grayA, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(b, grayB, cv.COLOR_RGBA2GRAY);
    scope.postMessage({ id, type: 'progress', stage: 'features', progress: 0.42 });
    orb.detectAndCompute(grayA, mask, pointsA, descriptorsA);
    orb.detectAndCompute(grayB, mask, pointsB, descriptorsB);
    if (descriptorsA.empty() || descriptorsB.empty()) throw new Error('No usable visual features were found.');
    const matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
    const matches = new cv.DMatchVector();
    resources.push(matcher, matches);
    matcher.match(descriptorsB, descriptorsA, matches);
    const rawMatches: Array<{ queryIdx: number; trainIdx: number; distance: number }> = [];
    for (let index = 0; index < matches.size(); index += 1) rawMatches.push(matches.get(index));
    rawMatches.sort((first, second) => first.distance - second.distance);
    const kept = rawMatches.slice(0, Math.min(500, Math.max(40, Math.floor(rawMatches.length * 0.7))));
    const pairs: Pair[] = kept.map((match) => {
      const from = pointsB.get(match.queryIdx).pt;
      const to = pointsA.get(match.trainIdx).pt;
      return {
        from: { x: from.x / bImage.width, y: 1 - from.y / bImage.height },
        to: { x: to.x / aImage.width, y: 1 - to.y / aImage.height },
        distance: match.distance,
      };
    });
    if (pairs.length < 8) throw new Error('Fewer than 8 feature matches were found.');
    scope.postMessage({ id, type: 'progress', stage: 'ransac', progress: 0.7 });
    const result = estimateRansac(pairs);
    const transform = invertSimilarity(result.model);
    const validCoverage = coverage(transform);
    const inlierRatio = result.inliers.length / pairs.length;
    const reprojectionError = result.medianError * Math.max(aImage.width, aImage.height);
    const scale = Math.hypot(result.model.a, result.model.b);
    const rotation = Math.atan2(result.model.b, result.model.a) * 180 / Math.PI;
    const status = pairs.length >= 40 && inlierRatio >= 0.5 && reprojectionError <= 3 && validCoverage >= 0.8
      ? 'good'
      : pairs.length >= 12 && inlierRatio >= 0.25 && reprojectionError <= 8 && validCoverage >= 0.6
        ? 'review'
        : 'rejected';
    scope.postMessage({
      id, type: 'result', progress: 1, transform, status,
      metrics: { featureMatches: pairs.length, inlierRatio, reprojectionError, validCoverage, scale, rotation },
    });
  } catch (error) {
    scope.postMessage({ id, type: 'error', message: error instanceof Error ? error.message : 'Alignment failed.' });
  } finally {
    resources.reverse().forEach((resource) => resource?.delete?.());
  }
};

export {};
