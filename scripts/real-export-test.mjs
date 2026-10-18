import { build } from 'vite';
import { createServer } from 'node:http';
import { chromium } from '../../SoraSleep-Image-Dream/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { unzipSync } from 'fflate';
const output=path.resolve('real-test-output');mkdirSync(output,{recursive:true});
await build({configFile:false,build:{outDir:'real-test-output/modules',lib:{entry:{schema:'src/project/projectSchema.ts',video:'src/export/mobileVideoExport.ts',fallback:'src/export/mobileMediaRecorderFallback.ts',package:'src/project/projectFile.ts',bundle:'src/export/mobileDistributionBundle.ts'},formats:['es'],fileName:(_format,name)=>name+'.js'}}});
const server=createServer((req,res)=>{try{if(req.url==='/__qa.html'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Export QA</title>');}const uri=decodeURIComponent(req.url.split('?')[0]);const file=uri.startsWith('/modules/')?path.join(output,uri.slice(1)):path.join(process.cwd(),'public',uri);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':'image/jpeg');res.end(readFileSync(file));}catch{res.statusCode=404;res.end();}});await new Promise(resolve=>server.listen(17903,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'msedge'});
const results=[];
try{
 const page=await browser.newPage({acceptDownloads:true});
 page.on('console',message=>console.log('BROWSER',message.text()));
 page.on('pageerror',error=>console.log('PAGE ERROR',error.message));
 page.setDefaultTimeout(60000);
 await page.goto('http://127.0.0.1:17903/__qa.html');
 for(const preset of ['difference-lens','portal-reveal']){
  const start=performance.now();
  const result=await page.evaluate(async preset=>{
   const {createProject}=await import('/modules/schema.js');
   const {exportMobileVideo}=await import('/modules/video.js');
   const {exportMobileVideoFallback}=await import('/modules/fallback.js');
   const {exportWallpaperPackage}=await import('/modules/package.js');
   const {downloadMobileDistributionBundle}=await import('/modules/bundle.js');
   const load=source=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=source;});
   const [a,b]=await Promise.all([load('/demo/wallpaper.jpg'),load('/demo/wallpaper-variant-pink.png')]);
   const canvas=document.createElement('canvas');canvas.width=a.width;canvas.height=a.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});
   ctx.drawImage(a,0,0);const ap=ctx.getImageData(0,0,a.width,a.height);ctx.drawImage(b,0,0,a.width,a.height);const bp=ctx.getImageData(0,0,a.width,a.height);
   const data=new Uint8ClampedArray(a.width*a.height);for(let i=0;i<data.length;i++){const k=i*4,d=Math.max(...[0,1,2].map(c=>Math.abs(ap.data[k+c]-bp.data[k+c])));data[i]=Math.round(Math.max(0,Math.min(1,(d-12)/32))*255);}
   const asset=(i,source)=>({name:source,source,mimeType:source.endsWith('.png')?'image/png':'image/jpeg',width:i.width,height:i.height,size:1,rights:'verified'});
   const p=createProject({title:'QA '+preset,assets:{imageA:asset(a,'/demo/wallpaper.jpg'),imageB:asset(b,'/demo/wallpaper-variant-pink.png')},lens:{radius:22,feather:18,magnification:115,revealIntensity:100,followSpeed:78}});
   p.preset.id=preset;p.alignment.status='good';p.mobileRender={width:432,height:768,fps:24,quality:'economy'};p.mobileMotion={duration:3,path:'breathe',loop:'repeat'};
   const mask={width:a.width,height:a.height,data};
   const encode=async blob=>{const bytes=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
   console.log('Encoding MP4',preset);
   const mp4=await exportMobileVideo(p,mask);
   console.log('Encoding WebM',preset);
   const webm=await exportMobileVideoFallback(p,mask);
   const desktop=await exportWallpaperPackage(p,mask);
   const mobile=await downloadMobileDistributionBundle(p,mp4.blob);
   const abort=new AbortController();abort.abort();let cancelled=false;
   try{await exportMobileVideo(p,mask,undefined,abort.signal);}catch(e){cancelled=e.name==='AbortError';}
   return {mp4:await encode(mp4.blob),webm:await encode(webm.blob),desktop:await encode(desktop.blob),mobile:await encode(mobile.blob),cancelled};
  },preset);
  for(const kind of ['mp4','webm','desktop','mobile'])writeFileSync(path.join(output,`${preset}.${['desktop','mobile'].includes(kind)?kind+'.zip':kind}`),Buffer.from(result[kind],'base64'));
  const videos=[];
  for(const ext of ['mp4','webm']){
   const file=path.join(output,`${preset}.${ext}`);
   const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
   execFileSync('ffmpeg',['-v','error','-i',file,'-f','null','-'],{stdio:'pipe'});
   const stream=probe.streams.find(s=>s.codec_type==='video');
   if(stream.width!==432||stream.height!==768)throw new Error('Wrong video dimensions');
   videos.push({ext,codec:stream.codec_name,width:stream.width,height:stream.height,duration:probe.format.duration,decoded:true});
  }
  const files=unzipSync(Buffer.from(result.mobile,'base64'));const jpg=files['static-fallback.jpg'];if(jpg[0]!==255||jpg[1]!==216)throw new Error('Fallback is not JPEG');
  const desktop=unzipSync(Buffer.from(result.desktop,'base64'));for(const name of ['index.html','runtime.js','project.json'])if(!desktop[name])throw new Error('Missing desktop '+name);
  const dir=path.join(output,preset);mkdirSync(dir,{recursive:true});for(const [name,bytes]of Object.entries(desktop)){const target=path.join(dir,name);mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,bytes);}
  await page.goto('file:///'+path.join(dir,'index.html').replaceAll('\\','/'));await page.waitForTimeout(600);await page.screenshot({path:path.join(output,preset+'-desktop.png')});
  await page.goto('http://127.0.0.1:17903/__qa.html');
  results.push({preset,videos,cancelled:result.cancelled,fallbackJpeg:true,desktopPackage:true,durationMs:Math.round(performance.now()-start)});
  console.log('PASS',preset);
 }
 const runtime=readFileSync('src/export/pair-runtime.js','utf8');
 for(const preset of ['portal-reveal','difference-lens']){
  const check=await browser.newPage({viewport:{width:640,height:360}});await check.goto('http://127.0.0.1:17903/__qa.html');
  await check.setContent('<style>html,body{margin:0}canvas{width:100vw;height:100vh}</style><canvas></canvas>');
  await check.evaluate(preset=>{
    const image=color=>{const c=document.createElement('canvas');c.width=640;c.height=360;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,640,360);return c.toDataURL();};
    const m=document.createElement('canvas');m.width=640;m.height=360;const mx=m.getContext('2d');mx.fillStyle='white';mx.fillRect(0,0,320,360);
    window.WALLPAPER_CONFIG={preset,canvas:{fit:'cover'},assets:{imageA:image('#ff0000'),imageB:image('#0000ff')},differenceMask:{asset:m.toDataURL()},lens:{radius:20,feather:10,magnification:115,revealIntensity:100},portal:{glow:0,ripple:0}};
  },preset);
  await check.addScriptTag({content:runtime});await check.waitForTimeout(250);
  if(preset==='difference-lens'){await check.mouse.move(320,180);await check.mouse.down();await check.waitForTimeout(900);}
  const pixels=await check.evaluate(()=>{const x=document.querySelector('canvas').getContext('2d');return {left:Array.from(x.getImageData(100,180,1,1).data),center:Array.from(x.getImageData(320,180,1,1).data),right:Array.from(x.getImageData(600,180,1,1).data)};});
  if(preset==='portal-reveal' && !(pixels.center[2]>240&&pixels.right[0]>240&&pixels.left[0]>240))throw new Error('Portal background isolation failed');
  if(preset==='difference-lens' && !(pixels.left[2]>230&&pixels.right[0]>240))throw new Error('Hidden Reveal mask isolation failed');
  await check.screenshot({path:path.join(output,preset+'-pixel-fixture.png')});await check.close();results.push({preset,test:'pixel-isolation',passed:true,pixels});console.log('PASS pixel isolation',preset);
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));writeFileSync(path.join(output,'report.json'),JSON.stringify({createdAt:new Date().toISOString(),results,deviceInstallation:'not_tested',providerGeneration:'not_run'},null,2));}
