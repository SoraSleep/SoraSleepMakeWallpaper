// Offline runtime for the two SFW pair presets. No network dependencies.
const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d'), q = window.WALLPAPER_CONFIG;
const layer = document.createElement('canvas'), lx = layer.getContext('2d');
const a = new Image(), b = new Image(), mask = new Image();
let pointer = { x: .5, y: .5 }, held = false, progress = 0, frame = 0, last = performance.now();
q.portal=Object.assign({glow:0,ripple:0,rippleEnabled:true,reducedMotion:false},q.portal);
window.wallpaperPropertyListener={applyUserProperties(p){for(const [key,field,multiplier] of [['lensradius','radius',100],['magnification','magnification',100],['feather','feather',100],['revealintensity','revealIntensity',100]])if(p[key])q.lens[field]=p[key].value*multiplier;for(const [key,field,multiplier] of [['portalglow','glow',100],['portalripple','ripple',100]])if(p[key])q.portal[field]=p[key].value*multiplier;if(p.rippleenabled)q.portal.rippleEnabled=p.rippleenabled.value;if(p.reducedmotion)q.portal.reducedMotion=p.reducedmotion.value;}};
a.src = q.assets.imageA; b.src = q.assets.imageB;
if (q.differenceMask?.asset) mask.src = q.differenceMask.asset;
function fit(image) {
  const s = (q.canvas.fit === 'contain' ? Math.min : Math.max)(canvas.width / image.width, canvas.height / image.height);
  return [(canvas.width-image.width*s)/2,(canvas.height-image.height*s)/2,image.width*s,image.height*s];
}
function draw(now) {
  const dt = Math.min(.1,(now-last)/1000); last=now;
  const d = Math.min(devicePixelRatio || 1,2), w=Math.round(innerWidth*d), h=Math.round(innerHeight*d);
  if(canvas.width!==w || canvas.height!==h){canvas.width=layer.width=w;canvas.height=layer.height=h;}
  progress += ((held&&!q.portal.reducedMotion?1:0)-progress)*(1-Math.exp(-dt*(held?7:4)));
  if(a.naturalWidth && b.naturalWidth){
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle='#090b0e';ctx.fillRect(0,0,w,h);
    const ar=fit(a),br=fit(b);lx.clearRect(0,0,w,h);lx.globalCompositeOperation='source-over';lx.drawImage(b,...br);
    if(q.preset==='difference-lens'){
      if(mask.naturalWidth){lx.globalCompositeOperation='destination-in';lx.drawImage(mask,...ar);}
      else lx.clearRect(0,0,w,h);
      const zoom=1+(Math.max(1,Math.min(1.18,q.lens.magnification/100))-1)*progress;
      ctx.setTransform(zoom,0,0,zoom,pointer.x*w*(1-zoom),pointer.y*h*(1-zoom));ctx.drawImage(a,...ar);
      const t=Math.max(0,Math.min(1,(progress-.3)/.7));ctx.globalAlpha=t*t*(3-2*t)*q.lens.revealIntensity/100;ctx.drawImage(layer,0,0);
    }else{
      ctx.drawImage(a,...ar);
      const r=q.lens.radius/100*Math.min(w,h)*(1+.45*progress),cx=pointer.x*w,cy=pointer.y*h,soft=Math.max(1,r*q.lens.feather/100);
      const g=lx.createRadialGradient(cx,cy,Math.max(0,r-soft),cx,cy,r);g.addColorStop(0,'white');g.addColorStop(1,'transparent');
      lx.globalCompositeOperation='destination-in';lx.fillStyle=g;lx.fillRect(0,0,w,h);ctx.globalAlpha=q.lens.revealIntensity/100;ctx.drawImage(layer,0,0);
      ctx.save();const glow=Math.max(0,q.portal.glow/100);ctx.globalAlpha=1;ctx.strokeStyle=`rgba(185,228,114,${Math.min(1,glow)})`;ctx.shadowColor='#b9e472';ctx.shadowBlur=24*glow;ctx.lineWidth=1.5*d;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
      if(q.portal.rippleEnabled&&!q.portal.reducedMotion&&q.portal.ripple>0){for(let n=0;n<2;n++){const t=(now/1800+n*.5)%1;ctx.globalAlpha=(1-t)*q.portal.ripple/100*.45;ctx.beginPath();ctx.arc(cx,cy,r*(1+t*.5),0,Math.PI*2);ctx.stroke();}}ctx.restore();
    }
  }
  frame=requestAnimationFrame(draw);
}
canvas.onpointerdown=e=>{held=true;canvas.setPointerCapture(e.pointerId);point(e);};
function point(e){const r=canvas.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
canvas.onpointermove=point;canvas.onpointerup=canvas.onpointercancel=()=>held=false;
addEventListener('blur',()=>held=false);
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);if(!document.hidden){last=performance.now();frame=requestAnimationFrame(draw);}});
frame=requestAnimationFrame(draw);
