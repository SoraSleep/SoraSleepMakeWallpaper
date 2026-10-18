// Adapter for Image Dream's existing local region editor. Never submits generation.
export function createLandscapeImageEdits({baseUrl='http://127.0.0.1:17897',fetchImpl=fetch}={}){
 const base=new URL(baseUrl),jobs=new Map();
 async function call(route,body){const response=await fetchImpl(new URL(route,base),{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(90000)});const value=await response.json();if(!response.ok)throw Error(value.error||'image-edit-provider-'+response.status);return value;}
 async function assets(){const values=await call('/api/integrations/assets');if(!Array.isArray(values))throw Error('image-edit-assets-invalid');return values.map(item=>({assetId:item.assetId,fileName:item.fileName,width:item.width,height:item.height}));}
 async function preview(input){
  const asset=(await assets()).find(item=>item.assetId===input.assetId);if(!asset)throw Error('image-edit-source-not-found');
  const rect=input.rect;if(!rect||!['x','y','width','height'].every(key=>Number.isSafeInteger(rect[key]))||rect.x<0||rect.y<0||rect.width<1||rect.height<1||rect.x+rect.width>asset.width||rect.y+rect.height>asset.height||rect.width*rect.height>asset.width*asset.height*.05)throw Error('image-edit-region-invalid');
  const value=await call('/api/image-edits/preview',{fileName:asset.fileName,rect,confirmRights:true});
  if(!/^[a-f0-9-]{36}$/.test(value.id))throw Error('image-edit-job-invalid');
  jobs.set(value.id,{source:asset,rect,expires:Date.now()+600000});
  return{id:value.id,width:value.width,height:value.height,engine:value.engine,previewUrl:'/landscape-edits/'+value.id+'/preview',source:asset,rect};
 }
 function job(id){const value=jobs.get(id);if(!value||value.expires<Date.now())throw Error('image-edit-preview-expired');return value;}
 async function image(id){job(id);const response=await fetchImpl(new URL('/api/image-edits/'+id+'/preview',base),{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('image-edit-preview-expired');return Buffer.from(await response.arrayBuffer());}
 async function save(id,input){const value=job(id);if(input.reviewed!==true)throw Error('image-edit-review-required');const result=await call('/api/image-edits/'+id+'/save',{confirmRights:true,reviewed:true});const asset=(await assets()).find(item=>item.fileName===result.fileName);if(!asset)throw Error('image-edit-saved-asset-not-found');value.saved=asset;return{...asset,source:value.source,rect:value.rect,aiGenerated:true,downloadUrl:'/landscape-edits/'+id+'/download'};}
 async function download(id){const asset=job(id).saved;if(!asset)throw Error('image-edit-save-first');const response=await fetchImpl(new URL('/downloads/'+encodeURIComponent(asset.fileName),base),{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('image-edit-download-failed');return{bytes:Buffer.from(await response.arrayBuffer()),fileName:asset.fileName};}
 async function source(assetId){const asset=(await assets()).find(item=>item.assetId===assetId);if(!asset)throw Error('image-edit-source-not-found');const response=await fetchImpl(new URL('/downloads/'+encodeURIComponent(asset.fileName),base),{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('image-edit-source-unavailable');return{bytes:Buffer.from(await response.arrayBuffer()),mime:response.headers.get('content-type')||'application/octet-stream'};}
 return{assets,preview,image,save,download,source};
}
