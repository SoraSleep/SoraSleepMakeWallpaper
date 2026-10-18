import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {chromium} from '../../SoraSleep-Image-Dream/node_modules/playwright/index.mjs';
const manager='D:/SoraSleep Main/Manager/desktop';
const {createPlrStore}=await import(pathToFileURL(path.join(manager,'plr-store.mjs'))),{createPlrApi}=await import(pathToFileURL(path.join(manager,'plr-api.mjs')));
const root=path.resolve('real-test-output/plr-04/real-pilot');fs.mkdirSync(root,{recursive:true});const stateFile=path.join(root,'pilot.json'),previous=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile)):{};
if(previous.completed){console.log('Pilot already completed; no extra generation.');process.exit(0);}
const base='http://127.0.0.1:17897',get=async route=>(await fetch(base+route)).json();
const profile=await get('/api/profiles/status'),queue=await get('/api/batch/queue');
if(profile.openAccountId&&!profile.busy&&!profile.batchRunning&&!queue.running&&!queue.processing&&!queue.counts?.pending){const response=await fetch(base+'/api/accounts/'+encodeURIComponent(profile.openAccountId)+'/close-profile',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!response.ok)throw Error('Cannot close idle background profile');}
const store=createPlrStore({root:path.join(root,'store')}),api=createPlrApi({store,port:17930});await api.listen();let browser;
const prompts=['Original SFW botanical watercolor illustration of a small cherry blossom branch with five pale pink blossoms and sage green leaves, warm ivory background, generous clean space on the right, delicate coherent petals, soft daylight, crisp natural contours, no people, no letters, no logos.','Original SFW watercolor illustration of a single cream ceramic teacup on a matching saucer beside two pink cherry blossoms, warm ivory background with ample clean space, coherent cup handle and natural gentle shadow, restrained sage and dusty pink palette, no people, no text, no lettering, no logos.'];
async function pollUntil(predicate,timeout=720000){const started=Date.now();while(Date.now()-started<timeout){const snapshot=store.get(previous.runId);if(snapshot.state.status==='blocked')throw Error(snapshot.state.error);if(predicate(snapshot))return snapshot;await new Promise(resolve=>setTimeout(resolve,2000));}throw Error('Timed out waiting for durable run state');}
if(previous.runId&&store.executionItems(previous.runId).every(r=>r.attempts.length===0))previous.pauseTested=false;
try{
 browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/?studio=plr',{waitUntil:'domcontentloaded',timeout:60000});
 if(!previous.runId){
  const file=path.join(root,'two-prompts.txt');fs.writeFileSync(file,prompts.join('\n'));await page.getByLabel('Import PLR prompts',{exact:true}).setInputFiles(file);await page.getByRole('button',{name:'Đọc cấu hình Image Dream',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã đọc cấu hình từ Image Dream'}).waitFor({timeout:60000});await page.getByLabel('PLR backend budget',{exact:true}).fill('30');await page.getByRole('button',{name:'Lưu collection vào Manager',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu 2 prompt trong Manager'}).waitFor({timeout:60000});previous.runId=store.list()[0].id;fs.writeFileSync(stateFile,JSON.stringify(previous,null,2));
  await page.getByRole('button',{name:'Báo giá thật · không gen ảnh',exact:true}).click();await Promise.race([page.getByRole('status').filter({hasText:'Đã lấy báo giá thật'}).waitFor({timeout:180000}),page.getByRole('alert').waitFor({timeout:180000}).then(async()=>{throw Error(await page.getByRole('alert').innerText());})]);
  const q=store.get(previous.runId).state.preflight;if(q.estimatedCredits>30)throw Error('Pilot quote exceeds cap30');await page.getByRole('button',{name:'Thực thi qua Image Dream',exact:true}).click();
 }else{
  await page.getByRole('button',{name:'Kiểm tra Manager',exact:true}).click();await page.getByLabel('Open PLR run '+previous.runId,{exact:true}).click();
  const snapshot=store.get(previous.runId);if(snapshot.counts.dispatching||snapshot.counts.submission_uncertain)await page.getByRole('button',{name:'Đối soát task',exact:true}).click();
  const fresh=store.get(previous.runId);if(fresh.counts.queued&&!fresh.counts.submitted){await page.getByRole('button',{name:'Báo giá thật · không gen ảnh',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lấy báo giá thật'}).waitFor({timeout:180000});}
  await page.getByRole('button',{name:'Tiếp tục run',exact:true}).click();
 }
 console.log('Real dispatcher running',previous.runId);
 if(!previous.pauseTested){
  await pollUntil(r=>(r.counts.submitted??0)>=1||(r.counts.needs_review??0)>=1,180000);
  await page.getByRole('button',{name:'Tạm dừng run',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục run',exact:true}).click({timeout:60000});previous.pauseTested=true;fs.writeFileSync(stateFile,JSON.stringify(previous,null,2));console.log('Paused and resumed without new attempt for active task');
 }
 await pollUntil(r=>r.state.status==='needs_review'&&r.counts.needs_review===2);
 const result=store.get(previous.runId),items=store.executionItems(previous.runId);assert.equal(items.length,2);assert.ok(items.every((r,i)=>r.rawPrompt===prompts[i]&&r.submittedPrompt===prompts[i]&&r.attempts.length===1&&r.attempts[0].artifact));assert.equal(new Set(items.map(r=>r.attempts[0].token.taskId)).size,2);assert.ok(items.reduce((n,r)=>n+r.attempts[0].creditsReserved,0)<=30);assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(root,'dispatcher.png'),fullPage:true});const report={passed:true,installedImageDream:true,runId:previous.runId,realPrompts:2,pauseResume:true,oneAttemptPerPrompt:true,artifacts:items.map(r=>({...r.attempts[0].artifact,ordinal:r.ordinal,taskId:r.attempts[0].token.taskId})),creditsReserved:items.reduce((n,r)=>n+r.attempts[0].creditsReserved,0),state:result.state.status,errors};fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2));previous.completed=true;fs.writeFileSync(stateFile,JSON.stringify(previous,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await api.close();}
