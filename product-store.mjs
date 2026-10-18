import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import { buildSalesBundle } from './sales-bundle.mjs';

export function createProductStore(root) {
  mkdirSync(root,{recursive:true});
  const list=()=>readdirSync(root).filter(n=>n.endsWith('.json')).map(n=>JSON.parse(readFileSync(path.join(root,n),'utf8'))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return {list,
    save(input){
      const result=buildSalesBundle(input),id=randomUUID();
      const revision=list().filter(p=>p.sku===input.sku).length+1;
      const record={id,sku:input.sku,version:input.version,revision,title:input.title,createdAt:new Date().toISOString(),fileName:result.fileName,bytes:result.bytes.length,sha256:createHash('sha256').update(result.bytes).digest('hex'),status:'needs_review',report:result.report};
      const target=path.join(root,id+'.zip');writeFileSync(target+'.part',result.bytes);renameSync(target+'.part',target);
      writeFileSync(path.join(root,id+'.json.part'),JSON.stringify(record,null,2));renameSync(path.join(root,id+'.json.part'),path.join(root,id+'.json'));
      return record;
    },
    download(id){if(!/^[a-f0-9-]{36}$/.test(id))return null;const item=list().find(p=>p.id===id);return item?{item,bytes:readFileSync(path.join(root,id+'.zip'))}:null;}
  };
}
