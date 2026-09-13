import { createHash, randomUUID } from 'node:crypto';
import { closeSync, createWriteStream, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PROJECT_LIMIT = 256 * 1024 * 1024;
const EXPORT_LIMIT = 1024 * 1024 * 1024;
const ID = /^[a-zA-Z0-9-]{8,80}$/;
const KINDS = new Set(['desktop-web', 'mobile-bundle']);

function reply(response, status, value) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(value));
}

function safeName(value) {
  const raw = String(value || '').replaceAll('\\', '/').split('/').at(-1) || 'wallpaper.zip';
  return raw.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 100) || 'wallpaper.zip';
}

function isLocalRequest(request, write = false) {
  const remote = request.socket?.remoteAddress || '';
  const host = String(request.headers.host || '');
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) return false;
  if (!/^(127\.0\.0\.1|localhost):\d{1,5}$/.test(host)) return false;
  if (!write) return true;
  return request.headers.origin === `http://${host}` && request.headers['x-sorasleep-bridge'] === '1';
}

function atomicJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.part`;
  try {
    writeFileSync(temporary, JSON.stringify(value, null, 2));
    renameSync(temporary, file);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function isZip(file) {
  const handle = openSync(file, 'r');
  try {
    const signature = Buffer.alloc(4);
    return readSync(handle, signature, 0, 4, 0) === 4 && signature[0] === 0x50 && signature[1] === 0x4b;
  } finally {
    closeSync(handle);
  }
}

async function receive(request, file, limit) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.part`;
  const output = createWriteStream(temporary, { flags: 'wx' });
  const digest = createHash('sha256');
  let bytes = 0;
  try {
    for await (const chunk of request) {
      bytes += chunk.length;
      if (bytes > limit) {
        const error = new Error('payload-too-large');
        error.status = 413;
        throw error;
      }
      digest.update(chunk);
      if (!output.write(chunk)) await new Promise((resolve, reject) => {
        output.once('drain', resolve);
        output.once('error', reject);
      });
    }
    await new Promise((resolve, reject) => output.end((error) => error ? reject(error) : resolve()));
    return { temporary, bytes, sha256: digest.digest('hex') };
  } catch (error) {
    output.destroy();
    if (existsSync(temporary)) unlinkSync(temporary);
    throw error;
  }
}

function metadataIn(directory, kind) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory()).flatMap((entry) => {
    const folder = path.join(directory, entry.name);
    return readdirSync(folder).filter((name) => name.endsWith('.meta.json')).flatMap((name) => {
      try {
        const metadata = JSON.parse(readFileSync(path.join(folder, name), 'utf8'));
        const payload = kind === 'project' ? 'current.wallproj' : metadata.fileName;
        return typeof payload === 'string' && path.basename(payload) === payload && existsSync(path.join(folder, payload)) ? [metadata] : [];
      } catch { return []; }
    });
  });
}

export function bridgeStatus(dataRoot) {
  const projects = metadataIn(path.join(dataRoot, 'Projects'), 'project');
  const exports = metadataIn(path.join(dataRoot, 'Exports'), 'export');
  return {
    projectCount: projects.length,
    exportCount: exports.length,
    projects: projects.map(({ id, title, preset, updatedAt, bytes }) => ({ id, title, preset, updatedAt, bytes })).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 20),
    exports: exports.map(({ id, projectId, kind, fileName, createdAt, bytes, sha256 }) => ({ id, projectId, kind, fileName, createdAt, bytes, sha256 })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 20),
  };
}

