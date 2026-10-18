import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,readdirSync,renameSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createPlrStore,parsePlrImport} from './plr-store.mjs';
const root=()=>mkdtempSync(path.join(tmpdir(),'sorasleep-plr-store-'));
const payload=(n=500)=>({requestKey:randomUUID(),title:'PLR test',filename:'spring.txt',preset:{productKind:'background-art',model:'high_aes_general_v50',resolution:'2k',aspectRatio:'1:1',maxCredits:15},rows:Array.from({length:n},(_,i)=>({prompt:'  Original spring scene '+i+' '+ 'x'.repeat(500)+'  ',group:'Spring',title:''}))});
test('500 long prompts persist on disk beyond legacy 30KB and restore in a separate process',()=>{
 const folder=root(),store=createPlrStore({root:folder}),p=payload(),run=store.create(p);
 assert.equal(run.itemIds.length,500);assert.ok(Buffer.byteLength(JSON.stringify(p))>30000);
 const first=store.get(run.id),last=store.get(run.id,{offset:450,limit:50});
 assert.equal(first.items[0].rawPrompt,p.rows[0].prompt);assert.equal(last.items[49].submittedPrompt,p.rows[499].prompt);assert.equal(first.counts.queued,500);
 const output=execFileSync(process.execPath,['--input-type=module','-e',"import {createPlrStore} from "+JSON.stringify(import.meta.url.replace('plr-store.test.mjs','plr-store.mjs'))+";const s=createPlrStore({root:process.argv[1]});console.log(JSON.stringify(s.get(process.argv[2],{offset:499,limit:1})));",folder,run.id],{encoding:'utf8',windowsHide:true});
 assert.equal(JSON.parse(output).items[0].rawPrompt,p.rows[499].prompt);
});
test('idempotency and new-run semantics do not merge repeated prompts',()=>{
 const store=createPlrStore({root:root()}),p=payload(3);p.rows[1].prompt=p.rows[0].prompt;
 const run=store.create(p);assert.equal(store.create(p).id,run.id);assert.equal(store.get(run.id).counts.queued,3);assert.equal(new Set(run.itemIds).size,3);
 assert.throws(()=>store.create({...p,title:'Changed'}),/request-key-conflict/);
 assert.notEqual(store.create({...p,requestKey:randomUUID()}).id,run.id);
 const skipped=store.create({...p,requestKey:randomUUID(),skipDuplicates:true});assert.equal(store.get(skipped.id).counts.skipped,1);
});
test('new-run commit retries transient Windows folder locks without changing request identity',()=>{const folder=root(),p=payload(1);let attempts=0;const store=createPlrStore({root:folder,rename:(source,target)=>{if(source.endsWith('.part')&&!target.endsWith('.json')&&++attempts<3)throw Object.assign(Error('temporary lock'),{code:'EPERM'});return renameSync(source,target);}});const run=store.create(p);assert.equal(attempts,3);assert.equal(store.create(p).id,run.id);assert.equal(store.list().length,1);});
test('checkpoint before dispatch recovers uncertain and blocks blind retries',()=>{
 const folder=root(),store=createPlrStore({root:folder}),run=store.create(payload(1)),first=store.get(run.id).items[0];
 const pending=store.beginAttempt(run.id,first.id,{expectedRevision:1});assert.equal(pending.attempts.length,1);
 assert.throws(()=>store.beginAttempt(run.id,first.id,{expectedRevision:1}),/revision-conflict/);
 const restarted=createPlrStore({root:folder});assert.equal(restarted.recover(run.id).reconcileRequired,1);const recovered=restarted.get(run.id).items[0];assert.equal(recovered.status,'submission_uncertain');assert.equal(recovered.attempts[0].id,pending.attempts[0].id);
 assert.throws(()=>restarted.beginAttempt(run.id,first.id,{expectedRevision:recovered.revision}),/reconcile-before/);
});
test('interrupted create leaves no committed run and retry commits once',()=>{
 const folder=root(),p=payload(3),broken=createPlrStore({root:folder,beforeCommit:()=>{throw Error('simulated-stop');}});
 assert.throws(()=>broken.create(p),/simulated-stop/);assert.deepEqual(broken.list(),[]);
 const normal=createPlrStore({root:folder});normal.create(p);assert.equal(normal.list().length,1);assert.ok(readdirSync(folder).some(n=>n.endsWith('.part')));
});
test('bounded retry handles Windows transient rename; disk failure preserves checkpoint',()=>{
 const folder=root();let failMode='EPERM',calls=0;
 const store=createPlrStore({root:folder,rename:(a,b)=>{if(a.endsWith('.part')&&b.endsWith('.json')&&failMode){calls++;const e=Object.assign(Error(failMode),{code:failMode});if(failMode==='EPERM'&&calls>2)return renameSync(a,b);throw e;}return renameSync(a,b);}});
 const run=store.create(payload(2)),first=store.get(run.id).items[0];store.beginAttempt(run.id,first.id,{expectedRevision:1});assert.equal(calls,3);
 failMode='ENOSPC';calls=0;const second=store.get(run.id).items[1];assert.throws(()=>store.beginAttempt(run.id,second.id,{expectedRevision:1}),/ENOSPC/);assert.equal(calls,1);assert.equal(store.get(run.id).items[1].attempts.length,0);
});
test('active lock blocks mutations and dead owner recovers',()=>{
 const folder=root(),file=path.join(folder,'.write-lock'),store=createPlrStore({root:folder});
 writeFileSync(file,JSON.stringify({pid:process.pid,token:'test'}));assert.throws(()=>store.create(payload(1)),/store-busy/);
 const child=execFileSync(process.execPath,['-e','console.log(process.pid)'],{encoding:'utf8',windowsHide:true});writeFileSync(file,JSON.stringify({pid:Number(child.trim()),token:'old'}));store.create(payload(1));assert.equal(existsSync(file),false);
});
test('source tampering is detected; invalid schema/options/paths cannot execute',()=>{
 const folder=root(),store=createPlrStore({root:folder}),p=payload(1),run=store.create(p),item=store.get(run.id).items[0],file=path.join(folder,run.id,'items',item.id+'.json');
 const changed=JSON.parse(readFileSync(file));changed.rawPrompt='Changed';writeFileSync(file,JSON.stringify(changed));assert.throws(()=>store.get(run.id),/hash-mismatch/);
 assert.throws(()=>store.get('../outside'),/invalid-run-id/);assert.throws(()=>store.get(run.id,{limit:101}),/invalid-integer/);
 for(const field of [{imageCount:2},{promptPolicy:'rewrite'},{maxCredits:0},{aspectRatio:'4:5'}])assert.throws(()=>parsePlrImport({...p,preset:{...p.preset,...field}}));
 assert.throws(()=>parsePlrImport({...p,rows:[{prompt:''}]}));assert.equal(parsePlrImport({...p,commercialReady:true}).commercialReady,undefined);
});
test('attempt checkpoints bind task identity and require a verified artifact before review',()=>{
 const store=createPlrStore({root:root()}),run=store.create(payload(1));let row=store.get(run.id).items[0];row=store.beginAttempt(run.id,row.id,{expectedRevision:1});
 const patch=(status,token,artifact)=>store.checkpointAttempt(run.id,row.id,{expectedRevision:row.revision,attemptId:row.attempts[0].id,status,token,artifact});
 assert.throws(()=>patch('submitted',{}),/identity-required/);
 row=patch('dispatching',{previousBatchId:'old',submittedAt:Date.now(),prompt:row.rawPrompt});
 row=patch('submitted',{batchId:'batch',taskId:'task'});
 assert.throws(()=>patch('submitted',{batchId:'batch',taskId:'other'}),/identity-changed/);
 assert.throws(()=>patch('needs_review',{batchId:'batch',taskId:'task'}),/artifact-required/);
 row=patch('needs_review',{batchId:'batch',taskId:'task'},{file:'fixture.jpeg',sha256:'a'.repeat(64),bytes:100,width:2048,height:2048});
 assert.equal(row.status,'needs_review');assert.equal(store.get(run.id).items[0].attempts[0].artifact.width,2048);
 assert.throws(()=>patch('submitted',{batchId:'batch',taskId:'task'}),/transition-invalid/);
});
test('startup recovery normalizes interrupted runs without resetting completed work',()=>{
 const folder=root(),store=createPlrStore({root:folder}),run=store.create(payload(1));store.setRunStatus(run.id,'running');
 assert.equal(store.recoverInterruptedRuns().recovered,1);assert.equal(store.get(run.id).state.status,'paused');
 const row=store.get(run.id).items[0];store.beginAttempt(run.id,row.id,{expectedRevision:1});store.setRunStatus(run.id,'running');
 const restarted=createPlrStore({root:folder});restarted.recoverInterruptedRuns();assert.equal(restarted.get(run.id).state.status,'blocked');assert.equal(restarted.get(run.id).counts.submission_uncertain,1);
 const release=restarted.acquireExecutionLease();try{assert.throws(()=>store.recoverInterruptedRuns(),/executor-busy/);}finally{release();}
});

test('explicit exclusion preserves failed attempt, reservation and verbatim prompt; uncertain task cannot be excluded',()=>{const store=createPlrStore({root:root()}),run=store.create(payload(2));let row=store.get(run.id).items[0];const original=row.rawPrompt;row=store.beginAttempt(run.id,row.id,{expectedRevision:row.revision,creditsReserved:15});assert.throws(()=>store.excludeItem(run.id,row.id,{expectedRevision:row.revision,reason:'skip'}),/reconcile-before-exclude/);row=store.checkpointAttempt(run.id,row.id,{expectedRevision:row.revision,attemptId:row.attempts[0].id,status:'failed',error:'provider rejected'});const excluded=store.excludeItem(run.id,row.id,{expectedRevision:row.revision,reason:'Operator chose to exclude failed image'});assert.equal(excluded.selected,false);assert.equal(excluded.status,'skipped');assert.equal(excluded.rawPrompt,original);assert.equal(excluded.attempts[0].creditsReserved,15);assert.equal(excluded.attempts[0].error,'provider rejected');assert.equal(excluded.exclusion.previousStatus,'failed');assert.equal(store.executionItems(run.id)[1].selected,true);});
