import {createHash,randomUUID}from'node:crypto';
import{mkdirSync,readdirSync,readFileSync,writeFileSync,renameSync,existsSync}from'node:fs';
import path from'node:path';
import{validateIntake}from'./wallpaper-jobs.mjs';
import{renderWallpaperJob}from'./render-worker.mjs';
import{validateLandscapeInput}from'./landscape-contract.mjs';
const idPattern=/^[a-zA-Z0-9-]{8,80}$/;const digest=value=>createHash('sha256').update(value).digest('hex');
export function validateRenderInput(input){
 if(input?.workflowType==='landscape')validateLandscapeInput(input);else validateIntake(input);
 if(!Array.isArray(input.targets)||!input.targets.length||input.targets.length>2||new Set(input.targets).size!==input.targets.length||input.targets.some(t=>!['mp4','desktop'].includes(t)))throw new Error('invalid-render-targets');
 const r=input.render;if(!r||![r.width,r.height,r.fps].every(Number.isInteger)||r.width<128||r.height<128||r.width>3840||r.height>3840||r.width*r.height>3840*2160||r.width%2||r.height%2||![24,30,60].includes(r.fps)||!Number.isFinite(r.duration)||r.duration<1||r.duration>30||r.duration*r.fps>900||!['economy','balanced','premium'].includes(r.quality))throw new Error('invalid-render-settings');
 if(input.workflowType==='landscape'){
  if(r.width>1920||r.height>1920||r.width*r.height>1920*1080||![24,30].includes(r.fps))throw new Error('landscape-render-limit');
  if(Math.abs(input.assets.imageA.width/input.assets.imageA.height-r.width/r.height)>.01)throw new Error('render-aspect-mismatch');return input;
 }
 if(!['alpha','luminance'].includes(input.maskEncoding))throw new Error('mask-encoding-required');
 const {imageA:a,imageB:b,differenceMask:m}=input.assets;
 if(a.width!==b.width||a.height!==b.height||a.width!==m.width||a.height!==m.height)throw new Error('pair-dimensions-mismatch');
 if(Math.abs(a.width/a.height-r.width/r.height)>0.01)throw new Error('render-aspect-mismatch');
 return input;
}
export function writeRenderJobRecord(target,job,{write=writeFileSync,rename=renameSync,sleep=ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms)}={}){
 const temporary=target+'.'+randomUUID()+'.part';write(temporary,JSON.stringify(job,null,2));
 for(let attempt=0;;attempt++){try{rename(temporary,target);return;}catch(error){if(!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=8)throw error;sleep(20*(attempt+1));}}
}
export function createRenderJobStore({root,worker=renderWallpaperJob}={}){
 mkdirSync(root,{recursive:true});let running=false;const controllers=new Map();
 const file=id=>{if(!idPattern.test(id||''))throw new Error('invalid-render-job-id');return path.join(root,id+'.json');};
 const read=id=>existsSync(file(id))?JSON.parse(readFileSync(file(id),'utf8')):null;
 const list=()=>readdirSync(root).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(path.join(root,f),'utf8')));
 const save=job=>{job.updatedAt=new Date().toISOString();writeRenderJobRecord(file(job.id),job);};
 async function pump(){
  if(running)return;running=true;
  try{for(let job=list().find(j=>j.status==='queued');job;job=list().find(j=>j.status==='queued')){
   const abort=new AbortController();controllers.set(job.id,abort);job.status='running';job.stage='validating';job.progress=5;save(job);
   try{
    const input=validateRenderInput(JSON.parse(readFileSync(path.join(root,job.id+'.input'),'utf8')));job.stage='rendering';job.progress=10;save(job);let lastProgress=10;
    const results=await worker(input,{cacheRoot:path.join(root,'worker-modules'),signal:abort.signal,onProgress:({fraction})=>{const progress=Math.min(89,10+Math.floor(fraction*75));if(progress>=lastProgress+5&&!abort.signal.aborted){lastProgress=progress;job.progress=progress;save(job);}}});
    if(abort.signal.aborted)throw new Error('render_cancelled');
    if(!Array.isArray(results)||results.length!==input.targets.length||new Set(results.map(r=>r.kind)).size!==results.length||results.some(r=>!input.targets.includes(r.kind)))throw new Error('render-output-missing');
    job.stage='packaging';job.progress=90;save(job);
    job.artifacts=results.map(result=>{const bytes=Buffer.from(result.base64,'base64');if(result.kind==='mp4'?(bytes.length<12||bytes.toString('ascii',4,8)!=='ftyp'):(bytes.length<4||bytes.readUInt32LE(0)!==0x04034b50))throw new Error('invalid-render-output');const name=job.id+(result.kind==='mp4'?'.mp4':'.desktop.zip');writeFileSync(path.join(root,name),bytes);return{id:result.kind,name,bytes:bytes.length,sha256:digest(bytes),mimeType:result.mimeType,kind:result.kind};});
    job.status='completed';job.stage='done';job.progress=100;job.completedAt=new Date().toISOString();job.reviewStatus='unreviewed';job.commercialReady=false;
   }catch(error){job.status=abort.signal.aborted?'cancelled':'failed';job.error=error.message;job.stage=job.status;}
   finally{controllers.delete(job.id);save(job);}
  }}finally{running=false;}
 }
 for(const job of list())if(['queued','running'].includes(job.status)){job.status='interrupted';job.stage='interrupted';job.error='render-worker-restarted-use-explicit-retry';save(job);}
 return{read,list,
  submit(input){validateRenderInput(input);const inputHash=digest(JSON.stringify(input));const old=list().find(j=>j.idempotencyKey===input.idempotencyKey||j.id===input.jobId);if(old){if(old.inputHash!==inputHash)throw new Error('idempotency-conflict');return old;}const job={schemaVersion:1,id:input.jobId,requestId:input.jobId,attemptId:randomUUID(),operation:'wallpaper.render',productId:input.productId,idempotencyKey:input.idempotencyKey,inputHash,status:'queued',stage:'queued',progress:0,attempts:1,createdAt:new Date().toISOString(),artifacts:[],commercialReady:false};writeFileSync(path.join(root,job.id+'.input'),JSON.stringify(input));save(job);setImmediate(()=>void pump());return job;},
  action(id,action){const job=read(id);if(!job)throw new Error('render-job-not-found');if(action==='cancel'&&['queued','running'].includes(job.status)){controllers.get(id)?.abort();job.status='cancelled';job.stage='cancelled';}else if(action==='retry'&&['failed','cancelled','interrupted'].includes(job.status)){if(controllers.has(id))throw new Error('render-worker-still-stopping');job.status='queued';job.stage='queued';job.progress=0;job.attemptId=randomUUID();job.attempts++;delete job.error;}else throw new Error('invalid-render-transition');save(job);if(job.status==='queued')setImmediate(()=>void pump());return job;},
  artifact(id,kind){const job=read(id);const artifact=job?.status==='completed'&&job.artifacts.find(a=>a.id===kind);if(!artifact)return null;const bytes=readFileSync(path.join(root,artifact.name));if(digest(bytes)!==artifact.sha256)throw new Error('artifact-checksum-mismatch');return{artifact,bytes};}
 };
}
