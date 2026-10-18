import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync}from'node:fs';import{tmpdir}from'node:os';import path from'node:path';import{createHash}from'node:crypto';import{createProductStore}from'./product-store.mjs';
test('product artifacts persist and revisions never overwrite old ZIP',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'products-')),store=createProductStore(root),bytes=Buffer.from('fixture');
 const input={schemaVersion:1,contentScope:'sfw',title:'Lake',seller:'SoraSleep',support:'Internal QA',sku:'lake',version:'test',license:'Internal QA only',description:'QA',aiDisclosure:'No generation',artifacts:[{category:'Static',name:'fixture.png',base64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex')}]};
 const a=store.save(input),b=store.save(input);assert.equal(b.revision,2);assert.notEqual(a.id,b.id);assert.equal(createProductStore(root).list().length,2);assert.ok(store.download(a.id).bytes.length);assert.equal(store.download('../secret'),null);
});
