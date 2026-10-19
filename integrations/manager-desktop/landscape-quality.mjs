import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {decodePlrImage} from './plr-dispatcher.mjs';
const ratio=value=>{const[a,b]=String(value||'').split(':').map(Number);return a>0&&b>0?a/b:null;};
const recipe='landscape-decode-v2';
async function hashFile(file){const hash=crypto.createHash('sha256');for await(const bytes of fs.createReadStream(file))hash.update(bytes);return hash.digest('hex');}
export function createLandscapeQuality({store,decode=decodePlrImage,derivatives}){
 let active=null;const jobs=new Map();
 const status=id=>jobs.get(id)??{state:'idle',completed:0,total:0};
 function cancel(id){if(active?.id!==id)throw Error('landscape-quality-not-running');active.cancelled=true;return{stopping:true};}
 async function analyze(id,itemIds=null,{variant='original',force=false}={}){
  if(active)throw Error('landscape-quality-busy');
  if(!['original','reviewed','both'].includes(variant))throw Error('landscape-export-variant-invalid');
  const state=store.getState(id);if(state.run.preset.studio!=='text-to-image-landscape')throw Error('landscape-batch-not-found');
  const expected=ratio(state.run.preset.aspectRatio),rows=store.executionItems(id).filter(row=>itemIds===null||itemIds.includes(row.id)),seen=new Map(),items=[],job={id,cancelled:false};
  active=job;if(jobs.size>=10)jobs.delete(jobs.keys().next().value);jobs.set(id,{state:'running',completed:0,total:rows.length,cached:0});
  let cached=0;const stop=()=>{if(job.cancelled)throw Error('landscape-quality-cancelled');};
  try{
   for(const row of rows){
    stop();const original=row.attempts.at(-1)?.artifact;
    if(!original){items.push({itemId:row.id,ordinal:row.ordinal,status:'missing',warnings:['missing-source']});}
    else{
     for(const kind of variant==='both'?['original','reviewed']:[variant]){
      const warnings=[];let meta=null,hash=null;
      try{
       const artifact=kind==='reviewed'?derivatives?.resolve(id,row.id):original;if(!artifact)throw Error('landscape-reviewed-image-required');
       const folder=fs.realpathSync(store.artifactDirectory(id,row.id)),file=fs.realpathSync(artifact.file);if(path.dirname(file)!==folder)throw Error('outside');
       hash=await hashFile(file);stop();if(hash!==artifact.sha256)warnings.push('source-hash-mismatch');
       const cacheFile=path.join(folder,'qa-'+hash+'.json');let cache;try{cache=JSON.parse(fs.readFileSync(cacheFile,'utf8'));}catch{}
       if(!force&&cache?.recipe===recipe&&cache.sha256===hash&&Number.isSafeInteger(cache.width)&&cache.width>0&&Number.isSafeInteger(cache.height)&&cache.height>0){meta=cache;cached++;}
       else{meta=await decode(file);stop();if(await hashFile(file)!==hash)throw Error('changed-during-decode');const temp=cacheFile+'.'+crypto.randomUUID()+'.part';try{fs.writeFileSync(temp,JSON.stringify({recipe,sha256:hash,width:meta.width,height:meta.height}));fs.renameSync(temp,cacheFile);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}}
       if(meta.width!==artifact.width||meta.height!==artifact.height)warnings.push('metadata-mismatch');if(expected&&Math.abs(meta.width/meta.height/expected-1)>.02)warnings.push('aspect-ratio');
      }catch(error){stop();warnings.push(String(error.message).includes('reviewed')?'reviewed-image-invalid':'unreadable');}
      if(hash){const prior=seen.get(kind+':'+hash);if(prior)warnings.push('duplicate');else seen.set(kind+':'+hash,row.ordinal);}
      items.push({itemId:row.id,ordinal:row.ordinal,variant:kind,status:warnings.length?'review':'pass',width:meta?.width??null,height:meta?.height??null,sha256:hash,warnings});
     }
    }
    jobs.set(id,{state:'running',completed:status(id).completed+1,total:rows.length,cached});await new Promise(resolve=>setImmediate(resolve));
   }
   const report={schemaVersion:2,runId:id,variant,total:items.length,passed:items.filter(item=>item.status==='pass').length,flagged:items.filter(item=>item.status!=='pass').length,duplicates:items.filter(item=>item.warnings.includes('duplicate')).length,cached,items,createdAt:new Date().toISOString()};jobs.set(id,{state:'complete',completed:rows.length,total:rows.length,cached,report});return report;
  }catch(error){jobs.set(id,{...status(id),state:job.cancelled?'cancelled':'failed',error:error.message});throw error;}finally{active=null;}
 }
 function start(id){if(active)throw Error('landscape-quality-busy');if(store.getState(id).run.preset.studio!=='text-to-image-landscape')throw Error('landscape-batch-not-found');void analyze(id).catch(()=>{});return status(id);}
 return{analyze,start,status,cancel,isBusy:()=>!!active,dispose:()=>{if(active)active.cancelled=true;}};
}
