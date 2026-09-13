import type { IncomingMessage, ServerResponse } from 'node:http';

export function createWallpaperBridge(options?: { dataRoot?: string }): (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => Promise<void>;

export function bridgeStatus(dataRoot: string): {
  projectCount: number;
  exportCount: number;
  projects: unknown[];
  exports: unknown[];
};
