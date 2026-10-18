import test from 'node:test';
import assert from 'node:assert/strict';
import { createArtworkPlan } from './wallpaper-art-plan.mjs';

test('plan preserves source, requires an edit mask and never authorizes generation',()=>{
  const plan=createArtworkPlan({prompt:'Quán cà phê bên hồ',variantChange:'Hoa phát sáng',aspectRatio:'9:16'});
  assert.equal(plan.sourcePrompt,'Quán cà phê bên hồ');
  assert.equal(plan.imageB.parentRole,'imageA');
  assert.equal(plan.imageB.operation,'masked-edit');
  assert.equal(plan.generationAllowed,false);
  assert.equal(plan.review.sfw,'unreviewed');
  assert.equal(plan.review.rights,'unreviewed');
  assert.equal(plan.presetId,'portal-reveal');
  assert.deepEqual(plan.mask.regions,[]);
});
test('missing change remains unresolved; invalid requests fail',()=>{
  assert.equal(createArtworkPlan({prompt:'Landscape'}).imageB.prompt,null);
  assert.equal(createArtworkPlan({prompt:'Landscape',presetId:'difference-lens'}).presetId,'difference-lens');
  for(const input of [{prompt:''},{prompt:'x',aspectRatio:'square'},{prompt:'x',presetId:'unknown'}]) assert.throws(()=>createArtworkPlan(input));
});
test('landscape and stock plan one image without a B, mask or reveal preset',()=>{
 for(const workflowType of ['landscape','stock']){
  const plan=createArtworkPlan({prompt:'Spring garden',workflowType,concept:{title:'Sakura',season:'spring'}});
  assert.equal(plan.requiresB,false);assert.equal(plan.imageB.required,false);assert.equal(plan.imageB.prompt,null);assert.equal(plan.presetId,null);assert.equal(plan.mask.status,'not_applicable');assert.equal(plan.generationAllowed,false);
  assert.ok(!plan.requirements.includes('approved-edit-mask'));assert.match(plan.imageA.prompt,/Sakura/);
 }
 assert.throws(()=>createArtworkPlan({prompt:'x',workflowType:'stock',presetId:'portal-reveal'}),/not-applicable/);
 assert.throws(()=>createArtworkPlan({prompt:'x',workflowType:'landscape',variantChange:'pink'}),/not-applicable/);
});
test('character workflow retains SFW and masked edit requirements; invalid concepts fail',()=>{
 const plan=createArtworkPlan({prompt:'Adult fictional character',workflowType:'character-wardrobe',variantChange:'Evening dress'});assert.equal(plan.imageB.operation,'masked-edit');assert.equal(plan.contentScope,'sfw');assert.ok(plan.requirements.includes('verified-masked-edit-provider'));
 for(const data of [{workflowType:'unknown'},{collectionId:'../outside'},{concept:[]},{workflowType:'stock',exportProfile:'windows-web'}])assert.throws(()=>createArtworkPlan({prompt:'x',...data}));
});
