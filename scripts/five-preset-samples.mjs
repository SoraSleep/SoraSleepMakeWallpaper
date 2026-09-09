import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const out = path.resolve('five-preset-output');
mkdirSync(out, { recursive: true });
copyFileSync('public/demo/wallpaper.jpg', path.join(out, 'a.jpg'));
copyFileSync('public/demo/wallpaper-variant-pink.png', path.join(out, 'b.png'));
for (const layer of ['background', 'subject', 'foreground']) copyFileSync(`public/demo/depth-${layer}.svg`, path.join(out, `depth-${layer}.svg`));
const source = readFileSync('src/project/projectFile.ts', 'utf8');
const transition = stripTypeScriptTypes(readFileSync('src/export/transitionFrame.ts', 'utf8'));
const parallax = stripTypeScriptTypes(readFileSync('src/export/parallaxVideoFrame.ts', 'utf8'));
writeFileSync(path.join(out, 'transition.js'), transition);
writeFileSync(path.join(out, 'parallax.js'), parallax);
const presets = ['difference-lens', 'portal-reveal', 'layered-parallax', 'before-after-sweep', 'transformation-loop'];
const browser = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
for (const [index, id] of presets.entries()) {
  const q = { preset: { id }, presetSettings: { sweep: { softness: 3 } }, canvas: { fit: 'cover' }, mobileMotion: { duration: 8 }, parallax: { mode:'layers', overscan:12, cameraStrength:18, axis:'both', mobile:{ reducedMotion:false }, layers:[{ name:'Background', visible:true, asset:{source:'a.jpg'}, depth:.5, scale:1.3, offsetX:0, offsetY:0 }] } };
  if (index === 2) q.parallax.layers = ['background', 'subject', 'foreground'].map((name, i) => ({ name, visible:true, asset:{source:`depth-${name}.svg`}, depth:[0.1,0.45,0.9][i], scale:1.15, offsetX:0, offsetY:0 }));
  let script;
  if (index < 2) {
    const runtime = source.match(new RegExp('const ' + (index ? 'portalRuntime' : 'runtime') + ' = `([\\s\\S]*?)`;'))[1];
    const config = { preset:id, canvas:{fit:'cover'}, lens:{radius:22,feather:18,magnification:145,revealIntensity:100,followSpeed:78}, portal:{glow:50,ripple:0}, assets:{imageA:'a.jpg',imageB:'b.png'}, mobileMotion:{path:'orbit',duration:8}, differenceMask:{width:1,height:1,data:[255],asset:'b.png'} };
    script = `window.WALLPAPER_CONFIG=${JSON.stringify(config)};${runtime}`;
  } else {
    script = `${transition.replaceAll('export ', '')}\n${parallax.replaceAll('export ', '')}\nconst q=${JSON.stringify(q)},c=document.querySelector('canvas');c.width=432;c.height=768;const ctx=c.getContext('2d'); const load=s=>new Promise(r=>{const i=new Image;i.onload=()=>r(i);i.src=s});const [a,b]=await Promise.all([load('a.jpg'),load('b.png')]);const draw=await prepareParallaxVideo(q);function frame(t){if(draw)draw(ctx,432,768,.5+Math.cos(t/8000*Math.PI*2)*.2,.5+Math.sin(t/8000*Math.PI*2)*.2);else drawTransitionFrame(ctx,q,a,b,432,768,t/1000);requestAnimationFrame(frame)}requestAnimationFrame(frame);`;
  }
  if (index === 0) script = `
const c=document.querySelector('canvas'),ctx=c.getContext('2d');
const load=s=>new Promise((resolve,reject)=>{const i=new Image;i.onload=()=>resolve(i);i.onerror=reject;i.src=s});
const [a,b]=await Promise.all([load('a.jpg'),load('b.png')]);
const variant=document.createElement('canvas');variant.width=a.width;variant.height=a.height;
const v=variant.getContext('2d',{willReadFrequently:true});v.drawImage(b,0,0,a.width,a.height);const bp=v.getImageData(0,0,a.width,a.height);
v.clearRect(0,0,a.width,a.height);v.drawImage(a,0,0);const ap=v.getImageData(0,0,a.width,a.height);
for(let i=0;i<bp.data.length;i+=4){const d=Math.max(Math.abs(ap.data[i]-bp.data[i]),Math.abs(ap.data[i+1]-bp.data[i+1]),Math.abs(ap.data[i+2]-bp.data[i+2]));bp.data[i+3]=Math.round(255*Math.max(0,Math.min(1,(d-15)/35)));}
v.putImageData(bp,0,0);
let held=false,p=0,last=performance.now(),x=.5,y=.5;
c.onpointerdown=e=>{held=true;c.setPointerCapture(e.pointerId);const r=c.getBoundingClientRect();x=(e.clientX-r.left)/r.width;y=(e.clientY-r.top)/r.height;};
c.onpointerup=c.onpointercancel=()=>held=false;
function frame(t){const dt=Math.min(.1,(t-last)/1000);last=t;p+=((held?1:0)-p)*(1-Math.exp(-dt*(held?7:4)));c.width=innerWidth;c.height=innerHeight;const w=c.width,h=c.height,s=Math.max(w/a.width,h/a.height),z=1+.15*p,cx=x*w,cy=y*h;ctx.setTransform(z,0,0,z,cx*(1-z),cy*(1-z));ctx.drawImage(a,(w-a.width*s)/2,(h-a.height*s)/2,a.width*s,a.height*s);ctx.globalAlpha=Math.max(0,Math.min(1,(p-.3)/.7));ctx.drawImage(variant,(w-a.width*s)/2,(h-a.height*s)/2,a.width*s,a.height*s);ctx.globalAlpha=1;ctx.setTransform(1,0,0,1,0,0);requestAnimationFrame(frame)}requestAnimationFrame(frame);`;
  const name = `${index + 1}-${id}`;
  writeFileSync(path.join(out, name + '.html'), `<!doctype html><meta charset="utf-8"><title>${id} - development sample</title><style>html,body{margin:0;background:#090b0e;width:100%;height:100%}canvas{width:100%;height:100%;display:block}</style><canvas></canvas><script type="module">${script}</script>`);
  if(browser) execFileSync(browser, ['--headless=new','--no-sandbox','--allow-file-access-from-files',`--user-data-dir=${path.join(out, '.browser-'+index)}`,'--window-size=432,768','--virtual-time-budget=2500',`--screenshot=${path.join(out,name+'.png')}`,new URL('file:///' + path.join(out,name+'.html').replaceAll('\\','/')).href],{stdio:'ignore'});
  console.log(`GENERATED ${name} (development sample, not certification)`);
}
