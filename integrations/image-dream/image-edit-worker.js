const {parentPort,workerData}=require('node:worker_threads');
const dependency=workerData.dependenciesPackage?require('node:module').createRequire(workerData.dependenciesPackage):require;
const sharp=dependency('sharp');
(async()=>{
 const cv=await dependency('@techstark/opencv-js');
 const {data,info}=await sharp(workerData.file,{limitInputPixels:16000000}).rotate().ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width,height}=info;const r=workerData.rect;
 if(![r.x,r.y,r.width,r.height].every(Number.isInteger)||r.x<0||r.y<0||r.width<1||r.height<1||r.x+r.width>width||r.y+r.height>height||r.width*r.height>width*height*.05)throw new Error('Vùng chỉnh phải nằm trong ảnh và không vượt 5% diện tích.');
 const rgb=new Uint8Array(width*height*3),mask=new Uint8Array(width*height);
 for(let from=0,to=0;from<data.length;from+=4,to+=3){rgb[to]=data[from];rgb[to+1]=data[from+1];rgb[to+2]=data[from+2];}
 if(workerData.maskPng){
  const decoded=await sharp(Buffer.from(workerData.maskPng,'base64'),{limitInputPixels:16000000}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(decoded.info.width!==width||decoded.info.height!==height)throw Error('Mask phải cùng kích thước ảnh.');
  let count=0;for(let i=0;i<width*height;i++){const pixel=i*4;if(decoded.data[pixel+3]>127&&(decoded.data[pixel]+decoded.data[pixel+1]+decoded.data[pixel+2])>382){mask[i]=255;count++;}}
  if(!count||count>width*height*.05)throw Error('Mask phải có nội dung và không quá 5% diện tích.');
 }else for(let y=r.y;y<r.y+r.height;y++)mask.fill(255,y*width+r.x,y*width+r.x+r.width);
 let maskedPixels=0,minX=width,minY=height,maxX=-1,maxY=-1;for(let i=0;i<mask.length;i++)if(mask[i]){const x=i%width,y=Math.floor(i/width);maskedPixels++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 const maskBounds={x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1};
 let src,m,dst;
 try{
  src=cv.matFromArray(height,width,cv.CV_8UC3,rgb);m=cv.matFromArray(height,width,cv.CV_8UC1,mask);dst=new cv.Mat();
  const radius=Number.isFinite(workerData.radius)?Math.max(1,Math.min(7,workerData.radius)):3;
  const method=workerData.method==='telea'?'telea':'ns';
  cv.inpaint(src,m,dst,radius,method==='ns'?cv.INPAINT_NS:cv.INPAINT_TELEA);
  for(let i=0;i<width*height;i++)if(mask[i])for(let c=0;c<3;c++)data[i*4+c]=dst.data[i*3+c];
  const png=await sharp(data,{raw:{width,height,channels:4}}).png().toBuffer();
  parentPort.postMessage({ok:true,png,width,height,method,radius,maskedPixels,maskBounds});
 }finally{src?.delete();m?.delete();dst?.delete();}
})().catch(e=>parentPort.postMessage({ok:false,error:e.message}));
