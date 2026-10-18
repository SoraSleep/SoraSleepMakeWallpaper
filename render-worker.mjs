import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync,mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
const source=path.dirname(fileURLToPath(import.meta.url));let modulesPromise;
async function modules(root){
 if(!modulesPromise)modulesPromise=build({root:source,configFile:false,logLevel:'error',build:{outDir:root,emptyOutDir:true,lib:{entry:{schema:path.join(source,'src/project/projectSchema.ts'),video:path.join(source,'src/export/mobileVideoExport.ts'),package:path.join(source,'src/project/projectFile.ts'),landscape:path.join(source,'src/landscape/export.ts')},formats:['es'],fileName:(_format,name)=>name+'.js'}}}).then(()=>root).catch(error=>{modulesPromise=null;throw error;});
 return modulesPromise;
}
export async function renderWallpaperJob(input,{cacheRoot,onProgress=()=>{},signal}={}){
 const runtimeRoot=await modules(path.resolve(cacheRoot));
 const requireDream=createRequire(path.resolve(process.env.SORASLEEP_IMAGE_DREAM_SOURCE||path.join(source,'../SoraSleep-Image-Dream'),'package.json'));
 const {chromium}=requireDream('playwright');
 const server=createServer((req,res)=>{try{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><meta charset="utf-8"><title>Wallpaper render worker</title>');}
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);const target=path.resolve(runtimeRoot,relative);
  if(!target.startsWith(runtimeRoot+path.sep)||!relative.endsWith('.js')){res.statusCode=404;return res.end();}
  res.setHeader('Content-Type','text/javascript');res.end(readFileSync(target));
 }catch{res.statusCode=404;res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:process.env.SORASLEEP_RENDER_BROWSER||'msedge'});
  const abort=()=>void browser.close();signal?.addEventListener('abort',abort,{once:true});
  try{
   if(signal?.aborted)throw new Error('render_cancelled');
   const page=await browser.newPage();await page.exposeFunction('reportProgress',onProgress);await page.goto(`http://127.0.0.1:${server.address().port}/`);
   return await page.evaluate(async ({input,modulePaths})=>{
    if(input.workflowType==='landscape'){
      const {exportLandscapeVideo,exportLandscapeDesktop}=await import(modulePaths.landscape);const a=input.assets.imageA;
      const project={schemaVersion:1,workflowType:'landscape',title:input.title||'Spring Sakura',image:{name:a.relativePath,source:`data:${a.mimeType};base64,${a.base64}`,width:a.width,height:a.height,mimeType:a.mimeType},settings:input.landscape,reviewedRegions:input.regionReview,commercialReady:false};const results=[];
      for(const target of input.targets){const result=target==='mp4'?await exportLandscapeVideo(project,input.render,fraction=>window.reportProgress({target,fraction})):await exportLandscapeDesktop(project);const bytes=new Uint8Array(await result.blob.arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));results.push({kind:target,base64:btoa(text),mimeType:result.blob.type});}return results;
    }
    const {createProject}=await import(modulePaths.schema);const {exportMobileVideo}=await import(modulePaths.video);const {exportWallpaperPackage}=await import(modulePaths.package);
    const load=source=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('asset_decode_failed'));image.src=source;});
    const roles={};for(const role of ['imageA','imageB','differenceMask']){const asset=input.assets[role];const uri=`data:image/png;base64,${asset.base64}`;const image=await load(uri);if(image.width!==asset.width||image.height!==asset.height)throw new Error('decoded_dimensions_mismatch');roles[role]={asset,image,uri};}
    const {imageA:a,imageB:b,differenceMask:m}=roles;
    if(a.image.width!==b.image.width||a.image.height!==b.image.height||m.image.width!==a.image.width||m.image.height!==a.image.height)throw new Error('pair_dimensions_mismatch');
    const canvas=document.createElement('canvas');canvas.width=m.image.width;canvas.height=m.image.height;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(m.image,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
    const maskData=new Uint8ClampedArray(canvas.width*canvas.height);for(let i=0;i<maskData.length;i++)maskData[i]=input.maskEncoding==='alpha'?pixels[i*4+3]:Math.round(pixels[i*4]*pixels[i*4+3]/255);
    if(!maskData.some(value=>value>0))throw new Error('empty_difference_mask');
    const asset=entry=>({name:entry.asset.relativePath,source:entry.uri,mimeType:'image/png',width:entry.image.width,height:entry.image.height,size:entry.asset.bytes,rights:'unreviewed'});
    const project=createProject({title:input.title||'Wallpaper export',assets:{imageA:asset(a),imageB:asset(b)},lens:{radius:22,feather:18,magnification:115,revealIntensity:100,followSpeed:78}});
    project.preset.id=input.presetId;project.alignment.status='good';project.mobileRender={width:input.render.width,height:input.render.height,fps:input.render.fps,quality:input.render.quality};project.mobileMotion={duration:input.render.duration,path:'breathe',loop:'repeat'};
    const mask={width:canvas.width,height:canvas.height,data:maskData};const results=[];
    const encode=async blob=>{const bytes=new Uint8Array(await blob.arrayBuffer());let value='';for(let i=0;i<bytes.length;i+=8192)value+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(value);};
    for(const target of input.targets){
     const result=target==='mp4'?await exportMobileVideo(project,mask,progress=>window.reportProgress({target,fraction:progress})):await exportWallpaperPackage(project,mask);
     results.push({kind:target,base64:await encode(result.blob),mimeType:target==='mp4'?'video/mp4':'application/zip'});
    }
    return results;
   },{input,modulePaths:{schema:'/schema.js',video:'/video.js',package:'/package.js',landscape:'/landscape.js'}});
  }finally{signal?.removeEventListener('abort',abort);}
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
