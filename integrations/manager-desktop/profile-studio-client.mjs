import {rejectUnverifiedMaskedEdit} from './wallpaper-wardrobe.mjs';
import path from 'node:path';
export function createProfileStudioClient(call,baseUrl){
 const config=settings=>({model:settings.model,aspectRatio:settings.aspectRatio,resolution:settings.resolution,imageCount:1,...(settings.accountId?{accountId:settings.accountId}:{}),...(settings.referenceImages?.length?{referenceImages:settings.referenceImages}:{})});
 async function waitIdle(){for(let attempt=0;attempt<100;attempt++){const health=await call('/api/health');if(health.busy!==true)return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('profile-studio-still-closing-preflight');}
 return{
  async preflight(settings){rejectUnverifiedMaskedEdit(settings);const quote=await call('/api/batch/preflight',config(settings));if(quote.generationRequests!==0||quote.enoughCredits!==true||!Number.isFinite(quote.perTask)||quote.perTask<=0)throw new Error('profile-studio-quotation-unverified');await waitIdle();return quote;},
  async submit(prompt,settings,quote,beforeDispatch){rejectUnverifiedMaskedEdit(settings);
   let dispatched=false;try{
   await waitIdle();
   const previous=await call('/api/batch/queue');
   if(previous.running||previous.processing||previous.counts?.pending||previous.counts?.blocked)throw new Error('profile-studio-existing-work-not-finished');
   if(previous.tasks?.length){if(!previous.canArchive||previous.tasks.some(t=>!['completed','skipped_user'].includes(t.status)))throw new Error('profile-studio-archive-requires-review');await call('/api/batch/archive',{confirm:true});}
   const token={transport:'profile-studio',provider:'dreamina',previousBatchId:previous.batchId,submittedAt:Date.now(),prompt};
   await beforeDispatch(token);
   dispatched=true;
   await call('/api/batch/start',{...config(settings),prompts:[prompt],maxCredits:quote.perTask,startAccountId:quote.accountId,mockMode:false,headless:true,enableSafetyFilter:true});
   const current=await call('/api/batch/queue');const task=current.tasks?.find(t=>t.prompt===prompt);
   if(!task||current.batchId===previous.batchId)throw new Error('profile-studio-submission-identity-unverified');
   return{...token,batchId:current.batchId,taskId:task.id,status:'submitted'};
   }catch(error){error.safeToRetry=!dispatched;throw error;}
  },
  async refresh(token){
   const queue=await call('/api/batch/queue');
   if(token.batchId&&queue.batchId!==token.batchId)throw new Error('profile-studio-batch-changed-do-not-resubmit');
   const task=queue.tasks?.find(t=>token.taskId?t.id===token.taskId:t.prompt===token.prompt&&queue.batchId!==token.previousBatchId&&Number(t.createdAt)>=token.submittedAt-2000);
   if(!task)return{...token,status:'submission_uncertain',error:'profile-studio-task-not-found'};
   const record={...token,batchId:queue.batchId,taskId:task.id};
   if(task.status==='completed'){
    if(!Array.isArray(task.savedFiles)||!task.savedFiles.length)return{...record,status:'submission_uncertain',error:'verified-file-missing'};
    const gallery=await call('/api/integrations/assets');
    const names=task.savedFiles.map(f=>path.win32.basename(typeof f==='string'?f:f.filePath||f.fileName||''));
    const assets=gallery.filter(asset=>names.includes(asset.fileName)).map(asset=>({...asset,url:new URL('/downloads/'+encodeURIComponent(asset.fileName),baseUrl).href,rightsStatus:'unreviewed'}));
    return{...record,status:assets.length===names.length?'needs_review':'submission_uncertain',assets,remoteTaskId:task.remoteTaskId};
   }
   if(['submission_unknown','recovery_required','download_failed','blocked','needs_user_action'].includes(task.status))return{...record,status:'submission_uncertain',error:task.lastDownloadError||task.status};
   if(['failed','cancelled','skipped_user'].includes(task.status))return{...record,status:'failed',error:task.error||task.status};
   return{...record,status:'submitted',assets:[]};
  }
 };
}
