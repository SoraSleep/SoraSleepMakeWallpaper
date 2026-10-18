import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { strToU8, zipSync } from 'fflate';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const idPattern = /^[a-zA-Z0-9-]{8,80}$/;
function save(file, value) { writeFileSync(file + '.part', JSON.stringify(value, null, 2)); renameSync(file + '.part', file); }

export function validateIntake(bundle) {
  if (bundle?.schemaVersion !== 1 || bundle.contentScope !== 'sfw' || !idPattern.test(bundle.jobId || '') || !idPattern.test(bundle.productId || '') || !idPattern.test(bundle.idempotencyKey || '') || !['difference-lens', 'portal-reveal'].includes(bundle.presetId)) throw new Error('invalid-contract');
  const files = {};
  for (const role of ['imageA', 'imageB', 'differenceMask']) {
    const asset = bundle.assets?.[role];
    if (!asset || !/^assets\/[a-zA-Z0-9_-]+\.png$/.test(asset.relativePath || '') || files[asset.relativePath] || !Number.isInteger(asset.width) || !Number.isInteger(asset.height) || asset.width < 1 || asset.height < 1 || asset.width > 8192 || asset.height > 8192 || typeof asset.base64 !== 'string') throw new Error('invalid-asset');
    const bytes = Buffer.from(asset.base64, 'base64');
    if (bytes.length > 24 * 1024 * 1024 || bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.readUInt32BE(16) !== asset.width || bytes.readUInt32BE(20) !== asset.height || asset.mimeType !== 'image/png' || bytes.length !== asset.bytes || hash(bytes) !== asset.sha256) throw new Error('asset-integrity-failed');
    files[asset.relativePath] = bytes;
  }
  return files;
}

/** A1 intake artifact; rendering is explicitly a separate capability. */
export function createJobStore(root) {
  mkdirSync(root, { recursive: true });
  const file = id => { if (!idPattern.test(id)) throw new Error('invalid-id'); return path.join(root, id + '.json'); };
  const read = id => existsSync(file(id)) ? JSON.parse(readFileSync(file(id), 'utf8')) : null;
  const list = () => readdirSync(root).filter(n => n.endsWith('.json')).map(n => JSON.parse(readFileSync(path.join(root,n),'utf8')));
  const run = id => setImmediate(() => {
    const job = read(id); if (!job || job.status !== 'queued') return;
    job.status = 'running'; save(file(id), job);
    try {
      const bundle = JSON.parse(readFileSync(path.join(root,id+'.input'),'utf8'));
      const files = validateIntake(bundle);
      const manifest = structuredClone(bundle);
      for (const asset of Object.values(manifest.assets)) delete asset.base64;
      files['manifest.json'] = strToU8(JSON.stringify(manifest,null,2));
      files['QA.json'] = strToU8(JSON.stringify({stage:'A1-intake',commercialReady:false,rendered:false,rightsStatus:'unreviewed'}));
      const zip = zipSync(files); const name = id+'.zip'; writeFileSync(path.join(root,name),zip);
      job.status='needs_review'; job.artifacts=[{name,bytes:zip.length,sha256:hash(zip),kind:'validated-source-bundle'}];
    } catch(error) { job.status='failed'; job.error=error.message; }
    save(file(id),job);
  });
  // Interrupted intake can safely restart because output is deterministic.
  for(const job of list()) if(['queued','running'].includes(job.status)){job.status='queued';save(file(job.id),job);run(job.id);}
  return { list, read,
    submit(bundle) {
      validateIntake(bundle); const digest=hash(JSON.stringify(bundle));
      const old=list().find(j=>j.idempotencyKey===bundle.idempotencyKey || j.id===bundle.jobId);
      if(old){if(old.inputHash!==digest) throw new Error('idempotency-conflict');return old;}
      writeFileSync(path.join(root,bundle.jobId+'.input'),JSON.stringify(bundle));
      const job={id:bundle.jobId,productId:bundle.productId,idempotencyKey:bundle.idempotencyKey,inputHash:digest,status:'queued',attempts:1,createdAt:new Date().toISOString(),artifacts:[]};
      save(file(job.id),job);run(job.id);return job;
    },
    action(id,action){const job=read(id);if(!job)throw new Error('not-found');if(action==='cancel' && job.status==='queued')job.status='cancelled';else if(action==='retry' && ['failed','cancelled'].includes(job.status)){job.status='queued';job.attempts++;delete job.error;}else throw new Error('invalid-transition');save(file(id),job);if(job.status==='queued')run(id);return job;},
    artifact(id){const job=read(id);if(!job?.artifacts?.length)return null;return readFileSync(path.join(root,job.artifacts[0].name));}
  };
}
