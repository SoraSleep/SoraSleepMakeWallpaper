import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '../../SoraSleep-Image-Dream/node_modules/playwright/index.mjs';
const root=path.resolve('real-test-output/dreamina-installed-20261016');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage();
 const result=await page.evaluate(async encoded=>{
  const load=async data=>{const image=new Image();image.src='data:image/jpeg;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);return{image,canvas,context,pixels:context.getImageData(0,0,image.width,image.height).data};};
  const a=await load(encoded.a),b=await load(encoded.b);
  if(a.image.width!==b.image.width||a.image.height!==b.image.height)return{sameDimensions:false,a:[a.image.width,a.image.height],b:[b.image.width,b.image.height]};
  const width=a.image.width,height=a.image.height;let changed=0,totalDelta=0,lowerChanged=0,lowerPixels=0;const tiles=[];
  for(let ty=0;ty<8;ty++)for(let tx=0;tx<4;tx++){
   let count=0,different=0;
   for(let y=Math.floor(ty*height/8);y<Math.floor((ty+1)*height/8);y++)for(let x=Math.floor(tx*width/4);x<Math.floor((tx+1)*width/4);x++){
    const i=(y*width+x)*4;const delta=Math.max(...[0,1,2].map(c=>Math.abs(a.pixels[i+c]-b.pixels[i+c])));totalDelta+=delta;count++;if(delta>24){changed++;different++;}if(y>height*.55){lowerPixels++;if(delta>24)lowerChanged++;}
   }tiles.push({x:tx,y:ty,changedFraction:different/count});
  }
  return{sameDimensions:true,width,height,changedFraction:changed/(width*height),meanMaxChannelDelta:totalDelta/(width*height),lowerSceneChangedFraction:lowerChanged/lowerPixels,tiles};
 },{a:fs.readFileSync(path.join(root,'image-a.jpeg')).toString('base64'),b:fs.readFileSync(path.join(root,'image-b.jpeg')).toString('base64')});
 fs.writeFileSync(path.join(root,'pair-quality.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
