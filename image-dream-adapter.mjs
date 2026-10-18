import { randomUUID } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';

export function createImageDreamAdapter({root,baseUrl=process.env.SORASLEEP_IMAGE_DREAM_URL||'http://127.0.0.1:3000',fetchImpl=fetch}){
 const url=new URL(baseUrl);if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password)throw new Error('image-dream-must-be-loopback');
 mkdirSync(root,{recursive:true});
 const list=()=>readdirSync(root).filter(n=>n.endsWith('.json')).map(n=>JSON.parse(readFileSync(path.join(root,n),'utf8')));
 const save=record=>{const file=path.join(root,record.id+'.json');writeFileSync(file+'.part',JSON.stringify(record,null,2));renameSync(file+'.part',file);};
 const call=async(route,options={})=>{const response=await fetchImpl(new URL(route,url),{...options,signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`image-dream-http-${response.status}`);return response.json();};
 return {
  list,
  capabilities:async()=>{await call('/api/health');return {connected:true,textToImage:'available-unverified-live',maskedEdit:false,automaticB:false};},
  models:()=>call('/api/models'),
  async startA(plan,settings){
   if(!plan.planCopyReviewed)throw new Error('review-plan-first');
   const key=`${plan.planId}:${plan.revision}:A`,old=list().find(j=>j.key===key);if(old)return old;
   if(!settings.model||!settings.resolution)throw new Error('model-and-resolution-required');
   const record={id:randomUUID(),key,planId:plan.planId,revision:plan.revision,status:'submitting',createdAt:new Date().toISOString(),prompt:plan.imageA.prompt,assets:[]};save(record);
   try{const accepted=await call('/api/batch/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idempotencyKey:record.id,prompts:[plan.imageA.prompt],model:settings.model,resolution:settings.resolution,aspectRatio:plan.aspectRatio,imageCount:1,workflow:'wallpaper',projectId:record.id,enableSafetyFilter:true,mockMode:false,headless:true})});record.requestId=accepted.requestId;record.status='submitted';}
   catch(error){record.status='submission_uncertain';record.error=error.message;}
   save(record);return record;
  },
  async refresh(id){
   const record=list().find(j=>j.id===id);if(!record)throw new Error('generation-not-found');
   const assets=await call('/api/integrations/assets');if(!Array.isArray(assets))throw new Error('invalid-gallery-response');
   record.assets=assets.filter(a=>a.projectId===id).map(({assetId,fileName,width,height,mimeType,bytes})=>({assetId,fileName,width,height,mimeType,bytes,rightsStatus:'unreviewed'}));
   if(record.assets.length)record.status='needs_review';
   else if(record.requestId){
    const history=await call('/api/requests');const request=history.requests?.find(item=>item.requestId===record.requestId);
    const task=request?.tasks?.[0];
    if(task&&['failed','submission_uncertain','interrupted','skipped_safety'].includes(task.status)){
     record.status=task.status==='submission_uncertain'?'submission_uncertain':'failed';record.error=task.error||task.status;
    }
   }
   record.checkedAt=new Date().toISOString();save(record);return record;
  }
 };
}
