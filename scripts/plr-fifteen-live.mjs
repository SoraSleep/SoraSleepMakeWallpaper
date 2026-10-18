import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const finalPilot=process.env.PLR_FINAL_PILOT==='1';
const root=path.resolve(finalPilot?'real-test-output/plr-final-generation':'real-test-output/plr-11');fs.mkdirSync(root,{recursive:true});
const stateFile=path.join(root,'pilot.json'),state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{};
if(state.completed){console.log('PLR-11 already completed; no generation requests.');process.exit(0);}
const subjects=[
 'one small burnt orange pumpkin with a curled green stem and two autumn leaves',
 'one branch bearing three oak acorns and amber leaves',
 'one circular wreath of red and golden maple leaves with tiny berries',
 'one ivory ceramic teapot with a rust colored lid and a maple sprig',
 'one group of three red capped woodland mushrooms with small moss tufts',
 'one pair of ripe orange persimmons with dark green leaves',
 'one tied bundle of cinnamon sticks with a star anise beside it',
 'one wicker basket holding two apples and yellow autumn leaves',
 'one copper lantern with a warm candle and fallen maple leaf',
 'one small brown fox sitting beside a russet leaf, coherent natural anatomy',
 'one hedgehog beside two chestnuts and a golden leaf, coherent natural anatomy',
 'one yellow rain boot with a small autumn leaf tucked in its rim',
 'one ceramic mug of tea with a cinnamon stick and faint steam',
 'one open book with a dried orange leaf resting on its pages, no readable writing',
 'one harvest pear with a short stem and a few burgundy leaves'
];
const prompts=(finalPilot?['one small sage green watering can filled with white cosmos flowers and fresh spring leaves']:subjects).map(subject=>`Original SFW autumn harvest watercolor clipart of ${subject}, one coherent complete subject centered with clear ivory margins on all four sides, soft hand painted paper texture, warm muted copper, russet and sage palette, isolated clean background for transparent cutout, gentle natural detail, no cast shadow, no people, no text, no letters, no logos.`);
assert.equal(prompts.length,finalPilot?1:15);
const manager='D:/SoraSleep Main/Manager/desktop';
const {createPlrStore}=await import(pathToFileURL(path.join(manager,'plr-store.mjs')));
const {createPlrApi}=await import(pathToFileURL(path.join(manager,'plr-api.mjs')));
const store=createPlrStore({root:path.join(root,'store')}),api=createPlrApi({store,port:0});await api.listen();
const base='http://127.0.0.1:'+api.server.address().port,headers={'Content-Type':'application/json',Origin:'http://127.0.0.1:5173','X-SoraSleep-Bridge':'1'};
const save=()=>fs.writeFileSync(stateFile,JSON.stringify(state,null,2));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function post(route,body){const response=await fetch(base+route,{method:'POST',headers,body:JSON.stringify(body??{})});const result=await response.json();if(!response.ok)throw Error(result.error);return result;}
async function get(route){const response=await fetch(base+route);const result=await response.json();if(!response.ok)throw Error(result.error);return result;}
try{
 if(!state.runId){const input=path.join(root,'fifteen-prompts.txt');fs.writeFileSync(input,prompts.join('\n'));const run=await post('/runs',{requestKey:randomUUID(),title:'Autumn Harvest 15 Clipart',filename:'fifteen-prompts.txt',skipDuplicates:false,rows:prompts.map(prompt=>({prompt})),preset:{productKind:'transparent-clipart',delivery:'zip-parts',model:'high_aes_general_v50',resolution:'2k',aspectRatio:'1:1',imageCount:1,maxCredits:225,maxRegenerations:0,promptPolicy:'verbatim'}});state.runId=run.id;save();console.log('Created durable 15-prompt run',run.id);}
 const before=await get('/runs/'+state.runId+'/workflow');
 if(!before?.config){await post('/runs/'+state.runId+'/workflow/start',{title:'Autumn Harvest 15 Clipart',licenseText:'',maxPartBytes:100000000,trimTransparent:true});}
 else if(before.status!=='completed'&&!before.active){await post('/runs/'+state.runId+'/workflow/resume');}
 let last='',flow;
 const started=Date.now();while(Date.now()-started<2*60*60*1000){try{flow=await get('/runs/'+state.runId+'/workflow');}catch(error){console.log('Read-only status retry:',error.message);await sleep(3000);continue;}
  const progress=flow.progress??{},status=`${flow.status}/${flow.stage} source=${progress.states?.needs_review??0} queued=${progress.states?.queued??0} failed=${progress.states?.failed??0} processed=${progress.processed??0} reserved=${progress.creditsReserved??0}`;
  if(status!==last){console.log(status,flow.error??'');last=status;}
  if(flow.status==='blocked'||flow.status==='needs_review'){fs.writeFileSync(path.join(root,'attention.json'),JSON.stringify(flow,null,2));throw Error('PLR-11 needs review: '+flow.error);}
  if(flow.status==='completed')break;
  await sleep(3000);
 }
 if(flow?.status!=='completed')throw Error('PLR-11 timed out; same durable run can resume');
 const rows=store.executionItems(state.runId);assert.equal(rows.length,prompts.length);assert.ok(rows.every(row=>row.attempts.length===1));assert.deepEqual(rows.map(row=>row.rawPrompt),prompts);
 const reserved=rows.reduce((sum,row)=>sum+row.attempts.reduce((total,attempt)=>total+(attempt.creditsReserved??0),0),0);assert.ok(reserved<=225);
 const packs=(await get('/runs/'+state.runId+'/packages')).packages,pack=packs.find(value=>value.key===flow.packKey);assert.ok(pack&&pack.trimTransparent);
 const folder=path.join(root,'downloads');fs.mkdirSync(folder,{recursive:true});const zipFiles=[];
 for(const file of pack.files){const response=await fetch(base+'/runs/'+state.runId+'/packages/'+pack.key+'/'+file.file);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);fs.writeFileSync(path.join(folder,file.file),bytes);if(file.file.endsWith('.zip'))zipFiles.push(path.join(folder,file.file));}
 const zipAudit=JSON.parse(execFileSync('D:/SoraSleep Main/Runtime/Python/plr/Scripts/python.exe',['-c',`import sys,json,zipfile,hashlib\nparts=[zipfile.ZipFile(p) for p in sys.argv[1:]]\nassert all(p.testzip() is None for p in parts)\nm=json.loads(parts[0].read('manifest.json'))\nassert m['layout']=='alpha-square-trim-v1'\nfor f in m['files']:\n p=[p for p in parts if f['file'] in p.namelist()];assert len(p)==1\n assert hashlib.sha256(p[0].read(f['file'])).hexdigest()==f['sha256']\nprint(json.dumps({'crc':True,'sha256':True,'images':len(m['files']),'parts':len(parts)}))`,...zipFiles],{encoding:'utf8'}));
 const report={passed:true,installedImageDream:true,realPrompts:15,creditsReserved:reserved,oneAttemptPerPrompt:true,flow,pack,zipAudit,rows:rows.map(row=>({ordinal:row.ordinal,itemId:row.id,status:row.status,attempts:row.attempts.length,artifactSha256:row.attempts.at(-1)?.artifact?.sha256}))};fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2));state.completed=true;save();console.log(JSON.stringify({passed:true,selected:flow.selected,excluded:flow.excluded,creditsReserved:reserved,zipAudit}));
}finally{await api.close();}
