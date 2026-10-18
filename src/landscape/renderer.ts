import type {LandscapeSettings} from './schema';
/** Self-contained: this exact function is bundled into the offline desktop runtime. */
export function createLandscapeRenderer(image:HTMLImageElement,settings:LandscapeSettings,width:number,height:number){
 const make=()=>{const c=document.createElement('canvas');c.width=width;c.height=height;return c;};
 const base=make(),water=make(),waterMask=make(),lightMask=make(),particles=make();
 const b=base.getContext('2d')!,w=water.getContext('2d')!,wm=waterMask.getContext('2d')!,lm=lightMask.getContext('2d')!,px=particles.getContext('2d')!;
 const scale=Math.max(width/image.naturalWidth,height/image.naturalHeight),iw=image.naturalWidth*scale,ih=image.naturalHeight*scale,ox=(width-iw)/2,oy=(height-ih)/2;
 b.drawImage(image,ox,oy,iw,ih);
 const bounds=(r:{x:number;y:number;width:number;height:number})=>({x:ox+r.x*iw,y:oy+r.y*ih,width:r.width*iw,height:r.height*ih});
 function mask(ctx:CanvasRenderingContext2D,regions:typeof settings.waterRegions){
  for(const r of regions){const q=bounds(r),edge=Math.max(1,Math.min(q.width,q.height)*.06);ctx.save();ctx.beginPath();ctx.rect(q.x,q.y,q.width,q.height);ctx.clip();const gx=ctx.createLinearGradient(q.x,0,q.x+q.width,0);gx.addColorStop(0,'transparent');gx.addColorStop(Math.min(.49,edge/q.width),'white');gx.addColorStop(Math.max(.51,1-edge/q.width),'white');gx.addColorStop(1,'transparent');ctx.fillStyle=gx;ctx.fillRect(q.x,q.y,q.width,q.height);ctx.globalCompositeOperation='destination-in';const gy=ctx.createLinearGradient(0,q.y,0,q.y+q.height);gy.addColorStop(0,'transparent');gy.addColorStop(Math.min(.49,edge/q.height),'white');gy.addColorStop(Math.max(.51,1-edge/q.height),'white');gy.addColorStop(1,'transparent');ctx.fillStyle=gy;ctx.fillRect(q.x,q.y,q.width,q.height);ctx.restore();}
  for(const r of settings.protectedRegions){const q=bounds(r);ctx.clearRect(Math.floor(q.x),Math.floor(q.y),Math.ceil(q.width)+1,Math.ceil(q.height)+1);}
 }
 mask(wm,settings.waterRegions);mask(lm,settings.lightRegions);
 let random=settings.seed>>>0;const rand=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 const petals=Array.from({length:settings.petals},()=>({x:rand(),offset:rand(),wave:rand()*Math.PI*2,size:(.6+rand())*settings.petalSize,depth:.35+rand()*.65,rotation:rand()*Math.PI}));
 let disposed=false;
 return{
  draw(ctx:CanvasRenderingContext2D,time:number,reduced=settings.reducedMotion){
   if(disposed)return;const phase=((time%settings.duration)+settings.duration)%settings.duration/settings.duration,angle=phase*Math.PI*2;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.drawImage(base,0,0);
   if(!reduced){
    if(settings.waterRegions.length&&settings.waterStrength>0){w.clearRect(0,0,width,height);w.globalCompositeOperation='source-over';const strip=Math.max(2,Math.round(height/320));for(let y=0;y<height;y+=strip){const dx=Math.sin(angle+y/height*35)*settings.waterStrength*width/720;w.drawImage(base,0,y,width,Math.min(strip,height-y),dx,y,width,Math.min(strip,height-y));}w.globalCompositeOperation='destination-in';w.drawImage(waterMask,0,0);w.globalCompositeOperation='source-over';ctx.drawImage(water,0,0);}
    if(settings.lightRegions.length&&settings.lightStrength>0){ctx.globalCompositeOperation='screen';ctx.globalAlpha=settings.lightStrength*(.5-.5*Math.cos(angle));ctx.drawImage(lightMask,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
    if(petals.length){px.clearRect(0,0,width,height);for(const p of petals){const q=(phase+p.offset)%1,alpha=Math.pow(Math.sin(q*Math.PI),2)*.8,x=(p.x+Math.sin(q*Math.PI*2+p.wave)*.07)*width,y=(q*1.25-.125)*height;px.save();px.translate(x,y);px.rotate(p.rotation+q*Math.PI*2);px.scale(1,Math.max(.25,Math.abs(Math.cos(q*Math.PI*2+p.wave))));px.globalAlpha=alpha;px.fillStyle=p.depth>.7?'#ffd6e6':'#ed9fbe';const size=Math.max(2,width/140*p.size*p.depth);px.beginPath();px.ellipse(0,0,size*.65,size,Math.PI/5,0,Math.PI*2);px.fill();px.restore();}for(const r of settings.protectedRegions){const q=bounds(r);px.clearRect(Math.floor(q.x),Math.floor(q.y),Math.ceil(q.width)+1,Math.ceil(q.height)+1);}ctx.drawImage(particles,0,0);}
   }ctx.restore();
  },
  dispose(){if(disposed)return;disposed=true;for(const c of [base,water,waterMask,lightMask,particles]){c.width=1;c.height=1;}},
 };
}
