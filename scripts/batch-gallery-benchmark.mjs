import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import {createPlrStore} from '../integrations/manager-desktop/plr-store.mjs';import {createLandscapeGallery} from '../integrations/manager-desktop/landscape-gallery.mjs';
const out=path.resolve('real-test-output/batch-soak-02'),pilot=JSON.parse(fs.readFileSync(path.join(out,'pilot.json'))),store=createPlrStore({root:path.join(process.env.APPDATA,'SoraSleepMakeWallpaper/PLRRuns')});
let cleanupCalls=0;const gallery=createLandscapeGallery({store,cleanup:{clean(){cleanupCalls++;throw Error('Gallery must not run native restoration');}}}),items=store.executionItems(pilot.id);assert.equal(items.length,50);
const start=performance.now();for(const row of items)await gallery.thumbnail(pilot.id,row.id);const coldSeconds=(performance.now()-start)/1000;
const warm=performance.now();for(const row of items)await gallery.thumbnail(pilot.id,row.id);const cachedSeconds=(performance.now()-warm)/1000;
assert.equal(cleanupCalls,0);const report={passed:true,realImages:50,coldOrExistingSeconds:coldSeconds,cachedSeconds,nativeCleanupCalls:cleanupCalls,newGenerationRequests:0,previewKind:'explicit source preview; not a sale output'};fs.writeFileSync(path.join(out,'gallery-benchmark.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