export function createWallpaperBridge({ dataRoot = path.join(process.env.SORASLEEP_MAIN || 'D:\\SoraSleep Main', 'Data', 'Wallpaper') } = {}) {
  return async (request, response, next) => {
    const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
    if (!['/health', '/jobs', '/bridge/status'].includes(pathname) && !pathname.startsWith('/bridge/projects/') && !pathname.startsWith('/bridge/exports/')) return next();
    if (!isLocalRequest(request, request.method === 'PUT')) return reply(response, 403, { error: 'local-origin-required' });
    if (request.method === 'GET' && pathname === '/health') return reply(response, 200, { ok: true, service: 'wallpaper', version: '0.1.0', telemetry: 'files', jobTelemetry: 'unavailable', ...bridgeStatus(dataRoot) });
    if (request.method === 'GET' && pathname === '/jobs') return reply(response, 501, { error: 'job-telemetry-not-implemented' });
    if (request.method === 'GET' && pathname === '/bridge/status') return reply(response, 200, bridgeStatus(dataRoot));
    if (request.method !== 'PUT') return reply(response, 405, { error: 'method-not-allowed' });
    const parts = pathname.split('/').filter(Boolean);
    const id = parts[2];
    if (!ID.test(id || '')) return reply(response, 400, { error: 'invalid-project-id' });
    try {
      if (parts[1] === 'projects' && parts.length === 3) {
        if (!String(request.headers['content-type'] || '').startsWith('application/json')) return reply(response, 415, { error: 'json-required' });
        const folder = path.join(dataRoot, 'Projects', id);
        const target = path.join(folder, 'current.wallproj');
        const received = await receive(request, target, PROJECT_LIMIT);
        let project;
        try { project = JSON.parse(readFileSync(received.temporary, 'utf8')); } catch { unlinkSync(received.temporary); return reply(response, 400, { error: 'invalid-project-json' }); }
        if (project?.schemaVersion !== 2 || project.id !== id || typeof project.title !== 'string' || !project.assets || !project.preset || !Number.isFinite(Date.parse(project.updatedAt))) {
          unlinkSync(received.temporary);
          return reply(response, 400, { error: 'invalid-project-contract' });
        }
        const metaFile = path.join(folder, 'current.meta.json');
        let old;
        try { old = JSON.parse(readFileSync(metaFile, 'utf8')); } catch { old = null; }
        if (old && Date.parse(old.updatedAt) > Date.parse(project.updatedAt)) {
          unlinkSync(received.temporary);
          return reply(response, 409, { error: 'older-project-revision' });
        }
        renameSync(received.temporary, target);
        atomicJson(metaFile, { id, title: project.title.slice(0, 200), preset: project.preset.id, updatedAt: project.updatedAt, bytes: received.bytes, sha256: received.sha256 });
        return reply(response, 200, { ok: true, id, bytes: received.bytes, sha256: received.sha256 });
      }
      if (parts[1] === 'exports' && parts.length === 4 && KINDS.has(parts[3])) {
        if (!String(request.headers['content-type'] || '').startsWith('application/zip')) return reply(response, 415, { error: 'zip-required' });
        const originalName = safeName(request.headers['x-file-name']);
        if (!originalName.toLowerCase().endsWith('.zip')) return reply(response, 400, { error: 'zip-name-required' });
        const folder = path.join(dataRoot, 'Exports', id);
        const received = await receive(request, path.join(folder, 'incoming.zip'), EXPORT_LIMIT);
        if (!isZip(received.temporary)) { unlinkSync(received.temporary); return reply(response, 400, { error: 'invalid-zip' }); }
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const revision = `${stamp}-${received.sha256.slice(0, 12)}`;
        const fileName = `${revision}-${originalName}`;
        renameSync(received.temporary, path.join(folder, fileName));
        atomicJson(path.join(folder, `${revision}.meta.json`), { id: revision, projectId: id, kind: parts[3], fileName, createdAt: new Date().toISOString(), bytes: received.bytes, sha256: received.sha256 });
        return reply(response, 201, { ok: true, id: revision, fileName, bytes: received.bytes, sha256: received.sha256 });
      }
      return reply(response, 404, { error: 'bridge-route-not-found' });
    } catch (error) {
      return reply(response, error.status || 500, { error: error.status === 413 ? 'payload-too-large' : 'bridge-write-failed' });
    }
  };
}
