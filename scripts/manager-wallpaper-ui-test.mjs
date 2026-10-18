import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFileSync,unlinkSync,mkdirSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '../../SoraSleep-Image-Dream/node_modules/playwright/index.mjs';
const root=process.env.SORASLEEP_MANAGER_SOURCE||'D:/SoraSleep Main/Manager';
const requireManager=createRequire(path.join(root,'package.json'));const {createServer}=await import(pathToFileURL(requireManager.resolve('vite')).href);
const file=path.join(root,'wallpaper-ui-qa.html');const out=path.resolve('real-test-output/manager-wallpaper');mkdirSync(out,{recursive:true});
writeFileSync(file,'<!doctype html><html lang="vi"><meta charset="UTF-8"><title>Manager Wallpaper QA</title><div id="root" style="max-width:1400px;margin:32px auto;padding:24px"></div><script type="module">import React from "react";import{createRoot}from"react-dom/client";import{WallpaperCenter}from"/src/WallpaperCenter.tsx";import"/src/styles.css";createRoot(document.getElementById("root")).render(React.createElement(WallpaperCenter));</script></html>');
const server=await createServer({root,server:{host:'127.0.0.1',port:17912,strictPort:true}});await server.listen();const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__submissions=[];let batches=[];
  window.soraManager={wallpaperState:async()=>({batches,busy:false}),wallpaperConnections:async()=>({imageDreamUrl:'http://127.0.0.1:3000',wallpaperUrl:'http://127.0.0.1:5173',imageDreamConnected:true,wallpaperConnected:true,models:{free_models:[{id:'high_aes_general_v50',name:'Seedream · fixture',allowed_ratios:['9:16','16:9'],allowed_resolutions:['2k','4k']}]},accounts:[{id:'fixture',name:'Tài khoản kiểm thử',credits:10,hasCookie:true}]}),startWallpaper:async input=>{window.__submissions.push(input);const batch={id:'fixture-batch',createdAt:new Date().toISOString(),status:'blocked',settings:input,error:'needs_user_action: Cần đăng nhập Dreamina',items:input.prompts.split('\n').map((prompt,index)=>({id:'item'+index,index,prompt,status:'queued',stage:'waiting',assets:[]}))};batches=[batch];return batch;},resumeWallpaper:async()=>{},controlWallpaper:async()=>{},open:async()=>{}};
 });
 await page.goto('http://127.0.0.1:17912/wallpaper-ui-qa.html');
 assert.equal(await page.locator('option[value="ark"]').count(),0);
 await page.getByText('Dreamina · tài khoản free trong Image Dream.',{exact:false}).waitFor();
 const execute=page.getByRole('button',{name:/Thực thi.*prompt/});await assert.doesNotReject(()=>execute.waitFor());assert.equal(await execute.isEnabled(),false);
 await page.getByLabel('Thay đổi mong muốn ở ảnh B').fill('Đổi hoa trắng thành màu hồng, giữ nguyên cảnh vật.');
 await page.locator('#wallpaper-prompts').fill('SFW moonlit garden, soft illustration\nSFW quiet tea house beside a lake');
 await page.getByRole('checkbox').check();assert.equal(await execute.isEnabled(),true);
 await execute.click();await page.getByRole('alert').filter({hasText:'Cần đăng nhập Dreamina'}).waitFor();
 const submitted=await page.evaluate(()=>window.__submissions);assert.equal(submitted.length,1);assert.equal(submitted[0].prompts.split('\n').length,2);assert.equal(submitted[0].presetId,'portal-reveal');
 await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
 await page.getByRole('button',{name:/01 Hidden Reveal/}).click();assert.equal(await page.getByRole('checkbox').isChecked(),false);
 await page.getByLabel('Workflow',{exact:true}).selectOption('landscape');assert.equal(await page.getByLabel('Thay đổi mong muốn ở ảnh B').count(),0);assert.equal(await page.getByRole('button',{name:/01 Hidden Reveal/}).count(),0);await page.getByRole('checkbox').check();assert.equal(await execute.isEnabled(),true);await execute.click();let all=await page.evaluate(()=>window.__submissions);assert.equal(all.at(-1).workflowType,'landscape');assert.equal(all.at(-1).presetId,null);assert.equal(all.at(-1).variantChange,'');
 await page.getByLabel('Workflow',{exact:true}).selectOption('stock');assert.equal(await page.getByRole('checkbox').isChecked(),false);await page.getByRole('checkbox').check();await execute.click();all=await page.evaluate(()=>window.__submissions);assert.equal(all.at(-1).workflowType,'stock');
 await page.getByLabel('Workflow',{exact:true}).selectOption('character-wardrobe');await page.getByLabel('Thay đổi mong muốn ở ảnh B').waitFor();assert.equal(await execute.isEnabled(),false);
 await page.setViewportSize({width:1050,height:900});await page.screenshot({path:path.join(out,'compact.png'),fullPage:true});assert.deepEqual(errors,[]);
 writeFileSync(path.join(out,'ui-report.json'),JSON.stringify({passed:true,testMode:'injected IPC fixture; no provider generation',checks:['execute disabled before review','two prompts submitted once','blocked auth displayed','preset switch resets review','no browser errors']},null,2));console.log('PASS Manager wallpaper UI: review gate, batch submission, blocked state and preset switching');
}finally{await browser.close();await server.close();unlinkSync(file);}
