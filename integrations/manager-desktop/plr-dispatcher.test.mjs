import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';
import {createPlrStore} from './plr-store.mjs';import {createPlrPreflight} from './plr-preflight.mjs';import {createPlrDispatcher} from './plr-dispatcher.mjs';
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6C5sAAAAASUVORK5CYII=','base64'),hash=createHash('sha256').update(bytes).digest('hex');
function setup(n=2,{cap=n,downloadFail=false,uncertain=false,keepProfileOpen=false}={}){
 const store=createPlrStore({root:mkdtempSync(path.join(tmpdir(),'plr-dispatch-'))}),run=store.create({requestKey:randomUUID(),title:'Dispatcher fixture',filename:'prompts.txt',preset:{productKind:'background-art',model:'free',resolution:'2k',aspectRatio:'1:1',maxCredits:Math.max(1,cap)},rows:Array.from({length:n},(_,i)=>({prompt:'  Original '+i+'  '}))});let count=0,current={batchId:'old',tasks:[],counts:{}},gallery=[],failDownload=downloadFail===true?3:Number(downloadFail);const prompts=[];
 let profileOpen=false,closedProfiles=0;
 const fetchImpl=async(url,options={})=>{
  const route=new URL(url).pathname;if(route.startsWith('/downloads/')){if(failDownload){failDownload--;return new Response('',{status:500});}return new Response(bytes);}
  let value;
  if(route==='/api/health')value={appId:'com.sorasleep.imagedream',version:'fixture',busy:profileOpen};
  else if(route==='/api/models')value={free_models:[{id:'free',allowed_ratios:['1:1'],allowed_resolutions:['2k']}]};
  else if(route==='/api/profiles/status')value={busy:false,openAccountId:profileOpen?'fixture-profile':null};
  else if(route==='/api/accounts/fixture-profile/close-profile'){profileOpen=false;closedProfiles++;value={success:true};}
  else if(route==='/api/batch/preflight')value={generationRequests:0,enoughCredits:true,perTask:1,accountId:'fixture-profile'};
  else if(route==='/api/batch/queue')value=current;
  else if(route==='/api/batch/archive'){current={batchId:'old',tasks:[],counts:{}};value={};}
  else if(route==='/api/batch/start'){
   const body=JSON.parse(options.body);count++;prompts.push(body.prompts[0]);profileOpen=keepProfileOpen;const fileName='image-'+count+'.png';
   current={batchId:'batch-'+count,canArchive:true,counts:{pending:0,blocked:0},tasks:[{id:'task-'+count,prompt:body.prompts[0],status:'completed',createdAt:Date.now(),savedFiles:[fileName]}]};gallery=[{fileName,assetId:'sha256:'+hash}];
   if(uncertain)throw Error('simulated-response-lost');value={};
  }else if(route==='/api/integrations/assets')value=gallery;else throw Error('unexpected '+route);
  return {ok:true,json:async()=>value};
 };
 const config={store,fetchImpl,pollMs:0,sleep:async()=>{},decode:async()=>({width:1,height:1,extension:'png'})};
 return {store,run,fetchImpl,config,submits:()=>count,closedProfiles:()=>closedProfiles,prompts,quote:()=>createPlrPreflight({store,fetchImpl}).quote(run.id)};
}
test('500 fixture jobs complete with verbatim prompts, reserved cap and valid file hashes',async()=>{
 const s=setup(500);await s.quote();const d=createPlrDispatcher(s.config);d.start(s.run.id);await d.wait(s.run.id);const result=s.store.get(s.run.id);assert.equal(result.state.status,'needs_review');assert.equal(result.counts.needs_review,500);assert.equal(s.submits(),500);assert.equal(s.prompts[499],'  Original 499  ');const all=s.store.executionItems(s.run.id);assert.equal(all.reduce((n,r)=>n+r.attempts[0].creditsReserved,0),500);assert.equal(createHash('sha256').update(readFileSync(all[0].attempts[0].artifact.file)).digest('hex'),hash);
});
test('failed download resumes same task with no extra submit',async()=>{const s=setup(1,{downloadFail:true});await s.quote();const d=createPlrDispatcher(s.config);d.start(s.run.id);await d.wait(s.run.id);assert.equal(s.store.get(s.run.id).state.status,'blocked');assert.equal(s.submits(),1);const fresh=createPlrDispatcher(s.config);fresh.start(s.run.id);await fresh.wait(s.run.id);assert.equal(s.submits(),1);assert.equal(s.store.get(s.run.id).counts.needs_review,1);});
test('transient download retries automatically without another generation or reservation',async()=>{const s=setup(1,{downloadFail:1});await s.quote();const d=createPlrDispatcher(s.config);d.start(s.run.id);await d.wait(s.run.id);assert.equal(s.store.get(s.run.id).counts.needs_review,1);assert.equal(s.submits(),1);const row=s.store.executionItems(s.run.id)[0];assert.equal(row.attempts.length,1);assert.equal(row.attempts[0].creditsReserved,1);assert.equal(row.attempts[0].artifact.download.attempts,2);});
test('lost submit response reconciles exact task without another generation',async()=>{const s=setup(1,{uncertain:true});await s.quote();const d=createPlrDispatcher(s.config);d.start(s.run.id);await d.wait(s.run.id);assert.equal(s.store.get(s.run.id).counts.submission_uncertain,1);assert.throws(()=>d.start(s.run.id),/reconcile/);await d.reconcile(s.run.id);assert.equal(s.submits(),1);assert.equal(s.store.get(s.run.id).counts.needs_review,1);});
test('pause stops new dispatch and another controller cannot acquire same store lease',async()=>{const s=setup(2);await s.quote();let paused=false,d;d=createPlrDispatcher({...s.config,fetchImpl:async(url,options)=>{const v=await s.fetchImpl(url,options);if(new URL(url).pathname==='/api/batch/start'&&!paused){paused=true;d.pause(s.run.id);}return v;}});d.start(s.run.id);const other=createPlrDispatcher(s.config);assert.throws(()=>other.start(s.run.id),/executor-busy/);await d.wait(s.run.id);assert.equal(s.store.get(s.run.id).state.status,'paused');assert.equal(s.submits(),1);d.start(s.run.id);await d.wait(s.run.id);assert.equal(s.submits(),2);assert.equal(s.store.get(s.run.id).counts.needs_review,2);});
test('insufficient budget prevents dispatch',async()=>{const s=setup(2,{cap:1});await s.quote();const d=createPlrDispatcher(s.config);assert.throws(()=>d.start(s.run.id),/valid-preflight/);assert.equal(s.submits(),0);});
test('only idle profiles owned by completed tasks in the current run are closed',async()=>{const s=setup(2,{keepProfileOpen:true});await s.quote();const d=createPlrDispatcher(s.config);d.start(s.run.id);await d.wait(s.run.id);assert.equal(s.store.get(s.run.id).counts.needs_review,2);assert.equal(s.closedProfiles(),2);assert.equal(s.submits(),2);});
test('fresh per-task quote cannot exceed total reserved run cap',async()=>{const s=setup(2);await s.quote();const d=createPlrDispatcher({...s.config,fetchImpl:async(url,options)=>new URL(url).pathname==='/api/batch/preflight'&&s.submits()>=1?{ok:true,json:async()=>({generationRequests:0,enoughCredits:true,perTask:2,accountId:'fixture-profile'})}:s.fetchImpl(url,options)});d.start(s.run.id);await d.wait(s.run.id);assert.equal(s.submits(),1);assert.equal(s.store.get(s.run.id).state.status,'blocked');assert.match(s.store.get(s.run.id).state.error,/credit-cap/);});
