import { serializeProject, type MotionPairProject } from './projectSchema';

async function put(url: string, body: BodyInit, contentType: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, 'X-SoraSleep-Bridge': '1', ...headers },
    body,
  });
  if (!response.ok) throw new Error(`Manager bridge HTTP ${response.status}`);
  return response.json() as Promise<{ ok: true; bytes: number; sha256: string }>;
}

export async function syncProjectToManager(project: MotionPairProject) {
  return put(`/bridge/projects/${encodeURIComponent(project.id)}`, serializeProject(project), 'application/json');
}

export async function syncExportToManager(project: MotionPairProject, kind: 'desktop-web' | 'mobile-bundle', fileName: string, blob: Blob) {
  return put(`/bridge/exports/${encodeURIComponent(project.id)}/${kind}`, blob, 'application/zip', { 'X-File-Name': fileName });
}
