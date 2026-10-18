import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
const manager='D:/SoraSleep Main/Manager/desktop',root=path.resolve('real-test-output/plr-02-03/live-check-'+Date.now());fs.mkdirSync(root,{recursive:true});
const {createPlrStore}=await import(pathToFileURL(path.join(manager,'plr-store.mjs'))),{createPlrPreflight}=await import(pathToFileURL(path.join(manager,'plr-preflight.mjs')));
const store=createPlrStore({root:path.join(root,'store')}),run=store.create({requestKey:randomUUID(),title:'Live quote check',filename:'one-prompt.txt',preset:{productKind:'background-art',model:'high_aes_general_v50',resolution:'2k',aspectRatio:'1:1',maxCredits:15},rows:[{prompt:'Original SFW spring botanical illustration'}]});
const calls=[],fetchImpl=async(url,options)=>{calls.push({route:new URL(url).pathname,method:options.method});return fetch(url,options);};
const controller=createPlrPreflight({store,fetchImpl});
const snapshot=async()=>{const v=await(await fetch('http://127.0.0.1:17897/api/batch/queue')).json();return {batchId:v.batchId,tasks:v.tasks?.map(t=>({id:t.id,status:t.status}))};};
const before=await snapshot();let quote=null,error=null;try{quote=await controller.quote(run.id);}catch(e){error=e.message;}
assert.deepEqual(await snapshot(),before);assert.ok(calls.every(c=>c.method==='GET'||c.route==='/api/batch/preflight'));assert.equal(store.get(run.id).items[0].attempts.length,0);
const report={installedImageDream:true,root,quote:quote?.preflight??null,error,realQuoteVerified:!!quote,realBusyGateVerified:['plr-image-dream-busy','plr-image-dream-profile-open','plr-image-dream-idle-profile-open'].includes(error),generationAttempts:0,queueUnchanged:true,calls};
fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.resolve('real-test-output/plr-02-03/live-latest.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
