import {readFileSync,writeFileSync,renameSync,existsSync,unlinkSync,realpathSync} from 'node:fs';import {createHash,randomUUID} from 'node:crypto';import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {decodePlrImage} from './plr-dispatcher.mjs';
const exec=promisify(execFile),sha=b=>createHash('sha256').update(b).digest('hex');
const recipe='plr-quality-dhash-foreground-v2';
export function visualFeatures(rgba){
 if(rgba.length!==4096)throw Error('plr-quality-pixel-buffer-invalid');const rgb=[];for(let i=0;i<rgba.length;i+=4){const alpha=rgba[i+3]/255;for(let c=0;c<3;c++)rgb.push(Math.round(rgba[i+c]*alpha+255*(1-alpha)));}
 const gray=(x,y)=>{const i=(y*32+x)*3;return rgb[i]*0.299+rgb[i+1]*0.587+rgb[i+2]*0.114;};let bits=0n;
 for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits=(bits<<1n)|BigInt(gray(Math.round(x*31/8),Math.round(y*31/7))>gray(Math.round((x+1)*31/8),Math.round(y*31/7)));
 return {dhash:bits.toString(16).padStart(16,'0'),rgb,alpha:Array.from({length:1024},(_,i)=>rgba[i*4+3])};
}
export function similarity(a,b){
 let x=BigInt('0x'+a.dhash)^BigInt('0x'+b.dhash),distance=0;while(x){distance++;if(distance>6)return null;x&=x-1n;}
 const hasAlpha=Array.isArray(a.alpha)&&a.alpha.length===1024&&Array.isArray(b.alpha)&&b.alpha.length===1024;
 const transparent=hasAlpha&&a.alpha.some(v=>v<250)&&b.alpha.some(v=>v<250);
 let total=0,weight=0,intersection=0,union=0;
 for(let pixel=0;pixel<1024;pixel++){
  const offset=pixel*3;
  const visibleA=transparent?a.alpha[pixel]>16:Math.max(255-a.rgb[offset],255-a.rgb[offset+1],255-a.rgb[offset+2])>24;
  const visibleB=transparent?b.alpha[pixel]>16:Math.max(255-b.rgb[offset],255-b.rgb[offset+1],255-b.rgb[offset+2])>24;
  if(visibleA||visibleB)union++;if(visibleA&&visibleB)intersection++;
  // White margins must not dilute the foreground difference.
  if(visibleA||visibleB){for(let c=0;c<3;c++)total+=Math.abs(a.rgb[offset+c]-b.rgb[offset+c]);weight+=3;}
 }
 const overlap=union?intersection/union:1;if(overlap<0.85)return null;
 const mean=weight?total/weight:0;return mean<=12?{distance,meanDifference:Number(mean.toFixed(2)),foregroundOverlap:Number(overlap.toFixed(3))}:null;
}
async function inspect(file){const info=await decodePlrImage(file);const {stdout}=await exec('ffmpeg.exe',['-v','error','-i',file,'-vf','scale=32:32','-frames:v','1','-pix_fmt','rgba','-f','rawvideo','pipe:1'],{windowsHide:true,timeout:30000,maxBuffer:100000,encoding:'buffer'});return {...info,...visualFeatures(stdout)};}
function atomic(file,value){const temp=file+'.'+randomUUID()+'.part';try{writeFileSync(temp,JSON.stringify(value,null,2),{flag:'wx'});for(let attempt=0;;attempt++){try{renameSync(temp,file);break;}catch(e){if(!['EPERM','EACCES','EBUSY'].includes(e.code)||attempt>=4)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,25*(attempt+1));}}}finally{if(existsSync(temp))unlinkSync(temp);}}
export function createPlrQuality({store,processor,inspectImage=inspect}){
 let busy=false,stopping=false;
 const folder=id=>path.dirname(path.dirname(store.artifactDirectory(id,store.getState(id).run.itemIds[0])));
 function inputs(id){return store.executionItems(id).filter(r=>r.selected).map(row=>{const processing=processor.readItem(id,row.id);let verified=false,actualHash=null;if(processing?.master){try{const root=realpathSync(store.artifactDirectory(id,row.id)),file=realpathSync(processing.master.file);if(path.dirname(file)!==root)throw Error('outside');actualHash=sha(readFileSync(file));verified=actualHash===processing.master.sha256;}catch{}}return{row,processing,verified,actualHash};});}
 const fingerprint=items=>sha(JSON.stringify({recipe,items:items.map(i=>({id:i.row.id,revision:i.row.revision,processing:i.processing,actualHash:i.actualHash,verified:i.verified}))}));
 function read(id){const file=path.join(folder(id),'quality.json');if(!existsSync(file))return null;const report=JSON.parse(readFileSync(file,'utf8')),selectionFile=path.join(folder(id),'selection.json'),selection=existsSync(selectionFile)?JSON.parse(readFileSync(selectionFile,'utf8')):null;return {...report,selection};}
 async function analyze(id){if(busy)throw Error('plr-quality-busy');const release=store.acquireExecutionLease();busy=true;stopping=false;
 try{const all=inputs(id),run=store.getState(id).run,items=[],features=new Map(),seen=new Map();
 for(const input of all){if(stopping)throw Error('plr-quality-stopped');const {row,processing:p,verified}=input,item={itemId:row.id,ordinal:row.ordinal,title:row.title||'Ảnh '+row.ordinal,masterSha256:p?.master?.sha256??null,blockers:[],warnings:[],exactDuplicateOf:null,nearDuplicates:[]};
 if(!p)item.blockers.push('processing-required');else if(p.sourceSha256!==row.attempts.at(-1)?.artifact?.sha256)item.blockers.push('processing-source-changed');else if(!verified)item.blockers.push('master-missing-or-changed');else{
  const cache=path.join(store.artifactDirectory(id,row.id),'quality-features.json');let f=null;try{f=existsSync(cache)?JSON.parse(readFileSync(cache,'utf8')):null;}catch{};
  if(f?.recipe!==recipe||f?.sha256!==p.master.sha256||f.rgb?.length!==3072||!/^[0-9a-f]{16}$/.test(f.dhash??'')){try{f={...await inspectImage(p.master.file),recipe,sha256:p.master.sha256};atomic(cache,f);}catch{item.blockers.push('master-decode-failed');item.suggested=false;items.push(item);continue;}}
  features.set(row.id,f);item.width=f.width;item.height=f.height;
  if(Math.min(f.width,f.height)<512)item.blockers.push('native-short-side-below-512');
  const [w,h]=run.preset.aspectRatio.split(':').map(Number);if(Math.abs((f.width/f.height)/(w/h)-1)>0.02)item.blockers.push('aspect-mismatch');
  if(run.preset.background==='remove'&&(p.background!=='removed'||!p.segmentation?.qa?.rgba))item.blockers.push('transparent-png-required');
  item.warnings.push(...(p.segmentation?.qa?.warnings??[]));item.warnings.push('visual-review-required');
  if(seen.has(p.master.sha256))item.exactDuplicateOf=seen.get(p.master.sha256);else seen.set(p.master.sha256,row.id);
  for(const other of items){if(other.masterSha256===item.masterSha256)continue;const previous=features.get(other.itemId);if(!previous||Math.abs((f.width/f.height)/(previous.width/previous.height)-1)>0.02)continue;const match=similarity(f,previous);if(match){if(item.nearDuplicates.length<5)item.nearDuplicates.push({itemId:other.itemId,...match});if(other.nearDuplicates.length<5)other.nearDuplicates.push({itemId:row.id,...match});}}
 }
 item.suggested=!item.blockers.length&&!item.exactDuplicateOf&&!item.nearDuplicates.length&&!item.warnings.some(w=>w!=='visual-review-required');items.push(item);
 }
 // Earlier rows can gain a near-duplicate warning while later rows are examined.
 for(const item of items)if(item.nearDuplicates.length)item.suggested=false;
 const report={schemaVersion:1,recipe,runId:id,fingerprint:fingerprint(all),analyzedAt:new Date().toISOString(),summary:{total:items.length,blocked:items.filter(i=>i.blockers.length).length,exactDuplicates:items.filter(i=>i.exactDuplicateOf).length,nearDuplicateItems:items.filter(i=>i.nearDuplicates.length).length,suggested:items.filter(i=>i.suggested).length},items,readyForSale:false,limitations:'Near duplicates are suggestions, not semantic or aesthetic approval. No automatic watermark inspection.'};atomic(path.join(folder(id),'quality.json'),report);return read(id);
 }finally{busy=false;release();}}
 function select(id,{fingerprint:expected,itemIds,expectedRevision}){const release=store.acquireExecutionLease();try{const report=read(id);if(!report||report.fingerprint!==expected||fingerprint(inputs(id))!==expected)throw Error('plr-quality-stale-analyze-again');if(!Array.isArray(itemIds)||new Set(itemIds).size!==itemIds.length)throw Error('plr-selection-invalid');const before=report.selection;if((before?.revision??0)!==expectedRevision)throw Error('plr-selection-revision-conflict');const hashes=new Set();for(const itemId of itemIds){const row=report.items.find(i=>i.itemId===itemId);if(!row||row.blockers.length)throw Error('plr-selection-blocked');if(hashes.has(row.masterSha256))throw Error('plr-selection-exact-duplicates');hashes.add(row.masterSha256);}const selection={revision:(before?.revision??0)+1,fingerprint:expected,itemIds,updatedAt:new Date().toISOString(),readyForSale:false};atomic(path.join(folder(id),'selection.json'),selection);return selection;}finally{release();}}
 function selectedSnapshot(id,{fingerprint:expected,selectionRevision}){const report=read(id),all=inputs(id);if(!report||report.fingerprint!==expected||fingerprint(all)!==expected||report.selection?.fingerprint!==expected||report.selection?.revision!==selectionRevision)throw Error('plr-quality-stale-analyze-again');if(!report.selection.itemIds.length)throw Error('plr-package-empty-selection');const items=report.selection.itemIds.map(itemId=>{const input=all.find(i=>i.row.id===itemId),qa=report.items.find(i=>i.itemId===itemId);if(!input?.verified||!qa||qa.blockers.length)throw Error('plr-package-selection-blocked');return{...input,qa};});if(new Set(items.map(i=>i.actualHash)).size!==items.length)throw Error('plr-selection-exact-duplicates');return{report,selection:report.selection,items};}
 return{analyze,read,select,selectedSnapshot,isBusy:()=>busy,dispose:()=>{stopping=true;}};
}
