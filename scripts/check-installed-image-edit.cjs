const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const{Worker}=require('node:worker_threads');
const installed='D:/SoraSleep Main/Programs/ImageDream/resources/app.asar.unpacked';
const sharp=require(installed+'/node_modules/sharp');
const root=path.resolve('real-test-output/image-edit-check');fs.mkdirSync(root,{recursive:true});
async function run(file,rect){return new Promise((resolve,reject)=>{const w=new Worker(installed+'/lib/image-edit-worker.js',{workerData:{file,rect}});const timer=setTimeout(()=>{w.terminate();reject(new Error('worker-timeout'));},60000);w.on('message',r=>{clearTimeout(timer);w.terminate();resolve(r);});w.on('error',e=>{clearTimeout(timer);reject(e);});});}
(async()=>{
 const width=320,height=240,rect={x:30,y:40,width:30,height:20};const data=Buffer.alloc(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;data[i]=40+Math.floor(x/3);data[i+1]=80+Math.floor(y/3);data[i+2]=130;data[i+3]=255;if(x>=rect.x&&x<rect.x+rect.width&&y>=rect.y&&y<rect.y+rect.height)data[i]=data[i+1]=data[i+2]=255;}
 const file=path.join(root,'synthetic-source.png');await sharp(data,{raw:{width,height,channels:4}}).png().toFile(file);
 const result=await run(file,rect);assert.equal(result.ok,true,result.error);assert.equal(result.width,width);assert.equal(result.height,height);
 const png=Buffer.from(result.png);fs.writeFileSync(path.join(root,'synthetic-edited.png'),png);const output=await sharp(png).ensureAlpha().raw().toBuffer();let insideChanged=0,outsideChanged=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;const changed=!data.subarray(i,i+4).equals(output.subarray(i,i+4));if(x>=rect.x&&x<rect.x+rect.width&&y>=rect.y&&y<rect.y+rect.height){if(changed)insideChanged++;}else if(changed)outsideChanged++;}
 assert.ok(insideChanged>0);assert.equal(outsideChanged,0);const oversized=await run(file,{x:0,y:0,width:width,height:height});assert.equal(oversized.ok,false);
 const report={engine:'installed opencv-telea worker',syntheticTest:true,creditsSpent:0,dimensionsPreserved:true,insideChanged,outsideChanged,oversizedRegionRejected:true,realWatermarkQuality:'not tested; no real user image edited',integration:'manual preview/save; generated task output remains original unless edited asset is selected'};fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
