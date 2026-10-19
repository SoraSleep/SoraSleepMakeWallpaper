import {managerBase} from '../app/runtime';
import type {MotionPairProject} from '../project/projectSchema';
type RasterAsset={source:string;mimeType:string;width:number;height:number;name:string;size?:number};
const prepared=new WeakSet<object>();
export async function cleanOutputAsset<T extends RasterAsset>(asset:T):Promise<T>{
 let input=await(await fetch(asset.source)).blob();
 if(asset.mimeType==='image/svg+xml'){
  const bitmap=await createImageBitmap(input),canvas=document.createElement('canvas');canvas.width=asset.width;canvas.height=asset.height;canvas.getContext('2d')!.drawImage(bitmap,0,0,asset.width,asset.height);bitmap.close();input=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Không thể chuẩn bị ảnh để xử lý watermark.')),'image/png'));
 }
 const response=await fetch(managerBase+'/watermark-cleanup',{method:'POST',headers:{'Content-Type':input.type||asset.mimeType,'X-SoraSleep-Bridge':'1'},body:input});
 if(!response.ok){let reason='';try{reason=(await response.json()).error;}catch{}throw Error('Chưa xuất ảnh: xử lý watermark không thành công. '+reason);}
 const status=response.headers.get('X-SoraSleep-Watermark');if(!['known-marks-processed','no-known-marks-detected'].includes(status||''))throw Error('Backend chưa xác nhận bước xử lý watermark.');
 const blob=await response.blob(),bitmap=await createImageBitmap(blob);const valid=bitmap.width===asset.width&&bitmap.height===asset.height;bitmap.close();if(!valid)throw Error('Kích thước ảnh thay đổi sau xử lý watermark.');
 const source=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Không đọc được ảnh đã xử lý.'));reader.readAsDataURL(blob);});
 return{...asset,source,mimeType:blob.type,name:blob.type==='image/png'?asset.name.replace(/\.[^.]+$/,'')+'.png':asset.name,...('size'in asset?{size:blob.size}:{})};
}
export async function prepareCleanProject(project:MotionPairProject):Promise<MotionPairProject>{
 if(prepared.has(project))return project;
 const images=new Map<string,Promise<RasterAsset>>();
 async function clean<T extends RasterAsset>(asset:T):Promise<T>{let pending=images.get(asset.source);if(!pending){pending=cleanOutputAsset(asset);images.set(asset.source,pending);}const result=await pending;return{...asset,source:result.source,mimeType:result.mimeType,name:result.name,...('size'in asset?{size:result.size}:{})};}
 const imageA=await clean(project.assets.imageA),imageB=await clean(project.assets.imageB),layers=[];
 for(const layer of project.parallax.layers)layers.push({...layer,asset:layer.asset?await clean(layer.asset):null});
 const result:MotionPairProject={...project,assets:{imageA,imageB},parallax:{...project.parallax,layers},exportSettings:{...project.exportSettings,watermarkProcessing:{enabled:true,targets:['Dreamina AI','AI corner badge'],aestheticReviewRequired:true}}};prepared.add(result);return result;
}
