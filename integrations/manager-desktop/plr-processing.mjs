import {readFileSync,writeFileSync,appendFileSync,renameSync,existsSync,unlinkSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {decodePlrImage} from './plr-dispatcher.mjs';
import {createSegmentationWorker,segmentationAvailable,segmentationRecipe} from './plr-segmentation.mjs';
const exec=promisify(execFile),hash=b=>createHash('sha256').update(b).digest('hex');
export function createPlrProcessor({store,cleanup,decode=decodePlrImage,canSegment=segmentationAvailable,createSegmenter=createSegmentationWorker,preview=async(source,target)=>{await exec('ffmpeg.exe',['-v','error','-f','lavfi','-i','color=c=0x253244:s=640x640','-i',source,'-filter_complex','[1:v]scale=640:640:force_original_aspect_ratio=decrease[fg];[0:v][fg]overlay=(W-w)/2:(H-h)/2:format=auto,format=yuvj420p[out]','-map','[out]','-frames:v','1','-q:v','3','-y',target],{windowsHide:true,timeout:30000});}}){
 let busy=false,activeWorker=null,stopping=false;
 async function process(id){
  if(busy)throw Error('plr-processing-busy');const release=store.acquireExecutionLease();busy=true;stopping=false;let worker;
  try{
   const {run}=store.get(id),remove=run.preset.background==='remove';if(remove&&!canSegment())throw Error('plr-segmentation-worker-not-ready');
   const recipe=(remove?segmentationRecipe:'native-preserve-v1')+(cleanup?':'+cleanup.recipe:''),results=[];
   for(const row of store.executionItems(id).filter(r=>r.selected)){
    if(stopping)throw Error('plr-processing-stopped');
    try{
    const errorFile=path.join(store.artifactDirectory(id,row.id),'processing-error.json');
    const source=row.attempts.at(-1)?.artifact;if(!source){results.push({itemId:row.id,status:'source_missing'});continue;}
    const folder=store.artifactDirectory(id,row.id),reportFile=path.join(folder,'processing.json');
    if(path.dirname(path.resolve(source.file))!==path.resolve(folder))throw Error('plr-source-path-invalid');
    const bytes=readFileSync(source.file);if(hash(bytes)!==source.sha256||bytes.length!==source.bytes)throw Error('plr-source-changed');
    const verified=a=>a&&path.dirname(path.resolve(a.file))===path.resolve(folder)&&existsSync(a.file)&&hash(readFileSync(a.file))===a.sha256;
    if(existsSync(reportFile)){const old=JSON.parse(readFileSync(reportFile,'utf8'));if(old.recipe===recipe&&old.sourceSha256===source.sha256&&verified(old.master)&&verified(old.preview)&&(!remove||verified(old.alphaPreview))){if(old.previewRecipe!=='alpha-dark-v1'){const temporary=path.join(folder,randomUUID()+'.jpg');try{await preview(old.master.file,temporary);await decode(temporary);renameSync(temporary,old.preview.file);old.preview.sha256=hash(readFileSync(old.preview.file));old.previewRecipe='alpha-dark-v1';const record=reportFile+'.'+randomUUID()+'.part';try{writeFileSync(record,JSON.stringify(old,null,2));renameSync(record,reportFile);}finally{if(existsSync(record))unlinkSync(record);}}finally{if(existsSync(temporary))unlinkSync(temporary);}}if(existsSync(errorFile))unlinkSync(errorFile);results.push(old);continue;}}
    const info=await decode(source.file);if(info.width!==source.width||info.height!==source.height)throw Error('plr-source-dimensions-changed');
    const cleaned=cleanup?await cleanup.clean(source.file,folder,source.sha256):null,working=cleaned??{file:source.file,sha256:source.sha256},cleanBytes=cleaned?readFileSync(cleaned.file):bytes;
    const master=path.join(folder,'master.'+(remove||cleaned?.reencoded?'png':info.extension)),thumb=path.join(folder,'preview.jpg'),temp=path.join(folder,randomUUID()+'.jpg'),tmp=path.join(folder,randomUUID()+(remove?'.png':'.part'));
    let segmentation,alphaPreview;
    try{
     if(remove){worker??=createSegmenter();activeWorker=worker;segmentation=await worker.segment(working.file,tmp,working.sha256);const actual=await decode(tmp);if(actual.extension!=='png'||actual.width!==info.width||actual.height!==info.height||!segmentation.qa?.rgba)throw Error('plr-transparent-output-invalid');}
     else writeFileSync(tmp,cleanBytes,{flag:'wx'});
     await preview(tmp,temp);await decode(temp);
     if(remove){const qaFile=path.join(folder,'alpha-review.jpg');await decode(tmp+'_qa.jpg');renameSync(tmp+'_qa.jpg',qaFile);alphaPreview={file:qaFile,sha256:hash(readFileSync(qaFile))};}
     renameSync(temp,thumb);renameSync(tmp,master);
    }finally{for(const file of [temp,tmp,tmp+'_qa.jpg'])if(existsSync(file))unlinkSync(file);}
    const ratio=run.preset.aspectRatio.split(':').map(Number),actual=info.width/info.height,expected=ratio[0]/ratio[1],masterBytes=readFileSync(master);
    const report={schemaVersion:2,recipe,previewRecipe:'alpha-dark-v1',itemId:row.id,ordinal:row.ordinal,status:'needs_visual_review',sourceSha256:source.sha256,master:{file:master,sha256:hash(masterBytes),bytes:masterBytes.length,width:info.width,height:info.height},preview:{file:thumb,sha256:hash(readFileSync(thumb))},...(alphaPreview?{alphaPreview,segmentation}:{}),background:remove?'removed':'preserved',upscaled:false,reencodedMaster:remove||!!cleaned?.reencoded,qa:{decode:true,sourceHash:true,nativeDimensions:true,aspectMatches:Math.abs(actual/expected-1)<0.02},watermarkStatus:cleaned?.watermark.status??'not-verified',...(cleaned?{watermark:cleaned.watermark}:{}),readyForSale:false,processedAt:new Date().toISOString()};
    const rp=reportFile+'.'+randomUUID()+'.part';try{writeFileSync(rp,JSON.stringify(report,null,2),{flag:'wx'});renameSync(rp,reportFile);}finally{if(existsSync(rp))unlinkSync(rp);}if(existsSync(errorFile))unlinkSync(errorFile);results.push(report);
    }catch(error){const file=path.join(store.artifactDirectory(id,row.id),'processing-error.json'),temp=file+'.'+randomUUID()+'.part';try{const record={itemId:row.id,ordinal:row.ordinal,error:error.message,at:new Date().toISOString()};writeFileSync(temp,JSON.stringify(record));renameSync(temp,file);appendFileSync(path.join(path.dirname(file),'processing-errors.jsonl'),JSON.stringify(record)+'\n');}finally{if(existsSync(temp))unlinkSync(temp);}throw Error('plr-processing-item-'+row.ordinal+': '+error.message);}
   }
   return {runId:id,processed:results.filter(r=>r.master).length,total:results.length,items:results,readyForSale:false};
  }finally{worker?.close();activeWorker=null;busy=false;release();}
 }
 function readItem(id,itemId){store.executionItem(id,itemId);const f=path.join(store.artifactDirectory(id,itemId),'processing.json');return existsSync(f)?JSON.parse(readFileSync(f,'utf8')):null;}
 function read(id){return {runId:id,items:store.executionItems(id).flatMap(row=>{const item=readItem(id,row.id);return item?[item]:[];})};}
 return {process,read,readItem,pause:()=>{stopping=true;},dispose:()=>{stopping=true;activeWorker?.close();},isBusy:()=>busy};
}
