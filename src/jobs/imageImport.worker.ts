type ImportRequest = { id: string; file: File };

type WorkerResponse =
  | { id: string; type: 'progress'; stage: 'validate' | 'read' | 'decode' | 'complete'; progress: number }
  | { id: string; type: 'result'; source: string; width: number; height: number }
  | { id: string; type: 'error'; message: string };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<ImportRequest>) => void) | null;
  postMessage: (response: WorkerResponse) => void;
};

function progress(id: string, stage: 'validate' | 'read' | 'decode' | 'complete', value: number) {
  workerScope.postMessage({ id, type: 'progress', stage, progress: value });
}

workerScope.onmessage = async ({ data }) => {
  const { id, file } = data;
  try {
    progress(id, 'validate', 0.05);
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      throw new Error('Only PNG, JPEG and WebP images are supported.');
    }
    if (file.size > 24 * 1024 * 1024) throw new Error('Image exceeds the 24 MB project safety limit.');

    progress(id, 'read', 0.2);
    const Reader = (globalThis as unknown as {
      FileReaderSync: new () => { readAsDataURL(blob: Blob): string };
    }).FileReaderSync;
    const source = new Reader().readAsDataURL(file);

    progress(id, 'decode', 0.7);
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const width = bitmap.width;
    const height = bitmap.height;
    bitmap.close();
    if (width < 512 || height < 512) throw new Error('Image must be at least 512 × 512 pixels.');
    if (width > 8192 || height > 8192) throw new Error('Image dimensions cannot exceed 8192 pixels.');

    progress(id, 'complete', 1);
    workerScope.postMessage({ id, type: 'result', source, width, height });
  } catch (error) {
    workerScope.postMessage({
      id,
      type: 'error',
      message: error instanceof Error ? error.message : 'Image import failed.',
    });
  }
};

export {};
