export type ProductKind = 'background-art' | 'transparent-clipart';
export type Delivery = 'zip-parts' | 'etsy-digital';
export type ProductionRecipe = {
 schemaVersion:1; productKind:ProductKind; background:'keep'|'remove';
 outputFormat:'jpeg'|'png-rgba'; delivery:Delivery;
 maxPartBytes:number; maxParts:number; provider:'installed-image-dream';
 sourcePrompts:'unchanged'; automaticUpscale:false; includePromptsInBuyerPack:false;
 backgroundEngine:'not-required'|'unverified'; publicationStatus:'needs-review';
};
export function productionRecipe(kind:ProductKind,delivery:Delivery):ProductionRecipe{
 if(!['background-art','transparent-clipart'].includes(kind)||!['zip-parts','etsy-digital'].includes(delivery))throw Error('Loại sản phẩm hoặc cách giao gói không hợp lệ.');
 return {schemaVersion:1,productKind:kind,background:kind==='transparent-clipart'?'remove':'keep',outputFormat:kind==='transparent-clipart'?'png-rgba':'jpeg',delivery,maxPartBytes:delivery==='etsy-digital'?20_000_000:100_000_000,maxParts:delivery==='etsy-digital'?5:100,provider:'installed-image-dream',sourcePrompts:'unchanged',automaticUpscale:false,includePromptsInBuyerPack:false,backgroundEngine:kind==='transparent-clipart'?'unverified':'not-required',publicationStatus:'needs-review'};
}
