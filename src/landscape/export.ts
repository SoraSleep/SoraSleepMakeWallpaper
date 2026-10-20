import {ArrayBufferTarget,Muxer} from 'mp4-muxer';
import {zipSync,strToU8} from 'fflate';
import {createLandscapeRenderer} from './renderer';
import {parseLandscapeProject,type LandscapeProject} from './schema';
import runtime from './runtime.js?raw';
import {cleanOutputAsset,assertAssetReviews} from '../export/watermarkCleanup';
export {createLandscapeRenderer};
export {defaultLandscapeSettings,parseLandscapeProject} from './schema';
declare const VideoEncoder:any;declare const VideoFrame:any;
export async function loadLandscapeImage(project:LandscapeProject){parseLandscapeProject(project);const image=new Image();image.src=project.image.source;await image.decode();if(image.naturalWidth!==project.image.width||image.naturalHeight!==project.image.height)throw new Error('landscape-decoded-dimensions-mismatch');return image;}
export async function exportLandscapeVideo(project:LandscapeProject,render:{width:number;height:number;fps:number},onProgress?:(fraction:number)=>void,signal?:AbortSignal){
 project={...project,image:await cleanOutputAsset(project.image)};
 const image=await loadLandscapeImage(project),{width,height,fps}=render;
 if(!project.reviewedRegions)throw new Error('review-landscape-regions-first');
 if(![width,height,fps].every(Number.isInteger)||width<128||height<128||width>1920||height>1920||width*height>1920*1080||width%2||height%2||![24,30].includes(fps)||Math.abs(width/height-image.width/image.height)>.01)throw new Error('invalid-landscape-render');
 if(typeof VideoEncoder==='undefined'||typeof VideoFrame==='undefined')throw new Error('WebCodecs H.264 export unavailable');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:false})!,draw=createLandscapeRenderer(image,project.settings,width,height);
 const config={codec:'avc1.420028',width,height,framerate:fps,bitrate:Math.min(14000000,Math.max(3000000,width*height*6))};if(!(await VideoEncoder.isConfigSupported(config)).supported){draw.dispose();throw new Error('H.264 configuration unsupported');}
 const target=new ArrayBufferTarget(),muxer=new Muxer({target,video:{codec:'avc',width,height,frameRate:fps},fastStart:'in-memory'});let failure:Error|null=null;
 const encoder=new VideoEncoder({output:(chunk:any,meta:any)=>muxer.addVideoChunk(chunk,meta),error:(error:Error)=>{failure=error;}});
 try{encoder.configure(config);const count=Math.round(project.settings.duration*fps);for(let i=0;i<count;i++){
   if(signal?.aborted)throw new DOMException('Export cancelled','AbortError');if(failure)throw failure;if(encoder.encodeQueueSize>=fps)await encoder.flush();
   draw.draw(ctx,i/fps);const frame=new VideoFrame(canvas,{timestamp:Math.round(i*1000000/fps),duration:Math.round(1000000/fps)});try{encoder.encode(frame,{keyFrame:i%(fps*2)===0});}finally{frame.close();}onProgress?.((i+1)/count);
  }await encoder.flush();if(failure)throw failure;muxer.finalize();await assertAssetReviews([project.image]);return{blob:new Blob([target.buffer],{type:'video/mp4'}),width,height,fps};
 }finally{encoder.close();draw.dispose();canvas.width=canvas.height=1;}
}
export async function exportLandscapeDesktop(project:LandscapeProject){
 project={...project,image:await cleanOutputAsset(project.image)};
 const image=await loadLandscapeImage(project);if(!project.reviewedRegions)throw new Error('review-landscape-regions-first');
 const extension=project.image.mimeType==='image/jpeg'?'jpg':project.image.mimeType==='image/webp'?'webp':'png',assetPath='assets/image-a.'+extension;
 const bytes=Uint8Array.from(atob(project.image.source.split(',')[1]),c=>c.charCodeAt(0));const title=project.title.replace(/[<>&"']/g,'');
 const config={image:assetPath,settings:project.settings};const script=JSON.stringify(config).replace(/</g,'\\u003c');
 const canvas=document.createElement('canvas');canvas.width=360;canvas.height=Math.round(360*image.height/image.width);const draw=createLandscapeRenderer(image,project.settings,canvas.width,canvas.height);draw.draw(canvas.getContext('2d')!,0);const preview=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('poster-failed')),'image/jpeg',.85));draw.dispose();
 const files:Record<string,Uint8Array>={
  'index.html':strToU8(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>html,body,canvas{margin:0;width:100%;height:100%;overflow:hidden;background:#101218}canvas{display:block}</style><canvas></canvas><script>window.LANDSCAPE_CONFIG=${script};</script><script src="runtime.js"></script>`),
  'runtime.js':strToU8(`const createLandscapeRenderer=${createLandscapeRenderer.toString()};\n${runtime}`),
  'project.json':strToU8(JSON.stringify({title:project.title,type:'web',file:'index.html',preview:'preview.jpg',general:{properties:{reducedmotion:{text:'Reduced motion',type:'bool',value:project.settings.reducedMotion}}}},null,2)),
  'landscape.json':strToU8(JSON.stringify({...project,image:{...project.image,source:assetPath}},null,2)),
  'QA.json':strToU8(JSON.stringify({commercialReady:false,deviceTested:false,rightsStatus:'unreviewed',regionReview:project.reviewedRegions,sourceWatermark:'not-verified'})),
  'INSTALL.txt':strToU8('Windows: extract and import index.html as a Web wallpaper in Wallpaper Engine. Requires host testing. Android: use the separate MP4 in a compatible video wallpaper app. iPhone: MP4 is not a Live Photo. Artwork rights and visible markings require review. Offline files only.'),
  'preview.jpg':new Uint8Array(await preview.arrayBuffer()),[assetPath]:bytes,
 };
 const hashes:Record<string,string>={};for(const [name,data] of Object.entries(files)){hashes[name]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(data).buffer))).map(v=>v.toString(16).padStart(2,'0')).join('');}files['sha256.json']=strToU8(JSON.stringify(hashes,null,2));
 await assertAssetReviews([project.image]);return{blob:new Blob([new Uint8Array(zipSync(files))],{type:'application/zip'})};
}
