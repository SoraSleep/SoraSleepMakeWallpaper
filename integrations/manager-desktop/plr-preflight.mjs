import {createProfileStudioClient} from './profile-studio-client.mjs';
export function createPlrPreflight({store,baseUrl='http://127.0.0.1:17897',fetchImpl=fetch,now=()=>Date.now()}){
 const base=new URL(baseUrl);if(base.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(base.hostname)||base.username||base.password||base.pathname!=='/')throw Error('plr-image-dream-loopback-required');
 let busy=false;
 const call=async(route,body)=>{const response=await fetchImpl(new URL(route,base),{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(body?120000:15000)});if(!response.ok)throw Error('plr-image-dream-http-'+response.status);return response.json();};
 const client=createProfileStudioClient(call,base.origin);
 async function capabilities(){
  const [health,raw,profile]=await Promise.all([call('/api/health'),call('/api/models'),call('/api/profiles/status')]);
  if(health.appId!=='com.sorasleep.imagedream')throw Error('plr-wrong-image-dream-app');
  const models=(raw.free_models??[]).filter(m=>typeof m.id==='string'&&Array.isArray(m.allowed_ratios)&&Array.isArray(m.allowed_resolutions)).map(m=>({id:m.id,name:typeof m.name==='string'?m.name:m.id,ratios:m.allowed_ratios.filter(v=>typeof v==='string'),resolutions:m.allowed_resolutions.filter(v=>typeof v==='string')}));
  const profileOpen=!!profile.openAccountId,operationBusy=!!(profile.busy||profile.batchRunning);
  return {appId:health.appId,version:health.version,busy:health.busy===true||profileOpen||operationBusy,busyReason:operationBusy?'operation':profileOpen?'profile-open':health.busy?'operation':'idle',profileOpen,models,imageCount:1};
 }
 async function quote(id){
  if(busy)throw Error('plr-preflight-busy');busy=true;
  try{
   const cap=await capabilities();if(cap.busy)throw Error(cap.busyReason==='profile-open'?'plr-image-dream-idle-profile-open':'plr-image-dream-busy');
   const profile=await call('/api/profiles/status');if(profile.busy||profile.batchRunning||profile.openAccountId)throw Error('plr-image-dream-profile-open');
   const {run,state,counts}=store.get(id),model=cap.models.find(m=>m.id===run.preset.model);
   if(!model||!model.ratios.includes(run.preset.aspectRatio)||!model.resolutions.includes(run.preset.resolution))throw Error('plr-model-config-not-supported');
   if(counts.submission_uncertain||counts.dispatching||counts.submitted)throw Error('plr-reconcile-before-preflight');
   const remainingRows=counts.queued??0;if(!remainingRows)throw Error('plr-no-queued-prompts');
   const raw=await client.preflight(run.preset);
   const perTask=raw.perTask;if(!Number.isFinite(perTask)||perTask<=0||perTask>100000)throw Error('plr-invalid-quotation');
   const reservedCredits=store.executionItems(id).reduce((sum,row)=>sum+row.attempts.reduce((n,a)=>n+(a.creditsReserved??0),0),0),remainingBudget=Math.max(0,run.preset.maxCredits-reservedCredits);
   const value={reservedCredits,remainingBudget,presetHash:run.presetHash,perTask,remainingRows,estimatedCredits:perTask*remainingRows,maxCredits:run.preset.maxCredits,budgetCoversEstimate:perTask*remainingRows<=remainingBudget,enoughCreditsForFirstTask:raw.enoughCredits===true,entireRunCreditsVerified:false,generationRequests:0,quotedAt:now(),expiresAt:now()+600000,providerVersion:cap.version};
   return store.recordPreflight(id,{expectedRevision:state.revision,quote:value});
  }finally{busy=false;}
 }
 return {capabilities,quote,isBusy:()=>busy};
}
