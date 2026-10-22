import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL('D:/SoraSleep Main/Apps/ImageDream/node_modules/playwright/index.mjs'));
const out=path.resolve('real-test-output/watermark-fix/ui');fs.mkdirSync(out,{recursive:true});
const entry={id:'a'.repeat(64),width:2560,height:1440,status:'pending',revision:0,notes:'',beforeUrl:'/visual-reviews/fixture/before',afterUrl:'/visual-reviews/fixture/after',afterSha256:'fixture',warnings:['inspect-ai-badge'],regions:[{name:'ai-badge',box:[20,19,119,105],detected:false,reviewRequired:true},{name:'dreamina-logo',box:[1887,1293,647,122],detected:true}]};
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://127.0.0.1:17930/**',async route=>{
  const url=new URL(route.request().url());
  if(/\/(before|after)$/.test(url.pathname))return route.fulfill({contentType:'image/jpeg',body:fs.readFileSync('public/demo/wallpaper.jpg')});
  if(route.request().method()==='POST'&&url.pathname.endsWith(entry.id)){
   const decision=route.request().postDataJSON();assert.equal(decision.inspected,true);assert.equal(decision.inspectedRegionCount,2);entry.status=decision.status;entry.revision++;
  }
  return route.fulfill({contentType:'application/json',body:JSON.stringify(entry)});
 });
 await page.goto('http://127.0.0.1:5173/');
 await page.evaluate(async()=>{
  const React=await import('/node_modules/.vite/deps/react.js'),DOM=await import('/node_modules/.vite/deps/react-dom_client.js'),{VisualReviewButton}=await import('/src/review/VisualReview.tsx');
  const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;z-index:99999;background:#15191c;padding:30px';document.body.append(host);
  (DOM.createRoot??DOM.default.createRoot)(host).render((React.createElement??React.default.createElement)(VisualReviewButton,{route:'/fixture-review',label:'Watermark regression'}));
 });
 await page.getByRole('button',{name:/Watermark regression/}).click();const dialog=page.getByRole('dialog');
 await dialog.getByText(/Có dấu hiệu chưa chắc chắn/).waitFor();
 const approve=dialog.getByRole('button',{name:'Duyệt ảnh này',exact:true});assert.equal(await approve.isDisabled(),true);
 await dialog.getByRole('button',{name:/Nhãn AI góc trên/}).click();assert.equal(await approve.isDisabled(),true);
 await dialog.getByRole('button',{name:/Logo Dreamina góc dưới/}).click();await dialog.getByLabel('Xác nhận đã xem ảnh ở 100 phần trăm').check();
 assert.equal(await approve.isEnabled(),true);await page.screenshot({path:path.join(out,'desktop.png')});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(out,'mobile.png')});
 await approve.click();await dialog.getByText(/Đã duyệt · bản 1/).waitFor();assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,warningVisible:true,uncertainCornerInspectionRequired:true,mobileOverflow:false,errors,usesMockReviewApi:true,newGenerationRequests:0},null,2));
 console.log('Watermark warning UI and explicit two-corner approval: passed');
}finally{await browser.close();}
