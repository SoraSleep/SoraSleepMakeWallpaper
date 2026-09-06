import type { ProjectAsset } from '../project/projectSchema';

export type JobProgress = {
  stage: 'validate' | 'read' | 'decode' | 'complete';
  progress: number;
};

type WorkerMessage =
  | { id: string; type: 'progress'; stage: JobProgress['stage']; progress: number }
  | { id: string; type: 'result'; source: string; width: number; height: number }
  | { id: string; type: 'error'; message: string };

export async function importImageJob(
  file: File,
  signal: AbortSignal,
  onProgress: (progress: JobProgress) => void,
): Promise<ProjectAsset> {
  return new Promise<ProjectAsset>((resolve, reject) => {
    const id = globalThis.crypto?.randomUUID?.() ?? `image-job-${Date.now()}`;
    const worker = new Worker(new URL('./imageImport.worker.ts', import.meta.url), { type: 'module' });
    const abort = () => {
      worker.terminate();
      reject(new DOMException('Image import cancelled.', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => {
      signal.removeEventListener('abort', abort);
      worker.terminate();
      reject(new Error('Image import worker failed.'));
    };
    worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
      if (data.id !== id) return;
      if (data.type === 'progress') {
        onProgress({ stage: data.stage, progress: data.progress });
        return;
      }
      signal.removeEventListener('abort', abort);
      worker.terminate();
      if (data.type === 'error') {
        reject(new Error(data.message));
        return;
      }
      resolve({
        name: file.name,
        source: data.source,
        mimeType: file.type,
        width: data.width,
        height: data.height,
        size: file.size,
        rights: 'unknown',
      });
    };
    worker.postMessage({ id, file });
  });
}
