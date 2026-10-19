import fs from 'node:fs';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {fileURLToPath} from 'node:url';
const exec=promisify(execFile),sha=bytes=>createHash('sha256').update(bytes).digest('hex'),worker=fileURLToPath(new URL('./watermark-worker.py',import.meta.url));
const mime=bytes=>bytes[0]===137?'image/png':bytes[0]===255?'image/jpeg':bytes.toString('ascii',0,4)==='RIFF'?'image/webp':null;
export function createWatermarkCleanup({python=process.env.SORASLEEP_PLR_PYTHON||'python',runWorker}={}){
 const templates=path.join(path.dirname(worker),'watermark-templates');
 const recipe='provider-marks-v1-'+sha(Buffer.concat([fs.readFileSync(worker),...['templates.json','ai-badge.png','dreamina-logo.png'].map(name=>fs.readFileSync(path.join(templates,name)))])).slice(0,16);
 let tail=Promise.resolve(),active=0;const pending=new Map();
 async function execute(file,folder,expected){
  fs.mkdirSync(folder,{recursive:true});const before=fs.readFileSync(file),sourceSha=sha(before);if(expected&&sourceSha!==expected)throw Error('watermark-source-changed');
  const sourceMime=mime(before);if(!sourceMime)throw Error('watermark-raster-required');
  const key=sourceSha+'-'+recipe,meta=path.join(folder,key+'.json'),output=path.join(folder,key+'.png');
  if(fs.existsSync(meta)){const record=JSON.parse(fs.readFileSync(meta,'utf8'));if(record.recipe!==recipe||record.sourceSha256!==sourceSha||!fs.existsSync(output)||sha(fs.readFileSync(output))!==record.outputSha256)throw Error('watermark-cache-changed');return result(record);}
  const jobFile=path.join(folder,randomUUID()+'.job.json'),temporary=path.join(folder,randomUUID()+'.png');
  try{
   const job={source:path.resolve(file),sourceSha256:sourceSha,target:temporary};fs.writeFileSync(jobFile,JSON.stringify(job),{flag:'wx'});
   let report;if(runWorker)report=await runWorker(job);else{try{const value=await exec(python,['-u',worker,jobFile],{windowsHide:true,timeout:180000,maxBuffer:1000000});report=JSON.parse(value.stdout.trim());}catch(error){let reason;try{reason=JSON.parse(error.stdout.trim()).error;}catch{}throw Error(reason||'watermark-worker-failed');}}
   if(!report.ok||!report.outsideMaskUnchanged||!report.originalUnchanged)throw Error(report.error||'watermark-output-invalid');
   if(sha(fs.readFileSync(file))!==sourceSha)throw Error('watermark-source-changed');
   const bytes=fs.readFileSync(temporary);if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('watermark-output-invalid');
   const record={recipe,sourceSha256:sourceSha,outputSha256:sha(bytes),sourceMime,sourceBytes:before.length,outputBytes:bytes.length,report,createdAt:new Date().toISOString()};
   fs.renameSync(temporary,output);const tmp=meta+'.'+randomUUID()+'.part';try{fs.writeFileSync(tmp,JSON.stringify(record),{flag:'wx'});fs.renameSync(tmp,meta);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}return result(record);
  }finally{for(const temporaryFile of [jobFile,temporary])if(fs.existsSync(temporaryFile))fs.unlinkSync(temporaryFile);}
  function result(record){const changed=record.report.maskedPixels>0;return{file:changed?output:file,sha256:changed?record.outputSha256:sourceSha,bytes:changed?record.outputBytes:before.length,width:record.report.width,height:record.report.height,mime:changed?'image/png':sourceMime,watermark:{...record.report,recipe,sourceSha256:sourceSha},reencoded:changed};}
 }
 function clean(file,folder,expected){const key=path.resolve(file)+':'+path.resolve(folder)+':'+expected;if(pending.has(key))return pending.get(key);if(pending.size>=64)throw Error('watermark-queue-full');active++;const job=tail.then(()=>execute(file,folder,expected));tail=job.catch(()=>{});pending.set(key,job);job.finally(()=>{pending.delete(key);active--;}).catch(()=>{});return job;}
 return{clean,recipe,isBusy:()=>active>0};
}
