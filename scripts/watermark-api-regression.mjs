// Replay independently generated worker outputs through the real cache/API.
// This isolated fixture never approves assets in the user's production store.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {loadRuntime} from './runtime-config.mjs';
loadRuntime();
const {createWatermarkCleanup}=await import('../integrations/manager-desktop/watermark-cleanup.mjs'),{createPlrApi}=await import('../integrations/manager-desktop/plr-api.mjs'),{createPlrStore}=await import('../integrations/manager-desktop/plr-store.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),report=JSON.parse(fs.readFileSync('real-test-output/watermark-fix/final-v3/report.json')),out=path.resolve('real-test-output/watermark-fix/api');fs.mkdirSync(out,{recursive:true});
const fixtures=[1,6].map(n=>report.items.find(r=>r.ordinal===n));assert.ok(fixtures.every(Boolean));
const cleanup=createWatermarkCleanup({runWorker:async job=>{const fixture=fixtures.find(r=>r.sourceSha256===job.sourceSha256);assert.ok(fixture);const bytes=fs.readFileSync(fixture.output);assert.equal(sha(bytes),fixture.outputSha256);fs.writeFileSync(job.target,bytes);return{ok:true,...fixture};}});
for(const fixture of fixtures)await cleanup.clean(fixture.source,out,fixture.sourceSha256);
const api=createPlrApi({store:createPlrStore({root:path.join(out,'store')}),port:0,watermarkRoot:out});await api.listen();
const base='http://127.0.0.1:'+api.server.address().port,headers={Origin:'http://127.0.0.1:5173','X-SoraSleep-Bridge':'1'};
try{
 for(const fixture of fixtures){
  const bytes=fs.readFileSync(fixture.source),upload=route=>fetch(base+route,{method:'POST',headers:{...headers,'Content-Type':'image/jpeg'},body:bytes});
  const response=await upload('/visual-reviews/assets');assert.equal(response.status,200);const entry=await response.json();assert.equal(entry.regions.length,2);assert.deepEqual(entry.warnings,fixture.warnings);
  assert.equal((await upload('/watermark-cleanup?requireReview=1')).status,400);
  const decision=await fetch(base+'/visual-reviews/'+entry.id,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({status:'approved',notes:'Isolated automated cache/API fixture only',expectedRevision:entry.revision,inspected:true,inspectedRegionCount:2})});assert.equal(decision.status,200);
  const final=await upload('/watermark-cleanup?requireReview=1');assert.equal(final.status,200);assert.equal(sha(Buffer.from(await final.arrayBuffer())),fixture.outputSha256);assert.ok(final.headers.get('x-sorasleep-visual-review'));
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,images:2,cachedRealWorkerReplay:true,uncertaintyPropagated:true,exportGate:true,exactOutputHashes:true,productionApprovals:0,generationRequests:0},null,2));console.log('Two real cached outputs: API warnings, review gate and exact download hashes passed');
}finally{await api.close();}
