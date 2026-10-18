import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPlanStore } from './artwork-plan-store.mjs';
test('plan revisions survive restart and reject stale edits',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'art-plans-'));const store=createPlanStore(root);
 const first=store.save({prompt:'SFW landscape',variantChange:'Warm lights'});
 const next=store.save({prompt:'SFW landscape',variantChange:'Cool lights',planId:first.planId,baseRevision:1});
 assert.equal(next.revision,2);assert.equal(next.generationAllowed,false);
 assert.throws(()=>store.save({prompt:'Other',planId:first.planId,baseRevision:1}),/revision-conflict/);
 assert.equal(createPlanStore(root).list().length,2);
 assert.equal(store.list().find(p=>p.revision===1).imageB.change,'Warm lights');
});
test('legacy revisions normalize without modifying original bytes; collection survives new revisions',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'legacy-art-plans-'));const file=path.join(root,'legacy-plan-1.json');
 const legacy={planId:'legacy-plan',revision:1,createdAt:new Date().toISOString(),sourcePrompt:'Old scene',presetId:'difference-lens',imageB:{change:'Lights'}};const bytes=JSON.stringify(legacy);writeFileSync(file,bytes);
 const plan=createPlanStore(root).list()[0];assert.equal(plan.workflowType,'pair-reveal');assert.equal(plan.presetId,'difference-lens');assert.equal(readFileSync(file,'utf8'),bytes);
 const store=createPlanStore(root);const first=store.save({prompt:'Sakura',workflowType:'landscape',collectionId:'spring-collection',concept:{title:'Spring'},exportProfile:'static-image'});const second=store.save({planId:first.planId,baseRevision:1,prompt:'Sakura dawn'});
 assert.equal(second.workflowType,'landscape');assert.equal(second.collectionId,'spring-collection');assert.equal(second.concept.title,'Spring');assert.equal(second.imageB.required,false);
 const stock=store.save({planId:first.planId,baseRevision:2,prompt:'Sakura stock',workflowType:'stock'});assert.equal(stock.exportProfile,'stock-image');
});
