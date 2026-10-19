import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {loadRuntime} from './runtime-config.mjs';
const runtime=loadRuntime(),require=createRequire(path.join(runtime.imageDreamRoot,'package.json')),{_electron}=require('playwright');
const executable=path.resolve(process.argv[2]),resources=path.join(path.dirname(executable),'resources'),bundle=path.join(resources,'runtime'),data=fs.mkdtempSync(path.join(os.tmpdir(),'makewallpaper-desktop-'));assert.ok(fs.existsSync(executable));
const manifest=JSON.parse(fs.readFileSync(path.join(resources,'studio/runtime-checksums.json'),'utf8'));for(const entry of manifest){const file=path.resolve(resources,entry.path.replace(/^payload\//,''));assert.ok(!path.relative(resources,file).startsWith('..'));assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),entry.sha256,entry.path);}
console.log(JSON.stringify({phase:'payload-hashes',verifiedFiles:manifest.length}));
const cleanEnv={...process.env,PATH:path.join(bundle,'bin')+';'+path.join(process.env.SystemRoot,'System32'),PYTHONHOME:path.join(bundle,'python'),PYTHONPATH:'',PYTHONNOUSERSITE:'1',U2NET_HOME:path.join(bundle,'models'),NUMBA_CACHE_DIR:path.join(data,'numba'),OMP_NUM_THREADS:'2'};
const python=path.join(bundle,'python/python.exe'),exec=promisify(execFile);
const sourceImage=path.resolve('real-test-output/release-2026-10-18/original.jpg');
const probe=JSON.parse((await exec(path.join(bundle,'bin/ffprobe.exe'),['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',sourceImage],{env:cleanEnv,windowsHide:true})).stdout);assert.equal(probe.streams[0].width,2560);assert.equal(probe.streams[0].height,1440);
await exec(path.join(bundle,'bin/ffmpeg.exe'),['-v','error','-i',sourceImage,'-vf','scale=480:-2','-frames:v','1','-y',path.join(data,'thumbnail.jpg')],{env:cleanEnv,windowsHide:true});assert.ok(fs.statSync(path.join(data,'thumbnail.jpg')).size>1000);
console.log(JSON.stringify({phase:'bundled-ffmpeg-ffprobe',passed:true}));
const pythonTest=await exec(python,['-c','import sys,json;from PIL import Image;from rembg import new_session,remove;s=new_session("birefnet-general-lite",providers=["CPUExecutionProvider"]);im=Image.open(sys.argv[1]);out=remove(im,session=s);assert out.size==im.size;out.save(sys.argv[2]);print(json.dumps({"modelInference":True,"size":out.size,"python":sys.version.split()[0]}))',path.resolve('real-test-output/release-2026-10-18/original.jpg'),path.join(data,'segmented.png')],{env:cleanEnv,windowsHide:true,timeout:180000,maxBuffer:2000000});
const inference=JSON.parse(pythonTest.stdout.trim().split(/\r?\n/).at(-1));
console.log(JSON.stringify({phase:'bundled-model-inference',...inference}));
let electron;const errors=[];try{
 electron=await _electron.launch({executablePath:executable,env:{...cleanEnv,SORASLEEP_DESKTOP_DATA:data},timeout:60000});
 const page=await electron.firstWindow({timeout:60000});page.on('pageerror',error=>errors.push(error.message));await page.locator('.home-preset').first().waitFor();assert.equal(await page.locator('.home-preset').count(),3);
 const api='http://127.0.0.1:17932',cap=await(await fetch(api+'/capabilities')).json();assert.equal(cap.segmentation,true);assert.equal(cap.backendVersion,2);
 assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
 const graphics=await page.evaluate(async()=>{
  const gl=document.createElement('canvas').getContext('webgl2');if(!gl)throw Error('WebGL2 unavailable');const webgl=gl.getParameter(gl.VERSION);gl.getExtension('WEBGL_lose_context')?.loseContext();
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1280;const ctx=canvas.getContext('2d'),chunks=[];let failure;
  const config={codec:'avc1.42001f',width:720,height:1280,framerate:30,bitrate:2000000,avc:{format:'annexb'}};
  if(!(await VideoEncoder.isConfigSupported(config)).supported)throw Error('Mobile H.264 encoder unavailable');
  const encoder=new VideoEncoder({output:chunk=>{const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);chunks.push(Array.from(bytes));},error:error=>failure=error.message});encoder.configure(config);
  for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#b9e472':'#142633';ctx.fillRect(0,0,720,1280);const frame=new VideoFrame(canvas,{timestamp:Math.round(i*1000000/30)});encoder.encode(frame,{keyFrame:i===0});frame.close();}await encoder.flush();encoder.close();if(failure)throw Error(failure);return{webgl,chunks};
 });
 const encoded=path.join(data,'mobile-probe.h264');fs.writeFileSync(encoded,Buffer.concat(graphics.chunks.map(bytes=>Buffer.from(bytes))));
 const mobileProbe=JSON.parse((await exec(path.join(bundle,'bin/ffprobe.exe'),['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height','-of','json',encoded],{env:cleanEnv,windowsHide:true})).stdout);assert.equal(mobileProbe.streams[0].codec_name,'h264');assert.equal(mobileProbe.streams[0].width,720);assert.equal(mobileProbe.streams[0].height,1280);
 const downloadTarget=path.join(data,'desktop-download-probe.txt');
 await electron.evaluate(({session},target)=>{session.defaultSession.once('will-download',(_event,item)=>item.setSavePath(target));},downloadTarget);
 await page.evaluate(()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['SoraSleep desktop export probe']));a.download='desktop-download-probe.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);});
 for(let i=0;i<40&&!fs.existsSync(downloadTarget);i++)await new Promise(resolve=>setTimeout(resolve,100));
 assert.equal(fs.readFileSync(downloadTarget,'utf8'),'SoraSleep desktop export probe');
 await page.locator('.home-preset').filter({hasText:'Landscape Batch'}).click();await page.getByRole('heading',{name:'Tạo ảnh phong cảnh theo batch.',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.querySelector('meta[name="sorasleep-manager"]').content),api);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'real-test-output/landscape-upgrade/desktop-installed-mobile.png',fullPage:true});
 await page.goto('http://127.0.0.1:17880/?studio=plr');await page.waitForLoadState('networkidle');assert.equal(await page.locator('body').innerText().then(t=>t.includes('PLR')),true);
 await page.goto('http://127.0.0.1:17880/');await page.locator('.home-preset').first().click();await page.waitForTimeout(500);assert.equal(await page.locator('body').innerText().then(t=>t.length>100),true);
 await page.setViewportSize({width:1440,height:960});await page.screenshot({path:'real-test-output/landscape-upgrade/desktop-installed.png',fullPage:true});assert.deepEqual(errors,[]);
 const exited=new Promise(resolve=>electron.process().once('exit',resolve));await electron.evaluate(({BrowserWindow})=>{BrowserWindow.getAllWindows()[0].close();});await Promise.race([exited,new Promise((_,reject)=>setTimeout(()=>reject(Error('Desktop did not shut down cleanly')),15000))]);
 let orphan=false;try{await fetch(api+'/capabilities',{signal:AbortSignal.timeout(1000)});orphan=true;}catch{}assert.equal(orphan,false);
 const report={passed:true,executable,isolatedData:true,bundledRuntimeOnly:true,verifiedPayloadFiles:manifest.length,ffmpegThumbnail:true,ffprobeNativeDimensions:true,inference,webgl2:graphics.webgl,mobileH264Encode:true,threePresets:true,downloadWorks:true,mobileNoOverflow:true,nodeIntegrationDisabled:true,cleanShutdown:true,noOrphanBackend:true,newGenerationRequests:0,errors};fs.writeFileSync('real-test-output/landscape-upgrade/desktop-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));electron=null;
}finally{await electron?.close();}
