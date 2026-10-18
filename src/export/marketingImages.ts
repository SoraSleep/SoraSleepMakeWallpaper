export async function createMarketingImages(file: File, title: string, seller: string) {
  const image = await createImageBitmap(file);
  try {
    const make = async (name: string, role: string, draw: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1000;
      const ctx=canvas.getContext('2d')!;ctx.fillStyle='#101722';ctx.fillRect(0,0,1600,1000);draw(ctx);
      ctx.fillStyle='white';ctx.font='bold 42px sans-serif';ctx.fillText(title.slice(0,55),60,80,1480);
      ctx.font='24px sans-serif';ctx.fillText(`${seller} · Artwork preview`,60,960,1480);
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Marketing image encoding failed.')),'image/jpeg',.92));
      return {file:new File([blob],name,{type:'image/jpeg'}),role,category:'Listing'};
    };
    const fit=(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number)=>{
      const scale=Math.min(w/image.width,h/image.height);ctx.drawImage(image,x+(w-image.width*scale)/2,y+(h-image.height*scale)/2,image.width*scale,image.height*scale);
    };
    return await Promise.all([
      make('cover.jpg','cover',ctx=>fit(ctx,60,120,1480,760)),
      make('contact-sheet.jpg','contact-sheet',ctx=>{for(let i=0;i<3;i++){ctx.strokeStyle='#65788f';ctx.strokeRect(60+i*510,150,460,700);fit(ctx,60+i*510,150,460,700);}ctx.fillStyle='#fff';ctx.font='22px sans-serif';ctx.fillText('Same artwork · layout preview only',60,910);}),
      make('device-mockup.jpg','device-mockup',ctx=>{ctx.fillStyle='#343e4d';ctx.fillRect(80,220,1000,580);fit(ctx,100,240,960,540);ctx.fillRect(1170,140,330,710);fit(ctx,1185,160,300,670);ctx.fillRect(440,800,260,30);})
    ]);
  } finally { image.close(); }
}
