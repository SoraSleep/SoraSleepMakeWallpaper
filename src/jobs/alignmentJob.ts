import type { MotionPairProject } from '../project/projectSchema';

export type AlignmentMetrics = {
  featureMatches: number;
  inlierRatio: number;
  reprojectionError: number;
  validCoverage: number;
  scale: number;
  rotation: number;
};

export type AlignmentResult = {
  transform: MotionPairProject['alignment']['transform'];
  status: MotionPairProject['alignment']['status'];
  metrics: AlignmentMetrics;
};

type WorkerMessage =
  | { id: string; type: 'progress'; stage: string; progress: number }
  | ({ id: string; type: 'result' } & AlignmentResult)
  | { id: string; type: 'error'; message: string };

export function runAlignmentJob(
  sourceA: string,
  sourceB: string,
  signal: AbortSignal,
  onProgress: (stage: string, progress: number) => void,
) {
  return new Promise<AlignmentResult>((resolve, reject) => {
    const id = globalThis.crypto?.randomUUID?.() ?? `alignment-${Date.now()}`;
    const worker = new Worker(new URL('./alignment.worker.ts', import.meta.url), { type: 'module' });
    const abort = () => { worker.terminate(); reject(new DOMException('Alignment cancelled.', 'AbortError')); };
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => {
      signal.removeEventListener('abort', abort);
      worker.terminate();
      reject(new Error('Alignment worker failed.'));
    };
    worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
      if (data.id !== id) return;
      if (data.type === 'progress') {
        onProgress(data.stage, data.progress);
        return;
      }
      signal.removeEventListener('abort', abort);
      worker.terminate();
      if (data.type === 'error') reject(new Error(data.message));
      else resolve({ transform: data.transform, status: data.status, metrics: data.metrics });
    };
    worker.postMessage({ id, sourceA, sourceB });
  });
}

