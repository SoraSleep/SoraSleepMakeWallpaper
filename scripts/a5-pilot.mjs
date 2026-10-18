import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createPlanStore } from '../artwork-plan-store.mjs';
import { createJobStore } from '../wallpaper-jobs.mjs';
import { buildSalesBundle } from '../sales-bundle.mjs';
import { unzipSync } from 'fflate';
import assert from 'node:assert/strict';

const root=mkdtempSync(path.join(tmpdir(),'sorasleep-a5-'));
const plans=createPlanStore(path.join(root,'plans')),jobs=createJobStore(path.join(root,'jobs'));
const prompts=['Moonlit lake café','Rainy reading room','Mountain cabin','Garden observatory','Cloud castle','Lantern forest','Autumn library','Ocean lighthouse','Snow village','Original fully clothed fantasy traveler'];
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=','base64');
const sha256=createHash('sha256').update(bytes).digest('hex');
const rows=[];
for(const [i,prompt] of prompts.entries())for(const presetId of ['portal-reveal','difference-lens']){
 const start=performance.now(),id=`pilot-${i}-${presetId}`;
 try{
  const plan=plans.save({prompt,variantChange:'Warm lights become softly luminous',presetId});
  assert.equal(plan.generationAllowed,false);
  const assets=Object.fromEntries(['imageA','imageB','differenceMask'].map(role=>[role,{relativePath:`assets/${role}.png`,mimeType:'image/png',width:1,height:1,bytes:bytes.length,sha256,base64:bytes.toString('base64')}]));
  const input={schemaVersion:1,contentScope:'sfw',jobId:id,productId:`product-${i}-fixture`,idempotencyKey:id,presetId,assets};
  jobs.submit(input);jobs.submit(input);
  await new Promise(resolve=>setImmediate(resolve));
  const job=jobs.read(id);assert.equal(job.status,'needs_review');
  const source=jobs.artifact(id);assert.ok(unzipSync(source)['manifest.json']);
  const result=buildSalesBundle({schemaVersion:1,contentScope:'sfw',title:prompt,seller:'SoraSleep pilot',support:'Internal QA only',sku:id,version:'0.0-test',license:'Internal test fixture. Not for sale.',description:'Synthetic plumbing pilot; no generated artwork.',aiDisclosure:'No AI generation performed in this test.',artifacts:[{category:'Windows',name:'source-fixture.zip',base64:Buffer.from(source).toString('base64'),sha256:createHash('sha256').update(source).digest('hex')}]});
  assert.equal(result.report.commercialReady,false);assert.ok(unzipSync(result.bytes)['QA/report.json']);
  rows.push({id,presetId,status:'passed',stage:'synthetic-plumbing',durationMs:Math.round(performance.now()-start),bytes:result.bytes.length});
 }catch(error){rows.push({id,presetId,status:'failed',error:error.message});}
}
assert.equal(createPlanStore(path.join(root,'plans')).list().length,20);
assert.equal(createJobStore(path.join(root,'jobs')).list().length,20);
const report={schemaVersion:1,createdAt:new Date().toISOString(),scope:'A5 synthetic integration pilot, NOT artwork/device certification',fixture:'1x1 PNG used for API plumbing only; not valid wallpaper quality',rows,summary:{passed:rows.filter(r=>r.status==='passed').length,failed:rows.filter(r=>r.status==='failed').length},gates:{syntheticPipeline:'tested',providerGeneration:'not_run',creditsSpent:0,artworkQuality:'not_tested',rendererParity:'not_tested',videoDecode:'not_tested',loopSeam:'not_tested',windowsInstallation:'not_tested',androidInstallation:'not_tested',longSessionMemory:'not_tested'},releaseReady:false};
mkdirSync('a5-output',{recursive:true});writeFileSync('a5-output/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary));
if(report.summary.failed)process.exitCode=1;
