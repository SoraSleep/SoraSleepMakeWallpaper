import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {decodePlrImage} from './plr-dispatcher.mjs';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const ratio = value => { const [a,b]=String(value||'').split(':').map(Number); return a>0&&b>0?a/b:null; };
export function createLandscapeQuality({store,decode=decodePlrImage}) {
  async function analyze(id, itemIds=null) {
    const state=store.getState(id); if(state.run.preset.studio!=='text-to-image-landscape') throw Error('landscape-batch-not-found');
    const expected=ratio(state.run.preset.aspectRatio), seen=new Map(), items=[];
    for(const row of store.executionItems(id).filter(row=>itemIds===null||itemIds.includes(row.id))) {
      const artifact=row.attempts.at(-1)?.artifact; if(!artifact){items.push({itemId:row.id,ordinal:row.ordinal,status:'missing',warnings:['missing-source']});continue;}
      const warnings=[]; let meta=null, hash=null;
      try { const file=fs.realpathSync(artifact.file), folder=fs.realpathSync(store.artifactDirectory(id,row.id)); if(path.dirname(file)!==folder) throw Error('outside'); const bytes=fs.readFileSync(file); hash=sha(bytes); if(hash!==artifact.sha256) warnings.push('source-hash-mismatch'); meta=await decode(file); if(meta.width!==artifact.width||meta.height!==artifact.height) warnings.push('metadata-mismatch'); if(expected&&Math.abs(meta.width/meta.height/expected-1)>.02) warnings.push('aspect-ratio');
      } catch { warnings.push('unreadable'); }
      if(hash){const prior=seen.get(hash); if(prior) warnings.push('duplicate'); else seen.set(hash,row.ordinal);}
      items.push({itemId:row.id,ordinal:row.ordinal,status:warnings.length?'review':'pass',width:meta?.width??null,height:meta?.height??null,sha256:hash,warnings});
    }
    return {schemaVersion:1,runId:id,total:items.length,passed:items.filter(x=>x.status==='pass').length,flagged:items.filter(x=>x.status!=='pass').length,duplicates:items.filter(x=>x.warnings.includes('duplicate')).length,items,createdAt:new Date().toISOString()};
  }
  return {analyze};
}
