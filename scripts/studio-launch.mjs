import {createServer} from 'node:http';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {loadRuntime} from './runtime-config.mjs';
import {projectMirror} from './project-mirror.mjs';
const runtime=loadRuntime(),at=name=>import(pathToFileURL(path.join(runtime.backend,name))),{createPlrStore}=await at('plr-store.mjs'),{createPlrApi}=await at('plr-api.mjs'),root=fs.realpathSync('dist');
const api=createPlrApi({store:createPlrStore({root:runtime.dataRoot}),port:runtime.port,imageDreamUrl:runtime.imageDreamUrl,watermarkRoot:path.join(runtime.dataRoot,'..','WatermarkCache')});await api.listen();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.wasm':'application/wasm'};
const mirror=projectMirror(path.join(runtime.dataRoot,'..','WallpaperMirror'));
const web=createServer(async(req,res)=>{try{
 if(await mirror(req,res))return;
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 const url=new URL(req.url,'http://127.0.0.1'),relative=decodeURIComponent(url.pathname).replace(/^\//,''),candidate=path.resolve(root,relative||'index.html');if(path.relative(root,candidate).startsWith('..'))throw Error('invalid-path');
 const file=fs.realpathSync(fs.existsSync(candidate)?candidate:path.extname(relative)?candidate:path.join(root,'index.html'));if(path.relative(root,file).startsWith('..')||!fs.statSync(file).isFile())throw Error('invalid-file');let body=fs.readFileSync(file);
 if(path.basename(file)==='index.html')body=Buffer.from(body.toString('utf8').replace('<head>','<head><meta name="sorasleep-manager" content="http://127.0.0.1:'+runtime.port+'">'));
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Content-Length':body.length,'X-Content-Type-Options':'nosniff','Cache-Control':path.extname(file)==='.html'?'no-store':'public, max-age=3600'});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404);res.end('Not found');}});
try{await new Promise((resolve,reject)=>{web.once('error',reject);web.listen(17880,'127.0.0.1',resolve);});}catch(error){await api.close();throw error;}
console.log('SoraSleep Studio ready: http://127.0.0.1:17880');
process.send?.({type:'ready',url:'http://127.0.0.1:17880'});
let closing=false;
async function shutdown(){if(closing)return;if(api.isBusy()){process.send?.({type:'busy'});return;}closing=true;await new Promise(resolve=>{web.close(resolve);web.closeAllConnections();});await api.close();process.exit(0);}
process.on('message',message=>{if(message?.type==='status')process.send?.({type:'status',id:message.id,busy:!!api.isBusy()});if(message?.type==='shutdown')shutdown();});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,shutdown);
// If the desktop owner disappears, retain in-flight work and exit only when idle.
if(process.env.SORASLEEP_DESKTOP_PID){const owner=Number(process.env.SORASLEEP_DESKTOP_PID);setInterval(()=>{try{process.kill(owner,0);}catch(error){if(error.code==='ESRCH')shutdown();}},3000).unref();}
