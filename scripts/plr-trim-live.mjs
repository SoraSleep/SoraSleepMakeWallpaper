import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const root=path.resolve('real-test-output/plr-09');
const output=path.resolve('real-test-output/plr-10');
fs.mkdirSync(output,{recursive:true});
const pilot=JSON.parse(fs.readFileSync(path.join(root,'pilot.json')));
const prior=JSON.parse(fs.readFileSync(path.join(root,'report.json')));
assert.equal(pilot.completed,true);
const manager='D:/SoraSleep Main/Manager/desktop';
const {createPlrStore}=await import(pathToFileURL(path.join(manager,'plr-store.mjs')));
const {createPlrApi}=await import(pathToFileURL(path.join(manager,'plr-api.mjs')));
const store=createPlrStore({root:path.join(root,'store')});
const api=createPlrApi({store,port:0});
await api.listen();
const base='http://127.0.0.1:'+api.server.address().port;
try{
 const before=store.executionItems(pilot.runId).map(row=>({attempts:row.attempts.length,source:row.attempts.at(-1)?.artifact?.sha256}));
 const quality=JSON.parse(fs.readFileSync(path.join(root,'store',pilot.runId,'quality.json')));
 const selection=JSON.parse(fs.readFileSync(path.join(root,'store',pilot.runId,'selection.json')));
 const response=await fetch(base+'/runs/'+pilot.runId+'/package',{method:'POST',headers:{Origin:'http://127.0.0.1:5173','X-SoraSleep-Bridge':'1','Content-Type':'application/json'},body:JSON.stringify({title:'Spring Garden Trimmed Clipart',fingerprint:quality.fingerprint,selectionRevision:selection.revision,maxPartBytes:10000000,trimTransparent:true})});
 const pack=await response.json();if(!response.ok)throw Error(pack.error);
 assert.equal(pack.trimTransparent,true);assert.equal(pack.totalImages,10);
 const downloads=path.join(output,'downloads');fs.mkdirSync(downloads,{recursive:true});
 for(const file of pack.files){const r=await fetch(base+'/runs/'+pilot.runId+'/packages/'+pack.key+'/'+file.file);assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);fs.writeFileSync(path.join(downloads,file.file),bytes);}
 const zipFiles=pack.files.filter(file=>file.file.endsWith('.zip')).map(file=>path.join(downloads,file.file));
 const audit=JSON.parse(execFileSync('D:/SoraSleep Main/Runtime/Python/plr/Scripts/python.exe',['-c',`import sys,zipfile,json,hashlib,io\nfrom PIL import Image\nparts=[zipfile.ZipFile(p) for p in sys.argv[1:]]\nassert all(p.testzip() is None for p in parts)\nmanifest=json.loads(parts[0].read('manifest.json'))\nassert manifest['layout']=='alpha-square-trim-v1'\nratios=[]\nfor file in manifest['files']:\n hits=[p for p in parts if file['file'] in p.namelist()]\n assert len(hits)==1\n data=hits[0].read(file['file'])\n assert hashlib.sha256(data).hexdigest()==file['sha256']\n image=Image.open(io.BytesIO(data)); image.load()\n assert image.mode=='RGBA' and image.width==image.height==file['width']\n bbox=image.getchannel('A').getbbox();ratios.append(round(max(bbox[2]-bbox[0],bbox[3]-bbox[1])/image.width,3))\nassert len(ratios)==10\nprint(json.dumps({'crc':True,'hashes':True,'images':len(ratios),'occupancyMin':min(ratios),'occupancyMax':max(ratios),'ratios':ratios}))`,...zipFiles],{encoding:'utf8'}));
 const after=store.executionItems(pilot.runId).map(row=>({attempts:row.attempts.length,source:row.attempts.at(-1)?.artifact?.sha256}));assert.deepEqual(after,before);
 const report={passed:true,realSourceImages:10,newGenerationRequests:0,attemptsUnchanged:true,sourceHashesUnchanged:true,priorPackKey:prior.pack.key,trimmedPack:pack,zipAudit:audit,qualityFingerprint:quality.fingerprint};
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:true,images:audit.images,occupancy:[audit.occupancyMin,audit.occupancyMax],zipParts:zipFiles.length,newGenerationRequests:0}));
}finally{await api.close();}
