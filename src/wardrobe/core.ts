export type PairMetrics={changedPixels:number;outsidePixels:number;outsideChanged:number;protectedPixels:number;protectedChanged:number;meanDelta:number};
export function inspectWardrobePixels(a:Uint8ClampedArray,b:Uint8ClampedArray,mask:Uint8ClampedArray,protect:Uint8ClampedArray):PairMetrics{
 if(a.length!==b.length||a.length!==mask.length*4||mask.length!==protect.length||!mask.length)throw Error('wardrobe-buffer-mismatch');
 let changedPixels=0,outsidePixels=0,outsideChanged=0,protectedPixels=0,protectedChanged=0,total=0;
 for(let p=0;p<mask.length;p++){const i=p*4,delta=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]),Math.abs(a[i+3]-b[i+3]));total+=delta;if(delta>24)changedPixels++;if(!mask[p]||protect[p]){outsidePixels++;if(delta>0)outsideChanged++;}if(protect[p]){protectedPixels++;if(delta>0)protectedChanged++;}}
 return{changedPixels,outsidePixels,outsideChanged,protectedPixels,protectedChanged,meanDelta:total/mask.length};
}
export function featherInside(mask:Uint8ClampedArray,width:number,height:number,radius:number){
 if(mask.length!==width*height||!Number.isInteger(radius)||radius<0||radius>12)throw Error('wardrobe-invalid-feather');
 if(!radius)return new Uint8ClampedArray(mask);const horizontal=new Float32Array(mask.length),result=new Uint8ClampedArray(mask.length),diameter=radius*2+1;
 for(let y=0;y<height;y++){let sum=0;for(let x=-radius;x<=radius;x++)if(x>=0&&x<width)sum+=mask[y*width+x];for(let x=0;x<width;x++){horizontal[y*width+x]=sum/diameter;const remove=x-radius,add=x+radius+1;if(remove>=0)sum-=mask[y*width+remove];if(add<width)sum+=mask[y*width+add];}}
 for(let x=0;x<width;x++){let sum=0;for(let y=-radius;y<=radius;y++)if(y>=0&&y<height)sum+=horizontal[y*width+x];for(let y=0;y<height;y++){const p=y*width+x;result[p]=Math.min(mask[p],Math.round(sum/diameter));const remove=y-radius,add=y+radius+1;if(remove>=0)sum-=horizontal[remove*width+x];if(add<height)sum+=horizontal[add*width+x];}}
 return result;
}
export function compositeWardrobe(a:Uint8ClampedArray,b:Uint8ClampedArray,edit:Uint8ClampedArray,protect:Uint8ClampedArray,width:number,height:number,feather=2){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>12000000||edit.length!==width*height)throw Error('wardrobe-invalid-dimensions');
 const before=inspectWardrobePixels(a,b,edit,protect);if(!edit.some(v=>v>0))throw Error('wardrobe-edit-mask-empty');if(!protect.some(v=>v>0))throw Error('wardrobe-protected-mask-empty');
 const allowed=Uint8ClampedArray.from(edit,(value,p)=>protect[p]?0:value),alpha=featherInside(allowed,width,height,feather),pixels=new Uint8ClampedArray(a);let editedPixels=0;
 for(let p=0;p<alpha.length;p++){if(!alpha[p])continue;const i=p*4,t=alpha[p]/255;for(let c=0;c<4;c++)pixels[i+c]=Math.round(a[i+c]*(1-t)+b[i+c]*t);if(pixels[i]!==a[i]||pixels[i+1]!==a[i+1]||pixels[i+2]!==a[i+2]||pixels[i+3]!==a[i+3])editedPixels++;}
 if(!editedPixels)throw Error('wardrobe-no-visible-edit-in-mask');const after=inspectWardrobePixels(a,pixels,edit,protect);if(after.outsideChanged||after.protectedChanged)throw Error('wardrobe-composite-protection-failed');
 return{pixels,alpha,before,after,editedPixels,commercialReady:false as const};
}
