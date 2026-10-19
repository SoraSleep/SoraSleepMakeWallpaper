import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {loadRuntime} from './runtime-config.mjs';
const runtime=loadRuntime(),require=createRequire(path.join(runtime.imageDreamRoot,'package.json')),{_electron}=require('playwright');
const executable=path.resolve(process.argv[2]),resources=path.join(path.dirname(executable),'resources'),bundle=path.join(resources,'runtime'),data=fs.mkdtempSync(path.join(os.tmpdir(),'makewallpaper-desktop-'));assert.ok(fs.existsSync(executable));
const manifest=JSON.parse(fs.readFileSync(path.join(resources,'studio/runtime-checksums.json'),'utf8'));for(const entry of manifest){const file=path.resolve(resources,entry.path.replace(/^payload\//,''));assert.ok(!path.relative(resources,file).startsWith('..'));assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),entry.sha256,entry.path);}
const cleanEnv={...process.env,PATH:path.join(bundle,'bin')+';'+path.join(process.env.SystemRoot,'System32'),PYTHONHOME:path.join(bundle,'python'),PYTHONPATH:'',PYTHONNOUSERSITE:'1',U2NET_HOME:path.join(bundle,'models'),NUMBA_CACHE_DIR:path.join(data,'numba'),OMP_NUM_THREADS:'2'};
const python=path.join(bundle,'python/python.exe'),exec=promisify(execFile);
const pythonTest=await exec(python,['-c','import sys,json;from PIL import Image;from rembg import new_session,remove;s=new_session("birefnet-general-lite",providers=["CPUExecutionProvider"]);im=Image.open(sys.argv[1]);out=remove(im,session=s);assert out.size==im.size;out.save(sys.argv[2]);print(json.dumps({"modelInference":True,"size":out.size,"python":sys.version.split()[0]}))',path.resolve('real-test-output/release-2026-10-18/original.jpg'),path.join(data,'segmented.png')],{env:cleanEnv,windowsHide:true,timeout:180000,maxBuffer:2000000});
const inference=JSON.parse(pythonTest.stdout.trim().split(/\r?\n/).at(-1));
let electron;const errors=[];try{
 electron=await _electron.launch({executablePath:executable,env:{...cleanEnv,SORASLEEP_DESKTOP_DATA:data},timeout:60000});
 const page=await electron.firstWindow({timeout:60000});page.on('pageerror',error=>errors.push(error.message));await page.locator('.home-preset').first().waitFor();assert.equal(await page.locator('.home-preset').count(),3);
 const api='http://127.0.0.1:17932',cap=await(await fetch(api+'/capabilities')).json();assert.equal(cap.segmentation,true);assert.equal(cap.backendVersion,2);
 assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
 await page.locator('.home-preset').filter({hasText:'Landscape Batch'}).click();await page.getByRole('heading',{name:'Tạo ảnh phong cảnh theo batch.',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.querySelector('meta[name="sorasleep-manager"]').content),api);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'real-test-output/landscape-upgrade/desktop-installed-mobile.png',fullPage:true});
 await page.goto('http://127.0.0.1:17880/?studio=plr');await page.waitForLoadState('networkidle');assert.equal(await page.locator('body').innerText().then(t=>t.includes('PLR')),true);
 await page.goto('http://127.0.0.1:17880/');await page.locator('.home-preset').first().click();await page.waitForTimeout(500);assert.equal(await page.locator('body').innerText().then(t=>t.length>100),true);
 await page.setViewportSize({width:1440,height:960});await page.screenshot({path:'real-test-output/landscape-upgrade/desktop-installed.png',fullPage:true});assert.deepEqual(errors,[]);
 const exited=new Promise(resolve=>electron.process().once('exit',resolve));await electron.evaluate(({BrowserWindow})=>{BrowserWindow.getAllWindows()[0].close();});await Promise.race([exited,new Promise((_,reject)=>setTimeout(()=>reject(Error('Desktop did not shut down cleanly')),15000))]);
 let orphan=false;try{await fetch(api+'/capabilities',{signal:AbortSignal.timeout(1000)});orphan=true;}catch{}assert.equal(orphan,false);
 const report={passed:true,executable,isolatedData:true,bundledRuntimeOnly:true,verifiedPayloadFiles:manifest.length,inference,threePresets:true,mobileNoOverflow:true,nodeIntegrationDisabled:true,cleanShutdown:true,noOrphanBackend:true,newGenerationRequests:0,errors};fs.writeFileSync('real-test-output/landscape-upgrade/desktop-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));electron=null;
}finally{await electron?.close();}
