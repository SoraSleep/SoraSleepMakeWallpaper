import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
export function rejectUnverifiedMaskedEdit(settings={}){
 if(['mask','maskImage','maskImagePath','maskUrl','maskAssetId','maskPath','protectedRegions'].some(k=>settings[k]!==undefined)||['operation','editOperation','editMode'].some(k=>/mask|inpaint/i.test(settings[k]??'')))throw new Error('profile-studio-ai-masked-edit-not-verified-use-manual-b');
}
export async function inspectWardrobeCapabilities({baseUrl='http://127.0.0.1:17897',fetchImpl=fetch}={}){
 const base=new URL(baseUrl);if(base.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(base.hostname)||base.username||base.password)throw new Error('wardrobe-provider-must-be-local');
 const routes=['/api/health','/api/image-edits/status','/api/v1/image-capabilities'];
 const evidence=await Promise.all(routes.map(async route=>{try{const response=await fetchImpl(new URL(route,base),{method:'GET',redirect:'error',signal:AbortSignal.timeout(8000)});if(!response.ok)return{route,status:response.status};const body=await response.json();return{route,status:response.status,data:route==='/api/health'?{appId:body.appId,version:body.version}:route.includes('image-edits')?{available:body.available,engine:body.engine,aiModel:body.aiModel,maxMaskArea:body.maxMaskArea}:{provider:body.provider,operations:body.operations}};}catch{return{route,status:0,error:'unavailable'};}}));
 const health=evidence[0].data,localEdit=evidence[1].data;
 return{schemaVersion:1,checkedAt:new Date().toISOString(),providerVerified:health?.appId==='com.sorasleep.imagedream',providerVersion:health?.version??null,aiMaskedEdit:'unverified',automaticWardrobeEnabled:false,manualBAvailable:true,localRegionRepair:localEdit?.available===true&&localEdit.aiModel===false?{engine:localEdit.engine,maxMaskArea:localEdit.maxMaskArea}:null,evidence,generationRequests:0,creditsSpent:0,commercialRights:'requires-account-and-region-specific-evidence',decision:'manual-b-first-no-overall-reference-fallback'};
}
export function saveManualWardrobeDraft({root,a,b,input,readMaster}){
 if(!a||!b||a.sha256===b.sha256)throw new Error('wardrobe-select-two-different-masters');
 if([a,b].some(r=>!Number.isInteger(r.width)||!Number.isInteger(r.height)||r.width<=0||r.height<=0||!/^[a-f0-9]{64}$/.test(r.sha256||'')))throw new Error('wardrobe-invalid-master-dimensions-or-hash');
 if(a.width!==b.width||a.height!==b.height)throw new Error('wardrobe-pair-dimensions-mismatch');
 if(input.adultSfwReviewed!==true||input.sourceRightsReviewed!==true||input.manualBConfirmed!==true)throw new Error('wardrobe-manual-review-required');
 if(typeof input.change!=='string'||!input.change.trim()||input.change.length>2000)throw new Error('wardrobe-change-description-required');
 readMaster(a);readMaster(b);mkdirSync(root,{recursive:true});const record={schemaVersion:1,id:randomUUID(),collectionId:input.collectionId,at:new Date().toISOString(),workflowType:'character-wardrobe',transport:'manual-b',change:input.change.trim(),a:{itemId:a.itemId,sha256:a.sha256,selectionId:a.id,width:a.width,height:a.height},b:{itemId:b.itemId,sha256:b.sha256,selectionId:b.id,width:b.width,height:b.height},review:{adultSfwReviewed:true,sourceRightsReviewed:true,manualBConfirmed:true},status:'needs_mask_and_pair_review',identityPreserved:'unverified',outsideMaskPreserved:'unverified',commercialReady:false,generationRequests:0};
 const file=path.join(root,record.id+'.json');writeFileSync(file,JSON.stringify(record,null,2),{flag:'wx'});return{...record,file};
}
