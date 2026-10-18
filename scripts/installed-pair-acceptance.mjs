import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createProfileStudioClient} from 'file:///D:/SoraSleep%20Main/Manager/desktop/profile-studio-client.mjs';

const root=path.resolve('real-test-output/dreamina-installed-20261016');
const stateFile=path.join(root,'image-b-test.json');
const base='http://127.0.0.1:17897';
const call=async(route,body)=>{const response=await fetch(base+route,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(180000)});const result=await response.json();if(!response.ok)throw new Error(result.error||`http-${response.status}`);return result;};
const save=state=>fs.writeFileSync(stateFile,JSON.stringify(state,null,2));
const client=createProfileStudioClient(call,base);
let state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile)):{};
if(process.argv.includes('--submit')){
 if(state.token)throw new Error('Existing submission: use --poll. Never repeat automatically.');
 const profiles=await call('/api/profiles/status');
 if(profiles.openAccountId||profiles.busy||profiles.batchRunning)throw new Error('Profile open or busy. Close its browser before testing.');
 const bytes=fs.readFileSync(path.join(root,'image-a.jpeg'));
 const upload=await call('/api/upload-reference',{imageBase64:bytes.toString('base64'),filename:'image-a.jpeg'});
 state.settings={model:'high_aes_general_v43',aspectRatio:'9:16',resolution:'2k',referenceImages:[{filePath:upload.filePath,filename:upload.filename,mode:'overall'}]};
 state.prompt='Edit the supplied reference illustration. Preserve exactly the same camera, composition, tea house, moon, lake, koi, branches, lighting and every object position. Change ONLY the white cherry blossom petals to soft vivid pink. Do not add objects or change the background. SFW. Portrait 9:16.';
 state.quote=await client.preflight(state.settings);save(state);
 if(state.quote.perTask>15)throw new Error('Quote exceeds bounded test budget of 15 free credits. No generation sent.');
 state.token=await client.submit(state.prompt,state.settings,state.quote,async token=>{state.token=token;save(state);});save(state);
 console.log(JSON.stringify({submitted:true,credits:state.quote.perTask,taskId:state.token.taskId}));
}else if(process.argv.includes('--poll')){
 if(!state.token)throw new Error('No existing submission');
 const result=await client.refresh(state.token);state.result=result;save(state);
 if(result.status==='needs_review'){
  const asset=result.assets[0];const response=await fetch(asset.url);if(!response.ok)throw new Error('Download failed');const bytes=Buffer.from(await response.arrayBuffer());const sha256=createHash('sha256').update(bytes).digest('hex');
  if(asset.assetId&&/^[a-f0-9]{64}$/.test(asset.assetId)&&sha256!==asset.assetId)throw new Error('Asset hash mismatch');
  fs.writeFileSync(path.join(root,'image-b.jpeg'),bytes);state.download={sha256,bytes:bytes.length,file:'image-b.jpeg'};save(state);
 }
 console.log(JSON.stringify({status:result.status,taskId:result.taskId,remoteTaskId:result.remoteTaskId,download:state.download,error:result.error}));
}else throw new Error('Use --submit once, then --poll');
