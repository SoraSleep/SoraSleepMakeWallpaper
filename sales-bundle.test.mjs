import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { unzipSync } from 'fflate';
import { buildSalesBundle } from './sales-bundle.mjs';
test('sales bundle has separate customer/listing/QA folders and never auto approves',()=>{
 const bytes=Buffer.from('fixture');const input={schemaVersion:1,contentScope:'sfw',title:'Moon Cafe',seller:'SoraSleep',support:'support@example.test',sku:'moon-cafe',version:'1.0',license:'Personal use only.',description:'Artwork wallpaper collection.',aiDisclosure:'AI-assisted artwork, reviewed by seller.',artifacts:[{category:'Static',name:'portrait.png',base64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex')}]};
 const result=buildSalesBundle(input);const files=unzipSync(result.bytes);
 assert.ok(files['Customer/LICENSE.txt']);assert.ok(files['Listing/description.txt']);assert.ok(files['QA/report.json']);
 assert.equal(result.report.commercialReady,false);assert.equal(result.report.checks.decode,'pending');
 assert.throws(()=>buildSalesBundle({...input,seller:'[ARTIST / SELLER NAME]'}));
 assert.throws(()=>buildSalesBundle({...input,artifacts:[{...input.artifacts[0],name:'../secret.png'}]}));
 assert.throws(()=>buildSalesBundle({...input,artifacts:[{...input.artifacts[0],sha256:'bad'}]}));
});
