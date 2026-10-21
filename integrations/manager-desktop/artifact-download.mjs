import {openSync,closeSync,writeSync,existsSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Retry only transport failures against the same immutable asset URL. Provider
// submission and generation are deliberately outside this function.
export async function downloadArtifact({url,target,expectedHash,fetchImpl=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),maxBytes=100000000}){
 const started=Date.now();
 for(let attempt=1;attempt<=3;attempt++){
  let fd,response,owned=false,retryable=true;
  try{
   response=await fetchImpl(url,{signal:AbortSignal.timeout(60000),redirect:'error'});
   if(!response.ok){retryable=[408,429].includes(response.status)||response.status>=500;throw Error('plr-download-http-'+response.status);}
   retryable=false;
   if(Number(response.headers?.get('content-length'))>maxBytes)throw Error('plr-download-too-large');
   fd=openSync(target,'wx');owned=true;const hash=createHash('sha256');let total=0;
   retryable=true;
   for await(const value of response.body){
    const chunk=Buffer.isBuffer(value)?value:Buffer.from(value.buffer,value.byteOffset,value.byteLength);total+=chunk.length;
    if(total>maxBytes){retryable=false;throw Error('plr-download-too-large');}
    retryable=false;
    let offset=0;while(offset<chunk.length){const written=writeSync(fd,chunk,offset,chunk.length-offset);if(!written)throw Error('plr-download-disk-write-stalled');offset+=written;}
    retryable=true;
    hash.update(chunk);
   }
   closeSync(fd);fd=undefined;retryable=false;
   const sha256=hash.digest('hex');if(!total||sha256!==expectedHash)throw Error('plr-artifact-hash-mismatch');
   return{sha256,bytes:total,download:{attempts:attempt,elapsedMs:Date.now()-started}};
  }catch(error){
   try{await response?.body?.cancel();}catch{}
   if(fd!==undefined)closeSync(fd);if(owned&&existsSync(target))unlinkSync(target);
   if(!retryable||attempt===3||['ENOSPC','EACCES','EPERM','EEXIST'].includes(error.code))throw error;
   await sleep(attempt===1?500:1500);
  }
 }
}
