import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),install=process.argv[2];assert.ok(install,'Pass the installed application directory');
const resources=path.join(install,'resources'),studio=path.join(resources,'studio'),out=path.resolve('real-test-output/watermark-fix/installed');fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(studio,'runtime-checksums.json')));for(const entry of manifest){const file=path.join(resources,entry.path.replace(/^payload\//,''));assert.equal(sha(fs.readFileSync(file)),entry.sha256,entry.path);}
for(const relative of ['integrations/manager-desktop/watermark-worker.py','integrations/manager-desktop/visual-review.mjs'])assert.equal(sha(fs.readFileSync(path.join(studio,relative))),sha(fs.readFileSync(relative)));
const formats=JSON.parse(fs.readFileSync('real-test-output/watermark-fix/formats-v3/report.json')),batch=JSON.parse(fs.readFileSync('real-test-output/watermark-fix/final-v3/report.json'));
const fixtures=[formats.items[0],batch.items.find(r=>r.ordinal===6)],results=[];
for(const [i,fixture] of fixtures.entries()){
 const start=performance.now(),response=await fetch('http://127.0.0.1:17932/visual-reviews/assets',{method:'POST',headers:{Origin:'http://127.0.0.1:17880','X-SoraSleep-Bridge':'1','Content-Type':'image/jpeg'},body:fs.readFileSync(fixture.source),signal:AbortSignal.timeout(180000)});
 const entry=await response.json();assert.equal(response.status,200,JSON.stringify(entry));assert.equal(entry.status,'pending');assert.equal(entry.regions.length,2);
 const bytes=Buffer.from(await fetch('http://127.0.0.1:17932'+entry.afterUrl).then(r=>r.arrayBuffer()));assert.equal(sha(bytes),sha(fs.readFileSync(fixture.output)));
 fs.writeFileSync(path.join(out,i+'.png'),bytes);results.push({source:fixture.source,outputSha256:sha(bytes),seconds:(performance.now()-start)/1000,warnings:entry.warnings,reviewStatus:entry.status});console.log(JSON.stringify(results.at(-1)));
}
const report={passed:true,manifestFiles:manifest.length,build:JSON.parse(fs.readFileSync(path.join(studio,'build-info.json'))),results,productionApprovals:0,generationRequests:0,creditsUsed:0};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
