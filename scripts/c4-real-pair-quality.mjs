import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '../../SoraSleep-Image-Dream/node_modules/playwright/index.mjs';
const root=path.resolve('real-test-output/c4/prompt-pilot');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage();
 const result=await page.evaluate(async encoded=>{
  const load=async data=>{const image=new Image();image.src='data:image/jpeg;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);return{image,canvas,context,pixels:context.getImageData(0,0,image.width,image.height).data};};
  const a=await load(encoded.a),b=await load(encoded.b);
  if(a.image.width!==b.image.width||a.image.height!==b.image.height)return{sameDimensions:false,a:[a.image.width,a.image.height],b:[b.image.width,b.image.height]};
  const width=a.image.width,height=a.image.height;const regions={face:{x:.34,y:.20,w:.36,h:.24},backgroundLeft:{x:0,y:0,w:.16,h:.45},backgroundRight:{x:.86,y:0,w:.14,h:.45},blouse:{x:.43,y:.56,w:.14,h:.24}};const protectedRegions=Object.fromEntries(Object.keys(regions).map(k=>[k,{pixels:0,changed:0,totalDelta:0}]));let changed=0,totalDelta=0,lowerChanged=0,lowerPixels=0;const tiles=[];
  for(let ty=0;ty<8;ty++)for(let tx=0;tx<4;tx++){
   let count=0,different=0;
   for(let y=Math.floor(ty*height/8);y<Math.floor((ty+1)*height/8);y++)for(let x=Math.floor(tx*width/4);x<Math.floor((tx+1)*width/4);x++){
    const i=(y*width+x)*4;const delta=Math.max(...[0,1,2].map(c=>Math.abs(a.pixels[i+c]-b.pixels[i+c])));totalDelta+=delta;count++;for(const [name,r] of Object.entries(regions)){if(x>=r.x*width&&x<(r.x+r.w)*width&&y>=r.y*height&&y<(r.y+r.h)*height){const p=protectedRegions[name];p.pixels++;p.totalDelta+=delta;if(delta>24)p.changed++;}}if(delta>24){changed++;different++;}if(y>height*.55){lowerPixels++;if(delta>24)lowerChanged++;}
   }tiles.push({x:tx,y:ty,changedFraction:different/count});
  }
  return{method:'Native RGB comparison, max channel delta >24; hand-selected rectangular ROIs, not segmentation or identity verification',protectedRegions:Object.fromEntries(Object.entries(protectedRegions).map(([name,r])=>[name,{...regions[name],changedFraction:r.changed/r.pixels,meanMaxChannelDelta:r.totalDelta/r.pixels}])),sameDimensions:true,width,height,changedFraction:changed/(width*height),meanMaxChannelDelta:totalDelta/(width*height),lowerSceneChangedFraction:lowerChanged/lowerPixels,tiles};
 },{a:fs.readFileSync(path.join(root,'image-a.jpeg')).toString('base64'),b:fs.readFileSync(path.join(root,'image-b.jpeg')).toString('base64')});
 result.commercialReady=false;result.transport='overall-reference diagnostic, not masked edit';result.identityVerified=false;result.strictLocalEditAccepted=result.sameDimensions&&Object.values(result.protectedRegions??{}).every(r=>r.changedFraction<=0.02);fs.writeFileSync(path.join(root,'pair-quality.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
