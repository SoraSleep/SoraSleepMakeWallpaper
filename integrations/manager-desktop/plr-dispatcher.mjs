import {createProfileStudioClient} from './profile-studio-client.mjs';
import {providerResponse} from './provider-response.mjs';
import {createPlrPreflight} from './plr-preflight.mjs';
import {createHash,randomUUID} from 'node:crypto';
import {writeFileSync,renameSync,existsSync,unlinkSync} from 'node:fs';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';import path from 'node:path';
const exec=promisify(execFile),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function decodePlrImage(file){
 const {stdout}=await exec('ffprobe.exe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,codec_name','-of','json',file],{windowsHide:true,timeout:20000,maxBuffer:1000000});
 const p=JSON.parse(stdout).streams?.[0];if(!p?.width||!p?.height||p.width*p.height>100000000)throw Error('plr-image-dimensions-invalid');
 const extensions={mjpeg:'jpeg',png:'png',webp:'webp'};if(!extensions[p.codec_name])throw Error('plr-image-codec-invalid');
 await exec('ffmpeg.exe',['-v','error','-i',file,'-frames:v','1','-f','null','-'],{windowsHide:true,timeout:30000,maxBuffer:1000000});return {width:p.width,height:p.height,extension:extensions[p.codec_name]};
}
export function createPlrDispatcher({store,baseUrl='http://127.0.0.1:17897',fetchImpl=fetch,pollMs=3000,maxPolls=120,decode=decodePlrImage,sleep=wait,isExternalBusy=()=>false,canSegment=()=>false}){
 const base=new URL(baseUrl),preflight=createPlrPreflight({store,baseUrl,fetchImpl});let active=null,stopping=false;const tasks=new Map();
 const call=async(route,body)=>{const response=await fetchImpl(new URL(route,base),{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(body?180000:20000)});return providerResponse(response);};
 const client=createProfileStudioClient(call,base.origin);
 async function waitForIdle(id){
  for(let n=0;n<30;n++){
   const cap=await preflight.capabilities();if(!cap.busy)return cap;
   if(cap.busyReason==='profile-open'){
    const profile=await call('/api/profiles/status'),queue=await call('/api/batch/queue');
    const owned=store.executionItems(id).flatMap(r=>r.attempts).some(a=>['needs_review','failed'].includes(a.status)&&a.token?.profileAccountId===profile.openAccountId&&a.token?.batchId===queue.batchId&&queue.tasks?.some(t=>t.id===a.token.taskId&&(a.status==='needs_review'?t.status==='completed':t.status==='failed')));
    if(!owned||profile.busy||profile.batchRunning||queue.running||queue.processing||queue.counts?.pending||queue.counts?.blocked)throw Error('plr-unowned-profile-open');
    await call('/api/accounts/'+encodeURIComponent(profile.openAccountId)+'/close-profile',{});
   }
   await sleep(1000);
  }
  throw Error('plr-image-dream-still-busy');
 }
 function patch(id,row,status,token,artifact,error){const latest=store.executionItem(id,row.id);return store.checkpointAttempt(id,row.id,{expectedRevision:latest.revision,attemptId:latest.attempts.at(-1).id,status,token,artifact,error});}
 async function download(id,row,result){
  if(result.assets?.length!==1)throw Error('plr-exactly-one-candidate-required');
  const asset=result.assets[0],url=new URL(asset.url);if(url.origin!==base.origin||!url.pathname.startsWith('/downloads/')||url.search||url.hash)throw Error('plr-artifact-url-invalid');
  const folder=store.artifactDirectory(id,row.id),temporary=path.join(folder,randomUUID()+'.part');
  try{
   const response=await fetchImpl(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('plr-download-failed');
   if(Number(response.headers?.get('content-length'))>100000000)throw Error('plr-download-too-large');
   const chunks=[];let total=0;for await(const chunk of response.body){total+=chunk.length;if(total>100000000)throw Error('plr-download-too-large');chunks.push(Buffer.from(chunk));}
   const bytes=Buffer.concat(chunks),sha256=createHash('sha256').update(bytes).digest('hex');if(asset.assetId!=='sha256:'+sha256)throw Error('plr-artifact-hash-mismatch');
   writeFileSync(temporary,bytes,{flag:'wx'});const p=await decode(temporary),file=path.join(folder,'source.'+p.extension);renameSync(temporary,file);return {file,sha256,bytes:total,width:p.width,height:p.height};
  }finally{if(existsSync(temporary))unlinkSync(temporary);}
 }
 async function execute(id,release){
  try{
   const {run}=store.get(id);const items=store.executionItems(id);
   for(let row of items){
    if(stopping||store.getState(id).state.status==='paused')return store.setRunStatus(id,'paused');
    if(!row.selected||row.status==='needs_review'||row.status==='skipped')continue;
    if(row.status==='failed'||row.status==='submission_uncertain'||row.status==='dispatching')throw Error('plr-reconcile-or-review-required');
    let token=row.attempts.at(-1)?.token;
    if(!token){
     const cap=await waitForIdle(id);const model=cap.models.find(m=>m.id===run.preset.model);
     if(!model?.ratios.includes(run.preset.aspectRatio)||!model.resolutions.includes(run.preset.resolution))throw Error('plr-model-config-not-supported');
     const quote=await client.preflight(run.preset);
     if(stopping||store.getState(id).state.status==='paused')return store.setRunStatus(id,'paused');
     try{token=await client.submit(row.submittedPrompt,run.preset,quote,async initial=>{row=store.beginAttempt(id,row.id,{expectedRevision:row.revision,creditsReserved:quote.perTask});row=patch(id,row,'dispatching',{...initial,profileAccountId:quote.accountId});});token={...token,profileAccountId:quote.accountId};row=patch(id,row,'submitted',token);}
     catch(e){const latest=store.executionItem(id,row.id);if(latest.attempts.length)patch(id,latest,e.safeToRetry?'failed':'submission_uncertain',undefined,undefined,e.message);throw e;}
    }
    let complete=false;
    for(let n=0;n<maxPolls;n++){
     if(stopping||store.getState(id).state.status==='paused')return store.setRunStatus(id,'paused');
     const result=await client.refresh(token);token=result;
     if(result.status==='needs_review'){const artifact=await download(id,row,result);patch(id,row,'needs_review',result,artifact);complete=true;break;}
     if(['failed','submission_uncertain'].includes(result.status)){patch(id,row,result.status,result,undefined,result.error);throw Error(result.error||'plr-task-failed');}
     row=patch(id,row,'submitted',result);await sleep(pollMs);
    }
    if(!complete)throw Error('plr-poll-timeout-resume-same-task');
   }
   try{await waitForIdle(id);}catch(e){return store.setRunStatus(id,'needs_review','plr-session-cleanup: '+e.message);}
   return store.setRunStatus(id,'needs_review');
  }catch(e){return store.setRunStatus(id,'blocked',e.message);}
  finally{active=null;release();}
 }
 function start(id){
  if(active||isExternalBusy())throw Error('plr-executor-busy');
  const {run,state}=store.get(id),rows=store.executionItems(id);if(state.status==='cancelled')throw Error('plr-run-cancelled');
  if(run.preset.background==='remove'&&!canSegment())throw Error('plr-background-worker-not-ready');
  if(rows.some(r=>['dispatching','submission_uncertain','failed'].includes(r.status)))throw Error('plr-reconcile-or-review-required');
  const remaining=rows.filter(r=>r.selected&&!['needs_review','skipped'].includes(r.status));
  if(!remaining.length)throw Error('plr-no-pending-items');
  const hasUnsent=remaining.some(r=>r.status==='queued'),q=state.preflight;
  if(hasUnsent&&remaining[0].status!=='submitted'&&(!q||q.presetHash!==run.presetHash||q.expiresAt<=Date.now()||!q.budgetCoversEstimate))throw Error('plr-valid-preflight-required');
  const release=store.acquireExecutionLease();
  try{stopping=false;active=id;store.setRunStatus(id,'running');const promise=execute(id,release);tasks.set(id,promise);return {id,status:'running'};}catch(e){active=null;release();throw e;}
 }
 function pause(id){if(active&&active!==id)throw Error('plr-other-run-active');return store.setRunStatus(id,'paused');}
 async function reconcile(id){
  if(active||isExternalBusy())throw Error('plr-executor-busy');const release=store.acquireExecutionLease();active=id;
  try{
   for(const row of store.executionItems(id).filter(r=>['dispatching','submission_uncertain','submitted'].includes(r.status))){
    const token=row.attempts.at(-1)?.token;if(!token)throw Error('plr-token-missing-review-required');const result=await client.refresh(token);
    if(result.status==='needs_review'){patch(id,row,'submitted',result);patch(id,row,'needs_review',result,await download(id,row,result));}
    else patch(id,row,result.status==='failed'?'failed':result.status==='submission_uncertain'?'submission_uncertain':'submitted',result,undefined,result.error);
   }
   return store.setRunStatus(id,'paused');
  }catch(e){return store.setRunStatus(id,'blocked',e.message);}finally{active=null;release();}
 }
 return {start,pause,reconcile,prepare:waitForIdle,isBusy:()=>active!==null,wait:id=>tasks.get(id),dispose:()=>{stopping=true;}};
}
