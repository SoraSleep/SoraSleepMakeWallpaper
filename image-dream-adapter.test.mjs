import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync}from'node:fs';import{tmpdir}from'node:os';import path from'node:path';
import{createImageDreamAdapter}from'./image-dream-adapter.mjs';
test('A generation is revision-bound, deduplicated, and uncertain submit is never retried automatically',async()=>{
 let calls=0;const root=mkdtempSync(path.join(tmpdir(),'dream-adapter-'));
 const adapter=createImageDreamAdapter({root,fetchImpl:async()=>{calls++;throw new Error('timeout');}});
 const plan={planId:'plan-0001',revision:1,planCopyReviewed:true,imageA:{prompt:'SFW lake'},aspectRatio:'9:16'};
 const result=await adapter.startA(plan,{model:'test',resolution:'2k'});assert.equal(result.status,'submission_uncertain');
 await adapter.startA(plan,{model:'test',resolution:'2k'});assert.equal(calls,1);
 assert.equal(adapter.list()[0].revision,1);
 assert.throws(()=>createImageDreamAdapter({root,baseUrl:'https://outside.invalid'}));
});
