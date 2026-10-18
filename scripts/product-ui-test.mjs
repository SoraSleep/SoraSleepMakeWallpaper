import { createServer } from 'node:http';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from '../../SoraSleep-Image-Dream/node_modules/playwright/index.mjs';
import { createWallpaperBridge } from '../wallpaper-bridge.mjs';
const bridge=createWallpaperBridge({dataRoot:mkdtempSync(path.join(tmpdir(),'product-ui-'))});
const server=createServer((req,res)=>bridge(req,res,()=>{try{const uri=req.url.split('?')[0],file=path.join(process.cwd(),'dist',uri==='/'?'index.html':uri);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(readFileSync(file));}catch{res.statusCode=404;res.end();}}));
await new Promise(resolve=>server.listen(17904,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:17904');
 await page.getByRole('button',{name:/Product Center/}).click();
 const values=['Technical review product','SoraSleep QA','Internal QA','ui-review','0.1','Internal technical evaluation only. Not for sale.','Actual rendered video fixture.','Existing demo artwork, rights unreviewed.','cozy,review'];
 const inputs=page.locator('form textarea');for(let i=0;i<values.length;i++)await inputs.nth(i).fill(values[i]);
 await page.getByLabel('File Android',{exact:true}).setInputFiles(path.resolve('real-test-output/difference-lens.mp4'));
 await page.getByLabel('Tạo cover / bố cục / mockup từ ảnh tĩnh đã duyệt',{exact:true}).setInputFiles(path.resolve('real-test-output/difference-lens-cover.jpg'));
 await page.getByText('Đã tạo ảnh listing.',{exact:false}).waitFor();
 await page.getByRole('button',{name:'Lưu bộ sản phẩm chờ duyệt'}).click();
 await page.getByText('Đã lưu Technical review product, revision 1.',{exact:false}).waitFor();
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'Tải ZIP chờ duyệt'}).click();await (await download).saveAs(path.resolve('real-test-output/ui-product-review.zip'));
 await page.screenshot({path:path.resolve('real-test-output/product-center.png'),fullPage:true});
 await page.reload();await page.getByRole('button',{name:/Product Center/}).click();await page.getByRole('heading',{name:/Technical review product/}).waitFor();
 writeFileSync('real-test-output/ui-report.json',JSON.stringify({productForm:true,marketingGeneration:true,save:true,download:true,reloadPersistence:true,deviceApproval:false},null,2));console.log('PASS product UI save/download/reload');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
