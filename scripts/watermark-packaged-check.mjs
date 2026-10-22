// Validate an unpacked release without installing, replacing or closing any app.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const app=process.argv[2];assert.ok(app,'Pass win-unpacked directory');const resources=path.join(app,'resources'),studio=path.join(resources,'studio'),runtime=path.join(resources,'runtime'),python=path.join(runtime,'python'),sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(studio,'runtime-checksums.json')));for(const entry of manifest)assert.equal(sha(fs.readFileSync(path.join(resources,entry.path.replace(/^payload\//,'')))),entry.sha256,entry.path);
for(const relative of ['integrations/manager-desktop/watermark-worker.py','integrations/manager-desktop/visual-review.mjs'])assert.equal(sha(fs.readFileSync(path.join(studio,relative))),sha(fs.readFileSync(relative)));
const out=path.resolve('real-test-output/watermark-fix/packaged');fs.mkdirSync(out,{recursive:true});
const formats=JSON.parse(fs.readFileSync('real-test-output/watermark-fix/formats-v3/report.json')),batch=JSON.parse(fs.readFileSync('real-test-output/watermark-fix/final-v3/report.json'));
const fixtures=[formats.items[0],batch.items.find(r=>r.ordinal===6)].map((row,i)=>({source:row.source,sourceSha256:sha(fs.readFileSync(row.source)),target:path.join(out,i+'.png'),expected:sha(fs.readFileSync(row.output))}));
const job=path.join(out,'jobs.json');fs.writeFileSync(job,JSON.stringify(fixtures));
const code=`import sys,json,hashlib,importlib.util,time,cv2
from pathlib import Path
cv2.setNumThreads(2)
spec=importlib.util.spec_from_file_location('wm',sys.argv[1]);wm=importlib.util.module_from_spec(spec);spec.loader.exec_module(wm)
results=[]
for job in json.loads(Path(sys.argv[2]).read_text()):
 start=time.perf_counter();report=wm.process(job);digest=hashlib.sha256(Path(job['target']).read_bytes()).hexdigest();assert digest==job['expected'];results.append({'seconds':time.perf_counter()-start,'sha256':digest,**report})
print(json.dumps({'passed':True,'results':results}))`;
const {stdout}=await promisify(execFile)(path.join(python,'python.exe'),['-u','-c',code,path.join(studio,'integrations/manager-desktop/watermark-worker.py'),job],{cwd:out,windowsHide:true,timeout:240000,maxBuffer:1000000,env:{...process.env,PYTHONHOME:python,PYTHONPATH:'',PYTHONNOUSERSITE:'1',SORASLEEP_PLR_MODELS:path.join(runtime,'models'),PATH:[path.join(process.env.SystemRoot,'System32'),python].join(';')}});
const report={...JSON.parse(stdout),manifestFiles:manifest.length,build:JSON.parse(fs.readFileSync(path.join(studio,'build-info.json'))),isolatedBundledPython:true,exactSourceReplayHashes:true,installationChanged:false,productionApprovals:0,generationRequests:0,creditsUsed:0};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,manifestFiles:manifest.length,seconds:report.results.map(r=>r.seconds)}));
