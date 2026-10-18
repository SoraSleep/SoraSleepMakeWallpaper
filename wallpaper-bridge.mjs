import { createHash, randomUUID } from 'node:crypto';
import { closeSync, createWriteStream, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createJobStore } from './wallpaper-jobs.mjs';
import { createArtworkPlan } from './wallpaper-art-plan.mjs';
import { createPlanStore } from './artwork-plan-store.mjs';
import { buildSalesBundle } from './sales-bundle.mjs';
import { createProductStore } from './product-store.mjs';
import { createImageDreamAdapter } from './image-dream-adapter.mjs';
import { createRenderJobStore } from './render-jobs.mjs';
import {readLandscapeSource} from './landscape-source.mjs';

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

export function createWallpaperBridge({ dataRoot = path.join(process.env.SORASLEEP_MAIN || 'D:\\SoraSleep Main', 'Data', 'Wallpaper'), renderWorker } = {}) {
  const jobs = createJobStore(path.join(dataRoot, 'Jobs'));
  const plans = createPlanStore(path.join(dataRoot, 'ArtworkPlans'));
  const products = createProductStore(path.join(dataRoot, 'Products'));
  const dream = createImageDreamAdapter({root:path.join(dataRoot,'Generation')});
  const renders = createRenderJobStore({root:path.join(dataRoot,'RenderJobs'),...(renderWorker?{worker:renderWorker}:{})});
  return async (request, response, next) => {
    const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
    if(pathname==='/landscape-source'){
      if(!isLocalRequest(request)||request.method!=='GET')return reply(response,403,{error:'local-origin-required'});
      try{const result=await readLandscapeSource(new URL(request.url,'http://local').searchParams.get('assetId'));response.setHeader('Content-Type',result.mimeType);response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Cache-Control','no-store');return response.end(result.bytes);}catch(error){return reply(response,400,{error:error.message});}
    }
    if(pathname==='/render-jobs'||pathname.startsWith('/render-jobs/')){
      if(!isLocalRequest(request,request.method!=='GET'))return reply(response,403,{error:'local-origin-required'});
      try{
        const [, ,id,action,kind]=pathname.split('/');
        if(request.method==='GET'&&!id)return reply(response,200,{schemaVersion:1,jobs:renders.list()});
        if(request.method==='GET'&&action==='artifacts'){const result=renders.artifact(id,kind);if(!result)return reply(response,404,{error:'not-found'});response.setHeader('Content-Type',result.artifact.mimeType);response.setHeader('Content-Disposition',`attachment; filename="${result.artifact.name}"`);return response.end(result.bytes);}
        if(request.method==='GET'){const job=renders.read(id);return reply(response,job?200:404,job||{error:'not-found'});}
        if(request.method==='POST'&&id)return reply(response,200,renders.action(id,action));
        if(request.method==='POST'){
          if(!String(request.headers['content-type']||'').startsWith('application/json'))return reply(response,415,{error:'json-required'});
          let size=0;const chunks=[];for await(const chunk of request){size+=chunk.length;if(size>100*1024*1024)return reply(response,413,{error:'payload-too-large'});chunks.push(chunk);}
          return reply(response,202,renders.submit(JSON.parse(Buffer.concat(chunks).toString('utf8'))));
        }
        return reply(response,405,{error:'method-not-allowed'});
      }catch(error){return reply(response,error.message==='idempotency-conflict'?409:400,{error:error.message});}
    }
    if(pathname.startsWith('/image-dream/')){
      if(!isLocalRequest(request,request.method!=='GET'))return reply(response,403,{error:'local-origin-required'});
      try{
        if(request.method==='GET'&&pathname==='/image-dream/capabilities')return reply(response,200,await dream.capabilities());
        if(request.method==='GET'&&pathname==='/image-dream/models')return reply(response,200,await dream.models());
        if(request.method==='GET'&&pathname==='/image-dream/generations')return reply(response,200,{generations:dream.list()});
        if(request.method==='POST'){
          let size=0;const chunks=[];for await(const chunk of request){size+=chunk.length;if(size>8192)return reply(response,413,{error:'payload-too-large'});chunks.push(chunk);}
          const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if(pathname==='/image-dream/generate-a'){const plan=plans.list().find(p=>p.planId===input.planId&&p.revision===input.revision);if(!plan)return reply(response,404,{error:'plan-not-found'});return reply(response,202,await dream.startA(plan,input));}
          if(pathname==='/image-dream/refresh')return reply(response,200,await dream.refresh(input.id));
        }
        return reply(response,405,{error:'unsupported-operation'});
      }catch(error){return reply(response,503,{error:error.message});}
    }
    if(pathname==='/products'||pathname.startsWith('/products/')){
      if(!isLocalRequest(request,request.method==='POST'))return reply(response,403,{error:'local-origin-required'});
      try{
        if(request.method==='GET'&&pathname==='/products')return reply(response,200,{products:products.list()});
        if(request.method==='GET'){const result=products.download(pathname.split('/')[2]);if(!result)return reply(response,404,{error:'not-found'});response.setHeader('Content-Type','application/zip');response.setHeader('Content-Disposition',`attachment; filename="${result.item.fileName}"`);return response.end(result.bytes);}
        if(request.method==='POST'&&pathname==='/products'){
          let size=0;const chunks=[];for await(const chunk of request){size+=chunk.length;if(size>90*1024*1024)return reply(response,413,{error:'payload-too-large'});chunks.push(chunk);}
          return reply(response,201,products.save(JSON.parse(Buffer.concat(chunks).toString('utf8'))));
        }
        return reply(response,405,{error:'method-not-allowed'});
      }catch(error){return reply(response,400,{error:error.message});}
    }
    if(pathname==='/sales-bundle'){
      if(!isLocalRequest(request,true))return reply(response,403,{error:'local-origin-required'});
      if(request.method!=='POST')return reply(response,405,{error:'method-not-allowed'});
      try{
        let size=0;const chunks=[];for await(const chunk of request){size+=chunk.length;if(size>90*1024*1024)return reply(response,413,{error:'payload-too-large'});chunks.push(chunk);}
        const result=buildSalesBundle(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        response.setHeader('Content-Type','application/zip');response.setHeader('Content-Disposition',`attachment; filename="${result.fileName}"`);return response.end(result.bytes);
      }catch(error){return reply(response,400,{error:error.message});}
    }
    if (!['/health', '/jobs', '/artwork-plans', '/artwork-plan', '/capabilities', '/bridge/status'].includes(pathname) && !pathname.startsWith('/jobs/') && !pathname.startsWith('/bridge/projects/') && !pathname.startsWith('/bridge/exports/')) return next();
    if (!isLocalRequest(request, ['PUT','POST'].includes(request.method))) return reply(response, 403, { error: 'local-origin-required' });
    if (pathname === '/artwork-plans' && request.method === 'GET') return reply(response,200,{plans:plans.list()});
    if (pathname === '/artwork-plan' || pathname === '/artwork-plans') {
      if (request.method !== 'POST') return reply(response,405,{error:'method-not-allowed'});
      if (!String(request.headers['content-type'] || '').startsWith('application/json')) return reply(response,415,{error:'json-required'});
      try {
        const chunks=[];let size=0;
        for await(const chunk of request){size+=chunk.length;if(size>32*1024)return reply(response,413,{error:'payload-too-large'});chunks.push(chunk);}
        const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        return reply(response,pathname === '/artwork-plans'?201:200,pathname === '/artwork-plans'?plans.save(input):createArtworkPlan(input));
      } catch(error){return reply(response,error.message==='revision-conflict'?409:400,{error:error.message});}
    }
    if (request.method === 'GET' && pathname === '/capabilities') return reply(response,200,{schemaVersion:1,workflowSchemaVersion:1,planningWorkflows:['pair-reveal','landscape','stock','character-wardrobe'],renderWorkflows:['pair-reveal','character-wardrobe','landscape'],landscapeRecipes:['spring-sakura'],singleImageMotion:true,wardrobeStudio:true,automaticMaskedEdit:false,submitIntake:true,render:true,renderTargets:['mp4','desktop'],renderJobsPath:'/render-jobs',commercialReady:false});
    if (pathname === '/jobs' || pathname.startsWith('/jobs/')) {
      try {
        const [, , id, action] = pathname.split('/');
        if(request.method==='GET' && !id) return reply(response,200,{jobs:jobs.list()});
        if(request.method==='GET' && action==='artifact'){const bytes=jobs.artifact(id);if(!bytes)return reply(response,404,{error:'not-found'});response.setHeader('Content-Type','application/zip');return response.end(bytes);}
        if(request.method==='GET'){const job=jobs.read(id);return reply(response,job?200:404,job||{error:'not-found'});}
        if(request.method==='POST' && id) return reply(response,200,jobs.action(id,action));
        if(request.method==='POST') {
          let body='';for await(const chunk of request){body+=chunk;if(Buffer.byteLength(body)>100*1024*1024)return reply(response,413,{error:'payload-too-large'});}
          return reply(response,202,jobs.submit(JSON.parse(body)));
        }
        return reply(response,405,{error:'method-not-allowed'});
      } catch(error){return reply(response,error.message==='idempotency-conflict'?409:400,{error:error.message});}
    }
    if (request.method === 'GET' && pathname === '/health') return reply(response, 200, { ok: true, service: 'wallpaper', version: '0.1.0', telemetry: 'files', jobTelemetry: 'unavailable', ...bridgeStatus(dataRoot) });
    if (request.method === 'GET' && pathname === '/bridge/status') return reply(response, 200, {...bridgeStatus(dataRoot),products:products.list()});
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
