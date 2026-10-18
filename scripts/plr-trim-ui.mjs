import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {chromium} from '../../SoraSleep-Image-Dream/node_modules/playwright/index.mjs';

const root=path.resolve('real-test-output/plr-09');
const output=path.resolve('real-test-output/plr-10');
const runId=JSON.parse(fs.readFileSync(path.join(root,'pilot.json'))).runId;
const manager='D:/SoraSleep Main/Manager/desktop';
const {createPlrStore}=await import(pathToFileURL(path.join(manager,'plr-store.mjs')));
const {createPlrApi}=await import(pathToFileURL(path.join(manager,'plr-api.mjs')));
const api=createPlrApi({store:createPlrStore({root:path.join(root,'store')}),port:0});await api.listen();
const base='http://127.0.0.1:'+api.server.address().port;
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],posts=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('http://127.0.0.1:17930/**',async route=>{const request=route.request();if(request.method()==='POST')posts.push(new URL(request.url()).pathname);try{const response=await route.fetch({url:request.url().replace('http://127.0.0.1:17930',base),timeout:180000});await route.fulfill({response});}catch{await route.abort().catch(()=>{});}});
 await page.goto('http://127.0.0.1:5173/?studio=plr',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Kiểm tra Manager',exact:true}).click();
 await page.getByLabel('Open PLR run '+runId,{exact:true}).click();
 await page.getByRole('button',{name:'2 · Duyệt & xuất gói',exact:true}).click();
 await page.getByRole('button',{name:'Phân tích chất lượng collection',exact:true}).click();
 await page.getByLabel('PLR trim transparent margins',{exact:true}).waitFor({timeout:30000});
 await page.getByLabel('PLR trim transparent margins',{exact:true}).check();
 await page.getByLabel('PLR package title',{exact:true}).fill('Spring Garden Trimmed Clipart');
 await page.getByRole('button',{name:'Tạo ZIP collection',exact:true}).click();
 await page.getByText('đã cắt lề',{exact:false}).first().waitFor({timeout:30000});
 await page.getByLabel('PLR package export',{exact:true}).screenshot({path:path.join(output,'studio.png')});
 assert.deepEqual(errors,[]);
 assert.equal(posts.filter(p=>p.endsWith('/package')).length,1);
 const report={passed:true,posts,errors,trimCheckbox:true,packVisible:true};fs.writeFileSync(path.join(output,'ui-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{await browser?.close();await api.close();}
