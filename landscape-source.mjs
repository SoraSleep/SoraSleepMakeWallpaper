import {createHash} from 'node:crypto';
import path from 'node:path';
export async function readLandscapeSource(assetId,{baseUrl=process.env.SORASLEEP_IMAGE_DREAM_URL||'http://127.0.0.1:17897',fetchImpl=fetch}={}){
 if(typeof assetId!=='string'||! /^(sha256:)?[a-f0-9]{64}$/.test(assetId))throw new Error('invalid-landscape-source-id');
 const base=new URL(baseUrl);if(base.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(base.hostname)||base.username||base.password||base.pathname!=='/')throw new Error('landscape-source-must-be-local');
 const response=await fetchImpl(new URL('/api/integrations/assets',base),{signal:AbortSignal.timeout(15000),redirect:'error'});if(!response.ok)throw new Error('image-dream-gallery-unavailable');const assets=await response.json();if(!Array.isArray(assets))throw new Error('invalid-image-gallery');
 const asset=assets.find(a=>a.assetId===assetId);if(!asset||typeof asset.fileName!=='string'||path.win32.basename(asset.fileName)!==asset.fileName||!['image/png','image/jpeg','image/webp'].includes(asset.mimeType))throw new Error('landscape-source-not-found');
 const download=await fetchImpl(new URL('/downloads/'+encodeURIComponent(asset.fileName),base),{signal:AbortSignal.timeout(30000),redirect:'error'});if(!download.ok)throw new Error('landscape-source-download-failed');let size=0;const chunks=[];for await(const chunk of download.body){size+=chunk.length;if(size>24*1024*1024)throw new Error('landscape-source-too-large');chunks.push(chunk);}const bytes=Buffer.concat(chunks);
 if(createHash('sha256').update(bytes).digest('hex')!==assetId.replace(/^sha256:/,''))throw new Error('landscape-source-hash-mismatch');return{bytes,mimeType:asset.mimeType,fileName:asset.fileName};
}
