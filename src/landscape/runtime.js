const canvas=document.querySelector('canvas'),context=canvas.getContext('2d'),config=window.LANDSCAPE_CONFIG,image=new Image();
const media=matchMedia('(prefers-reduced-motion: reduce)');let renderer,frame=0,last=0,drawnLast=0,time=0,visible=true,hostPaused=false,fps=30,reduced=config.settings.reducedMotion;
const state=window.landscapeRuntime={frames:0,active:false,paused:false,qualityScale:1};
function shouldRun(){return renderer&&!document.hidden&&visible&&!hostPaused&&!reduced&&!media.matches;}
function stop(){cancelAnimationFrame(frame);frame=0;state.active=false;canvas.dataset.animationActive='false';}
function tick(now){frame=0;if(!shouldRun()){stop();return;}const interval=1000/fps,elapsed=now-last;if(elapsed>=interval){time+=Math.min(.1,(now-drawnLast)/1000);drawnLast=now;last=now-elapsed%interval;const start=performance.now();renderer.draw(context,time,false);state.frames++;if(performance.now()-start>interval*.85)fps=Math.max(15,fps-1);}frame=requestAnimationFrame(tick);}
function sync(){stop();state.paused=!shouldRun();if(renderer)renderer.draw(context,time,reduced||media.matches);if(shouldRun()){last=drawnLast=performance.now();state.active=true;canvas.dataset.animationActive='true';frame=requestAnimationFrame(tick);}}
function resize(){stop();renderer?.dispose();const d=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1920*1080/(innerWidth*innerHeight)));state.qualityScale=d;canvas.width=Math.max(1,Math.round(innerWidth*d));canvas.height=Math.max(1,Math.round(innerHeight*d));if(image.naturalWidth)renderer=createLandscapeRenderer(image,config.settings,canvas.width,canvas.height);sync();}
const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;sync();});observer.observe(canvas);
document.addEventListener('visibilitychange',sync);addEventListener('resize',resize);media.addEventListener('change',sync);
window.wallpaperPropertyListener={setPaused(value){hostPaused=!!value;sync();},applyGeneralProperties(properties){if(Number.isFinite(properties.fps))fps=Math.max(1,Math.min(60,properties.fps));},applyUserProperties(properties){if(properties.reducedmotion){reduced=!!properties.reducedmotion.value;sync();}}};
image.onload=resize;image.onerror=()=>{document.body.dataset.error='image-decode-failed';stop();};image.src=config.image;
addEventListener('pagehide',()=>{stop();observer.disconnect();renderer?.dispose();document.removeEventListener('visibilitychange',sync);removeEventListener('resize',resize);media.removeEventListener('change',sync);},{once:true});
