import fs from 'node:fs';import path from 'node:path';import {randomUUID,createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {unzipSync} from 'fflate';
import {chromium} from '../../SoraSleep-Image-Dream/node_modules/playwright/index.mjs';
import {createRenderJobStore} from '../render-jobs.mjs';
const root=path.resolve('real-test-output/dreamina-installed-20261016');
const browser=await chromium.launch({headless:true,channel:'msedge'});let images;
try{const page=await browser.newPage();images=await page.evaluate(async encoded=>{
 const load=async data=>{const i=new Image();i.src='data:image/jpeg;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(i,0,0);return{c,x,p:x.getImageData(0,0,c.width,c.height)};};
 const a=await load(encoded.a),b=await load(encoded.b);if(a.c.width!==b.c.width||a.c.height!==b.c.height)throw new Error('dimension-mismatch');
 const c=document.createElement('canvas');c.width=a.c.width;c.height=a.c.height;const x=c.getContext('2d');const m=x.createImageData(c.width,c.height);
 for(let i=0;i<m.data.length;i+=4){const d=Math.max(...[0,1,2].map(k=>Math.abs(a.p.data[i+k]-b.p.data[i+k])));const v=Math.round(Math.max(0,Math.min(1,(d-12)/32))*255);m.data[i]=m.data[i+1]=m.data[i+2]=v;m.data[i+3]=255;}x.putImageData(m,0,0);
 return{width:c.width,height:c.height,imageA:a.c.toDataURL().split(',')[1],imageB:b.c.toDataURL().split(',')[1],differenceMask:c.toDataURL().split(',')[1]};
},{a:fs.readFileSync(path.join(root,'image-a.jpeg')).toString('base64'),b:fs.readFileSync(path.join(root,'image-b.jpeg')).toString('base64')});}finally{await browser.close();}
const assets=Object.fromEntries(['imageA','imageB','differenceMask'].map(role=>{const bytes=Buffer.from(images[role],'base64');return[role,{relativePath:`assets/${role}.png`,mimeType:'image/png',width:images.width,height:images.height,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),base64:images[role]}];}));
const store=createRenderJobStore({root:path.join(root,'RenderJobs')});const report={commercialReady:false,pairQuality:'rejected: scene changed outside requested edit',mask:'automatic pixel difference; diagnostic only, not approved',renders:[]};
for(const presetId of ['portal-reveal','difference-lens']){
 const job=store.submit({schemaVersion:1,contentScope:'sfw',jobId:randomUUID(),productId:randomUUID(),idempotencyKey:randomUUID(),title:'DIAGNOSTIC — pair requires revision',presetId,assets,maskEncoding:'luminance',targets:['mp4','desktop'],render:{width:720,height:1280,fps:30,duration:4,quality:'balanced'}});
 let state;for(let attempt=0;attempt<600;attempt++){state=store.read(job.id);if(!['queued','running'].includes(state.status))break;await new Promise(r=>setTimeout(r,500));}
 if(state.status!=='completed')throw new Error(state.error||state.status);
 const outputs=[];for(const kind of ['mp4','desktop']){const {artifact,bytes}=store.artifact(job.id,kind);const file=path.join(root,`${presetId}-diagnostic.${kind==='mp4'?'mp4':'desktop.zip'}`);fs.writeFileSync(file,bytes);if(kind==='mp4'){execFileSync('ffmpeg',['-v','error','-i',file,'-f','null','-']);const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',file],{encoding:'utf8'}));outputs.push({kind,file,bytes:bytes.length,width:probe.streams[0].width,height:probe.streams[0].height,decoded:true});}else{const zip=unzipSync(bytes);for(const name of ['index.html','project.json','runtime.js'])if(!zip[name])throw new Error('package-missing-'+name);outputs.push({kind,file,bytes:bytes.length,files:Object.keys(zip)});}}
 report.renders.push({presetId,status:state.status,commercialReady:state.commercialReady,outputs});fs.writeFileSync(path.join(root,'real-render-report.json'),JSON.stringify(report,null,2));console.log('PASS diagnostic export',presetId);
}
