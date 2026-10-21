import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// Durable operator harness against the installed app. Never creates a second
// batch on restart and never retries an uncertain provider submission.
const out=path.resolve('real-test-output/batch-soak-02');fs.mkdirSync(out,{recursive:true});
const stateFile=path.join(out,'pilot.json'),pilot=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile)):{requestKey:randomUUID(),count:50,maxCredits:250,createdAt:new Date().toISOString()};
const save=()=>{const temp=stateFile+'.part';fs.writeFileSync(temp,JSON.stringify(pilot,null,2));fs.renameSync(temp,stateFile);};save();
const reportFile=path.join(out,'report.json');
if(fs.existsSync(reportFile)){const prior=JSON.parse(fs.readFileSync(reportFile));if(prior.passed&&prior.runId===pilot.id&&prior.completed===pilot.count){console.log(JSON.stringify({passed:true,reusedCompletedRun:true,completed:prior.completed,reserved:prior.reserved,newGenerationRequests:0}));process.exit(0);}}
const base='http://127.0.0.1:17932',headers={Origin:'http://127.0.0.1:17880','X-SoraSleep-Bridge':'1','Content-Type':'application/json'};
async function call(route,body){const r=await fetch(base+route,{signal:AbortSignal.timeout(180000),...(body===undefined?{}:{method:'POST',headers,body:JSON.stringify(body)})});const value=await r.json();if(!r.ok)throw Error(value.error||'HTTP '+r.status);return value;}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const scenes=['a mountain lake framed by flowering cherry trees','a mossy forest stream below a small waterfall','a winding river through terraced green hills','a quiet coastal cove with wildflowers','a traditional wooden footbridge over a garden pond','a valley of pink flowering orchards','a meadow with white daisies and distant snowy peaks','a pine forest opening onto a turquoise alpine lake','a stone path beside a flowering hillside','a tranquil wetland with reeds and distant mountains'];
const lights=['delicate pale sunrise with light mist','soft spring morning after rain','clear midday with gentle cloud shadows','warm evening light and long natural shadows','blue hour with a subtle pastel sky'];
if(!pilot.id){const cap=await call('/image-dream/capabilities');assert.equal(cap.busy,false,'Image Dream must be idle');assert.ok(cap.models.some(m=>m.id==='high_aes_general_v43'&&m.ratios.includes('16:9')&&m.resolutions.includes('2k')));const run=await call('/landscape-batches',{requestKey:pilot.requestKey,title:'Spring landscape — batch stability 50',filename:'spring-landscape-50.txt',rows:Array.from({length:pilot.count},(_,i)=>({prompt:`Original SFW fine art landscape photograph of ${scenes[i%10]}, ${lights[Math.floor(i/10)]}, coherent natural perspective, realistic botanical details, balanced wide composition, refined natural colors, no people, no writing.`,group:'Spring landscapes'})),preset:{studio:'text-to-image-landscape',productKind:'background-art',model:'high_aes_general_v43',resolution:'2k',aspectRatio:'16:9',imageCount:1,maxCredits:pilot.maxCredits,maxRegenerations:0}});pilot.id=run.id;save();}
const route='/landscape-batches/'+pilot.id;
let lastLog=0;
for(;;){
 const run=await call(route),rows=run.items??run.rows;assert.ok(Array.isArray(rows),'Run response must include items');
 const completed=rows.filter(r=>r.attempts?.at(-1)?.artifact).length,reserved=rows.reduce((n,r)=>n+r.attempts.reduce((a,b)=>a+(b.creditsReserved??0),0),0);
 assert.ok(reserved<=pilot.maxCredits,'Credit budget exceeded');
 const progress={at:new Date().toISOString(),runId:pilot.id,total:pilot.count,completed,reserved,state:run.state.status,executorBusy:run.executorBusy};
 fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(progress,null,2));
 if(Date.now()-lastLog>30000){console.log(JSON.stringify(progress));lastLog=Date.now();}
 if(completed===pilot.count){const report={...progress,passed:rows.every(r=>r.attempts.length===1),pauseResume:pilot.pauseVerified===true,uniqueSourceHashes:new Set(rows.map(r=>r.attempts.at(-1).artifact.sha256)).size,items:rows.map(r=>({id:r.id,ordinal:r.ordinal,attempts:r.attempts.length,artifact:r.attempts.at(-1).artifact,createdAt:r.attempts[0].createdAt,updatedAt:r.attempts.at(-1).updatedAt})),wallSeconds:(Date.now()-Date.parse(pilot.createdAt))/1000,newApprovals:0};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));assert.ok(report.passed);console.log(JSON.stringify({passed:true,completed,reserved}));break;}
 if(run.state.status==='blocked'||rows.some(r=>['failed','submission_uncertain','dispatching'].includes(r.status)&&!run.executorBusy)){fs.writeFileSync(path.join(out,'blocked.json'),JSON.stringify({progress,state:run.state},null,2));throw Error('Batch needs reconciliation: '+run.state.error);}
 if(completed>=3&&!pilot.pauseRequested){await call(route+'/pause',{});pilot.pauseRequested=true;pilot.pauseSnapshot=rows.map(r=>({id:r.id,attempts:r.attempts.length,taskId:r.attempts.at(-1)?.token?.taskId}));save();console.log('Pause requested; restart the durable monitor against this same run.');break;}
 else if(pilot.pauseRequested&&!pilot.pauseVerified&&!run.executorBusy){await call(route+'/reconcile',{});pilot.pauseVerified=true;save();console.log('Existing tasks reconciled; resuming the same run.');}
 else if(!run.executorBusy&&['draft','preflighted','imported','ready','paused','needs_review','queued'].includes(run.state.status)){
  if(!rows.some(r=>r.status==='submitted')){const q=await call(route+'/preflight',{});fs.writeFileSync(path.join(out,'quote.json'),JSON.stringify(q,null,2));assert.ok(q.preflight.budgetCoversEstimate);assert.ok(q.preflight.enoughCreditsForFirstTask,'No verified free credits for the next task');}await call(route+'/resume',{});
 }
 await sleep(3000);
}
