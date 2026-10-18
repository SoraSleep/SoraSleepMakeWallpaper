import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash,randomUUID} from 'node:crypto';import {execFileSync} from 'node:child_process';
const manager='D:/SoraSleep Main/Manager/desktop';
const {createPlrStore}=await import(pathToFileURL(path.join(manager,'plr-store.mjs')));
const {createProfileStudioClient}=await import(pathToFileURL(path.join(manager,'profile-studio-client.mjs')));
const root=path.resolve('real-test-output/plr-00-01/real-pilot');fs.mkdirSync(root,{recursive:true});const stateFile=path.join(root,'pilot.json'),base='http://127.0.0.1:17897';
const prompt='Original SFW botanical illustration of a single gracefully curved cherry blossom branch with five pale pink blossoms and a few sage green leaves, set against a warm ivory background with generous clean copy space on the right, delicate but coherent petal anatomy, crisp natural contours and restrained watercolor texture, soft diffuse daylight, no people, no text, no letters, no logos, no extra objects.';
const store=createPlrStore({root:path.join(root,'store')});
const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile)):{};const save=()=>{fs.writeFileSync(stateFile+'.part',JSON.stringify(state,null,2));fs.renameSync(stateFile+'.part',stateFile);};
const call=async(route,body)=>{const response=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(180000)});const value=await response.json();if(!response.ok)throw Error(value.error||'http-'+response.status);return value;};
const client=createProfileStudioClient(call,base);
function current(){return store.get(state.runId,{limit:1}).items[0];}
function checkpoint(status,token,artifact,error){const item=current();return store.checkpointAttempt(state.runId,item.id,{attemptId:item.attempts.at(-1).id,expectedRevision:item.revision,status,token,artifact,error});}
if(process.argv.includes('--submit')){
 if(state.runId&&current().attempts.length)throw Error('Existing attempt: poll/reconcile only. Never submit twice.');
 const health=await call('/api/health'),profile=await call('/api/profiles/status');if(health.appId!=='com.sorasleep.imagedream'||health.busy||profile.busy||profile.batchRunning||profile.openAccountId)throw Error('Image Dream not idle: no submit.');
 if(!state.runId){const run=store.create({requestKey:randomUUID(),title:'PLR real botanical pilot',filename:'one-original-prompt.txt',preset:{productKind:'background-art',model:'high_aes_general_v50',resolution:'2k',aspectRatio:'1:1',maxCredits:15},rows:[{prompt}]});state.runId=run.id;save();}
 const settings=store.get(state.runId).run.preset,quote=await client.preflight(settings);state.quote={perTask:quote.perTask,generationRequests:quote.generationRequests};save();
 if(quote.perTask>15)throw Error('Quote exceeds pilot cap15: no submit.');
 try{const token=await client.submit(prompt,settings,quote,async token=>{const row=current();store.beginAttempt(state.runId,row.id,{expectedRevision:row.revision});checkpoint('dispatching',token);});checkpoint('submitted',token);console.log(JSON.stringify({submitted:true,runId:state.runId,freeCreditQuote:quote.perTask,taskId:token.taskId}));}
 catch(error){if(current().attempts.length)checkpoint(error.safeToRetry?'failed':'submission_uncertain',undefined,undefined,error.message);throw error;}
}else if(process.argv.includes('--poll')){
 if(!state.runId)throw Error('No pilot run');const item=current(),attempt=item.attempts.at(-1);if(!attempt?.token)throw Error('No dispatch token');
 if(attempt.status==='needs_review'){console.log(JSON.stringify({status:'needs_review',artifact:attempt.artifact}));process.exit(0);}
 const result=await client.refresh(attempt.token);
 if(result.status==='needs_review'){
  if(result.assets.length!==1)throw Error('Pilot expects exactly one correlated candidate');const asset=result.assets[0],response=await fetch(asset.url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error('Download failed; poll same task');const bytes=Buffer.from(await response.arrayBuffer()),hash=createHash('sha256').update(bytes).digest('hex');if(asset.assetId!=='sha256:'+hash)throw Error('Source asset hash mismatch');
  const file=path.join(root,'image-original.jpeg');fs.writeFileSync(file+'.part',bytes);fs.renameSync(file+'.part',file);
  const probe=JSON.parse(execFileSync('ffprobe.exe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,codec_name','-of','json',file],{encoding:'utf8',windowsHide:true})).streams[0];
  execFileSync('ffmpeg.exe',['-v','error','-i',file,'-frames:v','1','-f','null','-'],{windowsHide:true,stdio:'pipe'});
  const artifact={file,sha256:hash,bytes:bytes.length,width:probe.width,height:probe.height};checkpoint('needs_review',result,artifact);state.result={status:'needs_review',runId:state.runId,artifact,decoded:true,promptVerbatim:current().submittedPrompt===prompt,generatedVia:'installed Image Dream 1.0.2',freeCreditQuote:state.quote.perTask};save();console.log(JSON.stringify(state.result));
 }else{checkpoint(result.status==='failed'?'failed':result.status==='submission_uncertain'?'submission_uncertain':'submitted',result,undefined,result.error);console.log(JSON.stringify({status:result.status,taskId:result.taskId,error:result.error}));}
}else throw Error('Use --submit once or --poll.');
