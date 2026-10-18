import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const python=process.env.SORASLEEP_PLR_PYTHON||'D:/SoraSleep Main/Runtime/Python/plr/Scripts/python.exe';
const models=process.env.SORASLEEP_PLR_MODELS||'D:/SoraSleep Main/Runtime/Models/PLR';
export const segmentationRecipe='birefnet-general-lite-rembg-2.0.67-v1';
export function segmentationAvailable(){return existsSync(python)&&existsSync(path.join(models,'birefnet-general-lite.onnx'));}
export function createSegmentationWorker(){
 let child=null,buffer='',pending=null,closed=false;
 function fail(message){if(pending){clearTimeout(pending.timer);pending.reject(Error(message));pending=null;}}
 function launch(){
  if(closed)throw Error('plr-worker-closed');if(child)return;
  if(!segmentationAvailable())throw Error('plr-segmentation-worker-not-ready');
  child=spawn(python,['-u',fileURLToPath(new URL('./plr-segment-worker.py',import.meta.url))],{windowsHide:true,env:{...process.env,U2NET_HOME:models,OMP_NUM_THREADS:'2'},stdio:['pipe','pipe','pipe']});
  child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{buffer+=chunk;if(buffer.length>100000){fail('plr-worker-invalid-output');close();return;}let pos;while((pos=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,pos);buffer=buffer.slice(pos+1);if(!line.trim())continue;try{const data=JSON.parse(line);if(pending){const request=pending;pending=null;clearTimeout(request.timer);data.ok?request.resolve(data.result):request.reject(Error(data.error||'plr-segmentation-failed'));}}catch{fail('plr-worker-invalid-output');close();}}});
  child.stdin.on('error',()=>fail('plr-worker-write-failed'));child.stderr.on('data',()=>{});child.on('error',()=>fail('plr-worker-launch-failed'));child.on('exit',()=>{child=null;fail('plr-worker-exited');});
 }
 function close(){closed=true;fail('plr-worker-closed');if(child){child.stdin.end();child.kill();child=null;}}
 async function segment(source,target,sourceSha256){if(pending)throw Error('plr-worker-busy');launch();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{fail('plr-segmentation-timeout');close();},180000);pending={resolve,reject,timer};child.stdin.write(JSON.stringify({source,target,sourceSha256})+'\n',e=>{if(e)fail('plr-worker-write-failed');});});}
 return {segment,close};
}
