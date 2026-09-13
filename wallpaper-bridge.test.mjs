import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { bridgeStatus, createWallpaperBridge } from './wallpaper-bridge.mjs';

test('bridge saves projects and exports only from its local origin', async () => {
  const dataRoot = mkdtempSync(path.join(os.tmpdir(), 'wallpaper-bridge-'));
  const bridge = createWallpaperBridge({ dataRoot });
  const server = createServer((request, response) => bridge(request, response, () => { response.statusCode = 404; response.end(); }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const headers = { Origin: origin, 'X-SoraSleep-Bridge': '1' };
  try {
    const project = { schemaVersion: 2, id, title: 'Test project', updatedAt: '2026-09-13T00:00:00.000Z', assets: { imageA: {}, imageB: {} }, preset: { id: 'portal-reveal' } };
    const denied = await fetch(`${origin}/bridge/projects/${id}`, { method: 'PUT', headers: { ...headers, Origin: 'http://evil.invalid', 'Content-Type': 'application/json' }, body: JSON.stringify(project) });
    assert.equal(denied.status, 403);
    const saved = await fetch(`${origin}/bridge/projects/${id}`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(project) });
    assert.equal(saved.status, 200);
    assert.equal(JSON.parse(readFileSync(path.join(dataRoot, 'Projects', id, 'current.wallproj'), 'utf8')).title, 'Test project');
    const older = await fetch(`${origin}/bridge/projects/${id}`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...project, updatedAt: '2026-09-12T00:00:00.000Z' }) });
    assert.equal(older.status, 409);
    const exported = await fetch(`${origin}/bridge/exports/${id}/desktop-web`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/zip', 'X-File-Name': '../scene.zip' }, body: Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]) });
    assert.equal(exported.status, 201);
    const status = bridgeStatus(dataRoot);
    assert.equal(status.projectCount, 1);
    assert.equal(status.exportCount, 1);
    assert.match(status.exports[0].fileName, /scene\.zip$/);
    assert.equal((await fetch(`${origin}/health`)).status, 200);
    assert.equal((await fetch(`${origin}/jobs`)).status, 501);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
