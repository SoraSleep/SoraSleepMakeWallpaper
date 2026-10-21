import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,renameSync,openSync,closeSync,unlinkSync,readdirSync,existsSync} from 'node:fs';
import path from 'node:path';
const uuid=/^[a-f0-9-]{36}$/;
const sha=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new Error(message);};
const text=(v,max,required=false)=>typeof v==='string'&&v.length<=max&&(!required||v.trim())?v:fail('plr-invalid-text');
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max?v:fail('plr-invalid-integer');
const choose=(v,values)=>values.includes(v)?v:fail('plr-invalid-option');
export function parsePlrPreset(v){
 if(!v||typeof v!=='object'||Array.isArray(v))fail('plr-preset-required');
 const productKind=choose(v.productKind,['background-art','transparent-clipart']);
 if(v.studio!==undefined){choose(v.studio,['text-to-image-landscape']);if(productKind!=='background-art'||v.maxRegenerations>0)fail('landscape-static-keep-background-required');}
 return {version:1,productKind,promptPolicy:'verbatim',model:text(v.model,100,true),resolution:choose(v.resolution,['1k','2k','4k']),aspectRatio:choose(v.aspectRatio,['1:1','9:16','16:9','3:4','4:3','2:3','3:2','21:9']),imageCount:1,maxCredits:integer(v.maxCredits,1,100000),maxRegenerations:integer(v.maxRegenerations??0,0,5),background:productKind==='transparent-clipart'?'remove':'keep',outputFormat:productKind==='transparent-clipart'?'png-rgba':'jpeg',automaticUpscale:false,delivery:choose(v.delivery??'zip-parts',['zip-parts','etsy-digital']),includePromptsInBuyerPack:false};
}
export function parsePlrImport(v){
 if(!v||!uuid.test(v.requestKey||''))fail('plr-request-key-required');
 if(Buffer.byteLength(JSON.stringify(v))>6000000)fail('plr-import-too-large');
 const title=text(v.title,160,true),filename=text(v.filename,200,true),preset=parsePlrPreset(v.preset);
 if(v.preset.studio==='text-to-image-landscape'){preset.studio='text-to-image-landscape';if(!Array.isArray(v.rows)||v.rows.length>500)fail('landscape-max-500-prompts');}
 if(!Array.isArray(v.rows)||!v.rows.length||v.rows.length>5000)fail('plr-rows-max-5000');
 if(v.skipDuplicates!==undefined&&typeof v.skipDuplicates!=='boolean')fail('plr-invalid-skip');
 if(v.preset.promptPolicy!==undefined&&v.preset.promptPolicy!=='verbatim')fail('plr-rewrite-not-supported');
 if(v.preset.imageCount!==undefined&&v.preset.imageCount!==1)fail('plr-image-count-one');
 const seen=new Map();
 const rows=v.rows.map((row,i)=>{
  if(!row||typeof row!=='object')fail('plr-invalid-row');
  const prompt=text(row.prompt,8000,true),normalized=prompt.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase(),duplicateOf=seen.get(normalized)??null;
  if(duplicateOf===null)seen.set(normalized,i+1);
  return {ordinal:i+1,prompt,rawPromptHash:sha(prompt),title:text(row.title??'',160),group:text(row.group??'',160),selected:!(v.skipDuplicates===true&&duplicateOf!==null),duplicateOf};
 });
 const sourceHash=sha(JSON.stringify(rows.map(r=>({prompt:r.prompt,title:r.title,group:r.group}))));
 if(v.sourceFileSha256!==undefined&&!/^[a-f0-9]{64}$/.test(v.sourceFileSha256))fail('plr-invalid-source-hash');
 return {requestKey:v.requestKey,title,filename,preset,rows,sourceHash,sourceFileSha256:v.sourceFileSha256??null,skipDuplicates:v.skipDuplicates===true};
}
export function createPlrStore({root,beforeCommit,rename=renameSync}){
 root=path.resolve(root);mkdirSync(root,{recursive:true});
 let executionLeaseToken=null,workflowLeaseToken=null;const reservationCache=new Map();
 const runDir=id=>{if(!uuid.test(id||''))fail('plr-invalid-run-id');return path.join(root,id);};
 const read=file=>JSON.parse(readFileSync(file,'utf8'));
 function atomic(file,value){
  const tmp=file+'.'+randomUUID()+'.part';writeFileSync(tmp,JSON.stringify(value),{flag:'wx'});
  try{for(let n=0;;n++){try{rename(tmp,file);break;}catch(e){if(!['EPERM','EACCES','EBUSY'].includes(e.code)||n>=4)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10*(n+1));}}}
  finally{if(existsSync(tmp))unlinkSync(tmp);}
 }
 function locked(fn){
  const file=path.join(root,'.write-lock');let fd;
  try{fd=openSync(file,'wx');}
  catch(e){
   if(e.code!=='EEXIST')throw e;
   let owner;try{owner=read(file);}catch{fail('plr-store-lock-invalid');}
   if(!Number.isInteger(owner.pid)||owner.pid<1)fail('plr-store-lock-invalid');
   let dead=false;try{process.kill(owner.pid,0);}catch(error){if(error.code==='ESRCH')dead=true;}
   if(!dead)fail('plr-store-busy');
   unlinkSync(file);fd=openSync(file,'wx');
  }
  const token=randomUUID();
  try{writeFileSync(fd,JSON.stringify({pid:process.pid,token}));return fn();}
  finally{closeSync(fd);if(existsSync(file)&&read(file).token===token)unlinkSync(file);}
 }
 function manifest(id){
  const m=read(path.join(runDir(id),'run.json'));
  if(m.kind!=='sorasleep-plr-run'||m.schemaVersion!==1||m.id!==id||!Array.isArray(m.itemIds)||m.itemIds.some(x=>!uuid.test(x))||new Set(m.itemIds).size!==m.itemIds.length)fail('plr-corrupt-manifest');
  if(sha(JSON.stringify(m.preset))!==m.presetHash)fail('plr-preset-hash-mismatch');
  return m;
 }
 function item(id,itemId){
  if(!uuid.test(itemId||''))fail('plr-invalid-item-id');
  const row=read(path.join(runDir(id),'items',itemId+'.json'));
  if(row.id!==itemId||row.runId!==id||sha(row.rawPrompt)!==row.rawPromptHash||sha(row.submittedPrompt)!==row.rawPromptHash)fail('plr-prompt-hash-mismatch');
  return row;
 }
 function list(){return readdirSync(root).filter(x=>uuid.test(x)).map(id=>{const m=manifest(id);return {id,title:m.title,requestKey:m.requestKey,fingerprint:m.fingerprint,sourceHash:m.sourceHash,createdAt:m.createdAt,totalRows:m.itemIds.length,selectedRows:m.selectedRows};});}
 function create(input){const parsed=parsePlrImport(input),fingerprint=sha(JSON.stringify({...parsed,requestKey:undefined}));
  return locked(()=>{
   const previous=list().find(r=>r.requestKey===parsed.requestKey);
   if(previous){if(previous.fingerprint!==fingerprint)fail('plr-request-key-conflict');return manifest(previous.id);}
   const id=randomUUID(),staging=path.join(root,id+'.part'),items=parsed.rows.map(row=>({...row,id:randomUUID(),runId:id,rawPrompt:row.prompt,submittedPrompt:row.prompt,status:row.selected?'queued':'skipped',revision:1,attempts:[],selectedArtifact:null}));
   mkdirSync(path.join(staging,'items'),{recursive:true});
   const m={kind:'sorasleep-plr-run',schemaVersion:1,id,requestKey:parsed.requestKey,fingerprint,title:parsed.title,filename:parsed.filename,sourceHash:parsed.sourceHash,sourceFileSha256:parsed.sourceFileSha256,preset:parsed.preset,presetHash:sha(JSON.stringify(parsed.preset)),skipDuplicates:parsed.skipDuplicates,itemIds:items.map(r=>r.id),selectedRows:items.filter(r=>r.selected).length,createdAt:new Date().toISOString()};
   for(const row of items){delete row.prompt;writeFileSync(path.join(staging,'items',row.id+'.json'),JSON.stringify(row),{flag:'wx'});}
   writeFileSync(path.join(staging,'run.json'),JSON.stringify(m),{flag:'wx'});writeFileSync(path.join(staging,'state.json'),JSON.stringify({status:'draft',revision:1}),{flag:'wx'});
   beforeCommit?.(m);for(let attempt=0;;attempt++){try{rename(staging,runDir(id));break;}catch(error){if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=6||existsSync(runDir(id)))throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50*(attempt+1));}}return m;
  });
 }
 function get(id,{offset=0,limit=50}={}){
  integer(offset,0,5000);integer(limit,1,100);
  const m=manifest(id),state=read(path.join(runDir(id),'state.json')),rows=m.itemIds.map(itemId=>item(id,itemId)),counts={};
  for(const row of rows)counts[row.status]=(counts[row.status]??0)+1;
  return {run:m,state,counts,total:rows.length,offset,items:rows.slice(offset,offset+limit)};
 }
 function beginAttempt(id,itemId,{expectedRevision,creditsReserved=0}={}){
  return locked(()=>{const m=manifest(id);if(!m.itemIds.includes(itemId))fail('plr-item-not-in-run');const r=item(id,itemId);
   if(r.revision!==expectedRevision)fail('plr-item-revision-conflict');if(!r.selected)fail('plr-item-skipped');
   if(r.attempts.some(a=>['dispatching','submitted','submission_uncertain'].includes(a.status)))fail('plr-reconcile-before-new-attempt');
   if(r.attempts.length>=1+m.preset.maxRegenerations)fail('plr-attempt-limit');
   if(!Number.isFinite(creditsReserved)||creditsReserved<0)fail('plr-invalid-reservation');
   const leaseFile=path.join(root,'.executor-lock');
   if(existsSync(leaseFile)&&read(leaseFile).token!==executionLeaseToken)fail('plr-executor-busy');
   let reserved=executionLeaseToken?reservationCache.get(id):undefined;
   if(reserved===undefined)reserved=m.itemIds.map(id2=>item(id,id2)).reduce((n,row)=>n+row.attempts.reduce((sum,a)=>sum+(a.creditsReserved??0),0),0);
   if(reserved+creditsReserved>m.preset.maxCredits)fail('plr-credit-cap-exceeded');
   const attempt={id:randomUUID(),status:'dispatching',createdAt:new Date().toISOString(),transport:'installed-image-dream',token:null,creditsReserved};
   r.attempts.push(attempt);r.status='dispatching';r.revision++;atomic(path.join(runDir(id),'items',itemId+'.json'),r);if(executionLeaseToken)reservationCache.set(id,reserved+creditsReserved);return r;
  });
 }
 function recover(id){
  return locked(()=>{const m=manifest(id);let count=0;for(const itemId of m.itemIds){const r=item(id,itemId);let changed=false;for(const a of r.attempts)if(a.status==='dispatching'){a.status='submission_uncertain';changed=true;}
    if(changed){r.status='submission_uncertain';r.revision++;atomic(path.join(runDir(id),'items',itemId+'.json'),r);count++;}}
   return {runId:id,reconcileRequired:count};
  });
 }
 function checkpointAttempt(id,itemId,input){
  return locked(()=>{const m=manifest(id);if(!m.itemIds.includes(itemId))fail('plr-item-not-in-run');const r=item(id,itemId);
   if(r.revision!==input.expectedRevision)fail('plr-item-revision-conflict');
   const a=r.attempts.find(v=>v.id===input.attemptId);if(!a)fail('plr-attempt-not-found');
   const allowed={dispatching:['dispatching','submitted','submission_uncertain','failed'],submitted:['submitted','submission_uncertain','needs_review','failed'],submission_uncertain:['submission_uncertain','submitted','needs_review','failed'],needs_review:[],failed:[]};
   if(!allowed[a.status]?.includes(input.status))fail('plr-attempt-transition-invalid');
   if(input.token){
    if(typeof input.token!=='object'||Buffer.byteLength(JSON.stringify(input.token))>20000)fail('plr-token-invalid');
    const token={};
    for(const key of ['batchId','taskId','remoteTaskId','transport','provider','previousBatchId','prompt','profileAccountId'])if(input.token[key]!==undefined)token[key]=text(input.token[key],8000);
    if(input.token.submittedAt!==undefined)token.submittedAt=integer(input.token.submittedAt,1,Number.MAX_SAFE_INTEGER);
    if(a.token?.taskId&&token.taskId!==a.token.taskId||a.token?.batchId&&token.batchId!==a.token.batchId)fail('plr-task-identity-changed');
    a.token=token;
   }
   if(['submitted','needs_review'].includes(input.status)&&(!a.token?.batchId||!a.token?.taskId))fail('plr-task-identity-required');
   if(input.artifact){
    const v=input.artifact;if(!/^[a-f0-9]{64}$/.test(v.sha256||''))fail('plr-artifact-hash-required');
    a.artifact={file:text(v.file,1000,true),sha256:v.sha256,bytes:integer(v.bytes,1,100000000),width:integer(v.width,1,20000),height:integer(v.height,1,20000)};
    if(v.download)a.artifact.download={attempts:integer(v.download.attempts,1,3),elapsedMs:integer(v.download.elapsedMs,0,Number.MAX_SAFE_INTEGER)};
   }
   if(input.status==='needs_review'&&!a.artifact)fail('plr-downloaded-artifact-required');
   a.status=input.status;a.updatedAt=new Date().toISOString();if(input.error)a.error=text(input.error,1000);
   r.status=input.status;r.revision++;atomic(path.join(runDir(id),'items',itemId+'.json'),r);return r;
  });
 }
 function excludeItem(id,itemId,{expectedRevision,reason}){
  const release=acquireExecutionLease();try{return locked(()=>{const m=manifest(id);if(!m.itemIds.includes(itemId))fail('plr-item-not-in-run');const row=item(id,itemId);if(row.revision!==expectedRevision)fail('plr-item-revision-conflict');if(row.attempts.some(a=>['dispatching','submitted','submission_uncertain'].includes(a.status)))fail('plr-reconcile-before-exclude');if(!row.selected)fail('plr-item-already-excluded');row.exclusion={reason:text(reason,500,true),previousStatus:row.status,at:new Date().toISOString()};row.selected=false;row.status='skipped';row.revision++;atomic(path.join(runDir(id),'items',itemId+'.json'),row);return row;});}finally{release();}
 }
 function recordPreflight(id,{expectedRevision,quote}){
  return locked(()=>{const m=manifest(id),file=path.join(runDir(id),'state.json'),state=read(file);
   if(state.revision!==expectedRevision)fail('plr-run-revision-conflict');
   if(quote.presetHash!==m.presetHash||quote.generationRequests!==0||!Number.isFinite(quote.perTask)||quote.perTask<=0||!Number.isSafeInteger(quote.remainingRows)||quote.remainingRows<1||quote.estimatedCredits!==quote.perTask*quote.remainingRows||quote.maxCredits!==m.preset.maxCredits||quote.expiresAt<=quote.quotedAt)fail('plr-preflight-invalid');
   const next={...state,revision:state.revision+1,preflight:quote};atomic(file,next);return next;
  });
 }
 function setRunStatus(id,status,error=null){
  return locked(()=>{manifest(id);choose(status,['running','paused','blocked','needs_review','cancelled']);const file=path.join(runDir(id),'state.json'),state=read(file);
   const next={...state,status,error:error?text(error,1000):null,revision:state.revision+1,updatedAt:new Date().toISOString()};atomic(file,next);return next;
  });
 }
 function executionItems(id){const m=manifest(id);return m.itemIds.map(itemId=>item(id,itemId));}
 function artifactDirectory(id,itemId){const m=manifest(id);if(!m.itemIds.includes(itemId))fail('plr-item-not-in-run');const folder=path.join(runDir(id),'artifacts',itemId);mkdirSync(folder,{recursive:true});return folder;}
 function acquireExecutionLease(){
  const flowFile=path.join(root,'.workflow-lock');if(existsSync(flowFile)){const flow=read(flowFile);let live=true;try{process.kill(flow.pid,0);}catch(error){if(error.code==='ESRCH')live=false;}if(live&&flow.token!==workflowLeaseToken)fail('plr-workflow-busy');}
  const file=path.join(root,'.executor-lock');let fd;
  try{fd=openSync(file,'wx');}catch(e){
   if(e.code!=='EEXIST')throw e;const owner=read(file);if(!Number.isInteger(owner.pid)||owner.pid<1)fail('plr-executor-lock-invalid');
   let dead=false;try{process.kill(owner.pid,0);}catch(error){if(error.code==='ESRCH')dead=true;}
   if(!dead)fail('plr-executor-busy');unlinkSync(file);fd=openSync(file,'wx');
  }
  const token=randomUUID();writeFileSync(fd,JSON.stringify({pid:process.pid,token}));executionLeaseToken=token;reservationCache.clear();let closed=false;
  return ()=>{if(closed)return;closed=true;closeSync(fd);if(existsSync(file)&&read(file).token===token)unlinkSync(file);executionLeaseToken=null;reservationCache.clear();};
 }
 function acquireWorkflowLease(){
  const check=acquireExecutionLease();try{const file=path.join(root,'.workflow-lock');let fd;
  try{fd=openSync(file,'wx');}catch(e){if(e.code!=='EEXIST')throw e;const owner=read(file);if(!Number.isInteger(owner.pid)||owner.pid<1)fail('plr-workflow-lock-invalid');let dead=false;try{process.kill(owner.pid,0);}catch(error){if(error.code==='ESRCH')dead=true;}if(!dead)fail('plr-workflow-busy');unlinkSync(file);fd=openSync(file,'wx');}
  const token=randomUUID();writeFileSync(fd,JSON.stringify({pid:process.pid,token}));workflowLeaseToken=token;let closed=false;return()=>{if(closed)return;closed=true;closeSync(fd);if(existsSync(file)&&read(file).token===token)unlinkSync(file);workflowLeaseToken=null;};}finally{check();}
 }
 function executionItem(id,itemId){const m=manifest(id);if(!m.itemIds.includes(itemId))fail('plr-item-not-in-run');return item(id,itemId);}
 const getState=id=>({run:manifest(id),state:read(path.join(runDir(id),'state.json'))});
 function recoverInterruptedRuns(){
  const release=acquireExecutionLease();let count=0;
  try{for(const run of list()){if(getState(run.id).state.status==='running'){const result=recover(run.id);setRunStatus(run.id,result.reconcileRequired?'blocked':'paused',result.reconcileRequired?'plr-reconcile-after-restart':null);count++;}}return {recovered:count};}finally{release();}
 }
 return {create,get,list,beginAttempt,checkpointAttempt,recover,excludeItem,recordPreflight,setRunStatus,executionItems,executionItem,getState,artifactDirectory,acquireExecutionLease,acquireWorkflowLease,recoverInterruptedRuns};
}
