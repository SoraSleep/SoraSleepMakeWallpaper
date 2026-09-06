import type { MaskStroke, MotionPairProject } from '../project/projectSchema';

export type DifferenceRegion = { id: number; area: number; x: number; y: number; width: number; height: number; strength: number };
export type DifferenceResult = {
  width: number; height: number; data: Uint8ClampedArray; regions: DifferenceRegion[];
  noiseFloor: number; effectiveLow: number; effectiveHigh: number; coverage: number;
};

export function runDifferenceJob(
  sourceA: string,
  sourceB: string,
  alignment: MotionPairProject['alignment']['transform'],
  thresholds: Pick<MotionPairProject['difference'], 'thresholdLow' | 'thresholdHigh'>,
  strokes: MaskStroke[],
  signal: AbortSignal,
  onProgress: (stage: string, progress: number) => void,
) {
  return new Promise<DifferenceResult>((resolve, reject) => {
    const id = globalThis.crypto?.randomUUID?.() ?? `difference-${Date.now()}`;
    const worker = new Worker(new URL('./difference.worker.ts', import.meta.url), { type: 'module' });
    const abort = () => { worker.terminate(); reject(new DOMException('Difference analysis cancelled.', 'AbortError')); };
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => { worker.terminate(); reject(new Error('Difference worker failed.')); };
    worker.onmessage = ({ data }) => {
      if (data.id !== id) return;
      if (data.type === 'progress') { onProgress(data.stage, data.progress); return; }
      signal.removeEventListener('abort', abort); worker.terminate();
      if (data.type === 'error') reject(new Error(data.message));
      else resolve({ ...data, data: new Uint8ClampedArray(data.mask) });
    };
    worker.postMessage({ id, sourceA, sourceB, alignment, ...thresholds, strokes });
  });
}

