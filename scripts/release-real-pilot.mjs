import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const out=path.resolve('real-test-output/release-2026-10-18');fs.mkdirSync(out,{recursive:true});
const moduleAt=name=>import(pathToFileURL((process.env.SORASLEEP_MANAGER_DESKTOP??path.resolve('integrations/manager-desktop'))+'/'+name));
const {createPlrStore}=await moduleAt('plr-store.mjs'),{createPlrPreflight}=await moduleAt('plr-preflight.mjs'),{createPlrDispatcher}=await moduleAt('plr-dispatcher.mjs'),{createLandscapeGallery}=await moduleAt('landscape-gallery.mjs'),{createLandscapeExporter}=await moduleAt('landscape-export.mjs'),{createLandscapeQuality}=await moduleAt('landscape-quality.mjs');
const store=createPlrStore({root:path.join(out,'store')}),preflight=createPlrPreflight({store}),dispatcher=createPlrDispatcher({store});
const file=path.join(out,'pilot.json'),pilot=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{};
try{
 const cap=await preflight.capabilities();assert.equal(cap.busy,false,'Image Dream is busy');const model=cap.models.find(m=>m.id==='high_aes_general_v43')??cap.models.find(m=>m.ratios.includes('16:9')&&m.resolutions.includes('2k'));assert.ok(model);
 if(!pilot.id){const run=store.create({requestKey:randomUUID(),title:'Release pilot spring mountain valley',filename:'release-pilot.txt',rows:[{prompt:'A serene spring mountain valley with flowering wild cherry trees beside a winding turquoise river, soft morning mist, distant snow capped mountains, natural realistic landscape photography, coherent perspective, detailed foliage, no people, no lettering.'}],preset:{studio:'text-to-image-landscape',productKind:'background-art',model:model.id,resolution:'2k',aspectRatio:'16:9',imageCount:1,maxCredits:30,maxRegenerations:0}});pilot.id=run.id;pilot.started=Date.now();fs.writeFileSync(file,JSON.stringify(pilot));}
 let rows=store.executionItems(pilot.id);if(!rows[0].attempts.length){const quote=await preflight.quote(pilot.id);fs.writeFileSync(path.join(out,'quote.json'),JSON.stringify(quote,null,2));dispatcher.start(pilot.id);await dispatcher.wait(pilot.id);}
 rows=store.executionItems(pilot.id);assert.equal(rows[0].status,'needs_review',store.getState(pilot.id).state.error);assert.equal(rows[0].attempts.length,1);
 const quality=await createLandscapeQuality({store}).analyze(pilot.id);assert.equal(quality.flagged,0);const gallery=createLandscapeGallery({store}),exporter=createLandscapeExporter({store,gallery});const pack=await exporter.build(pilot.id,{mode:'all'});
 for(const entry of pack.files){const artifact=await exporter.artifact(pilot.id,pack.key,entry.file);fs.copyFileSync(artifact.file,path.join(out,entry.file));}
 fs.copyFileSync(rows[0].attempts[0].artifact.file,path.join(out,'original.jpg'));
 const report={passed:true,newGeneration:true,runId:pilot.id,attempts:rows[0].attempts.length,creditsReserved:rows[0].attempts[0].creditsReserved,model:store.getState(pilot.id).run.preset.model,elapsedSeconds:(Date.now()-pilot.started)/1000,quality,zip:pack,watermark:'provider marks may remain'};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{dispatcher.dispose();}
