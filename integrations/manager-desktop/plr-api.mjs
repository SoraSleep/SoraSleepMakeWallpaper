import {createPlrWorkflow} from './plr-workflow.mjs';
import {createPlrPackager} from './plr-package.mjs';
import {createPlrListing} from './plr-listing.mjs';
import {createLandscapeImageEdits} from './landscape-image-edits.mjs';
import {createLandscapeGallery} from './landscape-gallery.mjs';
import {createLandscapeExporter} from './landscape-export.mjs';
import {createLandscapeQuality} from './landscape-quality.mjs';
import {createLandscapeDerivatives} from './landscape-derivatives.mjs';
import {createPlrQuality} from './plr-quality.mjs';
import {segmentationAvailable} from './plr-segmentation.mjs';
import {createPlrProcessor} from './plr-processing.mjs';
import {createServer} from 'node:http';
import {createPlrPreflight} from './plr-preflight.mjs';
import {createPlrDispatcher} from './plr-dispatcher.mjs';
import {readFileSync,realpathSync,createReadStream} from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const allowed=new Set(['http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:17880','http://localhost:17880']);
export function createPlrApi({store,port=17930,imageDreamUrl='http://127.0.0.1:17897',fetchImpl=fetch}){
 store.recoverInterruptedRuns();
 const preflight=createPlrPreflight({store,baseUrl:imageDreamUrl,fetchImpl});
 const processor=createPlrProcessor({store});
 const quality=createPlrQuality({store,processor});
 const packager=createPlrPackager({store,quality});
 const listing=createPlrListing({packager});
 const landscapeEdits=createLandscapeImageEdits({baseUrl:imageDreamUrl,fetchImpl});
 const derivatives=createLandscapeDerivatives({store});
 const landscapeGallery=createLandscapeGallery({store,derivatives});
 const landscapeExporter=createLandscapeExporter({store,gallery:landscapeGallery,derivatives});
 const landscapeQuality=createLandscapeQuality({store,derivatives});
 const dispatcher=createPlrDispatcher({store,baseUrl:imageDreamUrl,fetchImpl,canSegment:segmentationAvailable});
 const workflow=createPlrWorkflow({store,dispatcher,processor,preflight,quality,packager});workflow.recover();
 const publicWorkflow=id=>{const state=workflow.read(id);return state?{...state,active:workflow.isBusy(),progress:workflow.progress(id)}:null;};
 const reply=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const server=createServer(async(req,res)=>{
  const origin=req.headers.origin,host=req.headers.host||'';
  if(!['127.0.0.1','::ffff:127.0.0.1','::1'].includes(req.socket.remoteAddress)||!/^127\.0\.0\.1:\d+$/.test(host)||origin&&!allowed.has(origin))return reply(res,403,{error:'plr-local-origin-required'});
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-SoraSleep-Bridge'});res.end();return;}
  if(req.method==='POST'&&(!allowed.has(origin)||req.headers['x-sorasleep-bridge']!=='1'))return reply(res,403,{error:'plr-write-origin-required'});
  try{
   const url=new URL(req.url,'http://127.0.0.1');
   if(url.pathname==='/image-dream/wallet-refresh'&&['GET','POST'].includes(req.method)){
    if(req.method==='POST'&&(dispatcher.isBusy()||workflow.isBusy()))throw Error('plr-executor-busy');
    if(req.method==='POST'){const capability=await preflight.capabilities();if(capability.busy)throw Error('plr-image-dream-busy');}
    const response=await fetchImpl(new URL('/api/credit-scan',imageDreamUrl),{method:req.method,signal:AbortSignal.timeout(15000)}),value=await response.json();if(!response.ok)return reply(res,response.status,{error:value.error??'wallet-refresh-failed'});
    return reply(res,200,{status:value.status,total:value.total??0,completed:value.completed??0,totalCredits:value.totalCredits??0,verified:value.verified??0,empty:value.empty??0,unknown:value.unknown??0});
   }
   if(req.method==='GET'&&url.pathname==='/landscape-edits/status')return reply(res,200,await landscapeEdits.status());
   if(/^\/landscape-batches\/[a-f0-9-]{36}\/quality\/(start|status|cancel)$/.test(url.pathname)){const parts=url.pathname.split('/'),id=parts[2];if(req.method==='GET'&&parts[4]==='status')return reply(res,200,landscapeQuality.status(id));if(req.method==='POST'&&parts[4]==='start')return reply(res,200,landscapeQuality.start(id));if(req.method==='POST'&&parts[4]==='cancel')return reply(res,200,landscapeQuality.cancel(id));}
   if(/^\/landscape-batches\/[a-f0-9-]{36}\/items\/[a-f0-9-]{36}\/edited$/.test(url.pathname)){
    const parts=url.pathname.split('/');
    if(req.method==='POST'){let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>28001000)throw Error('landscape-reviewed-upload-too-large');}return reply(res,200,await derivatives.attach(parts[2],parts[4],JSON.parse(body)));}
    if(req.method==='GET'){const image=derivatives.resolve(parts[2],parts[4]);res.writeHead(200,{'Content-Type':'image/png','Content-Length':image.bytes,'Cache-Control':'no-store','Content-Disposition':'inline; filename="landscape-reviewed.png"'});const stream=createReadStream(image.file);stream.on('error',()=>res.destroy());stream.pipe(res);return;}
   }
   if(req.method==='POST'&&/^\/landscape-batches\/[a-f0-9-]{36}\/exports\/cancel$/.test(url.pathname))return reply(res,200,landscapeExporter.cancel(url.pathname.split('/')[2]));
   if(req.method==='GET'&&/^\/landscape-batches\/[a-f0-9-]{36}\/exports$/.test(url.pathname))return reply(res,200,{exports:landscapeExporter.list(url.pathname.split('/')[2])});
   if(req.method==='POST'&&/^\/landscape-batches\/[a-f0-9-]{36}\/exports$/.test(url.pathname)){let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>10000)throw Error('plr-request-too-large');}const id=url.pathname.split('/')[2],input=JSON.parse(body),selection=landscapeGallery.list(id).selection;if((input.mode??'selected')==='selected'&&input.selectionRevision!==selection.revision)throw Error('landscape-export-selection-stale');const qualityReport=await landscapeQuality.analyze(id,(input.mode??'selected')==='selected'?selection.itemIds:null,{variant:input.variant??'original'});if(qualityReport.flagged)throw Error('landscape-quality-review-required');return reply(res,200,await landscapeExporter.build(id,{...input,qualitySnapshot:qualityReport.items}));}
   if(req.method==='GET'&&/^\/landscape-batches\/[a-f0-9-]{36}\/exports\/[a-f0-9]{64}\/[a-zA-Z0-9_.-]+$/.test(url.pathname)){const parts=url.pathname.split('/'),artifact=await landscapeExporter.artifact(parts[2],parts[4],parts[5]);res.writeHead(200,{'Content-Type':artifact.mime,'Content-Length':artifact.bytes,'Cache-Control':'no-store','Content-Disposition':'attachment; filename="'+parts[5]+'"'});const stream=createReadStream(artifact.file);stream.on('error',()=>res.destroy());stream.pipe(res);return;}
   if(req.method==='GET'&&/^\/landscape-batches\/[a-f0-9-]{36}\/gallery$/.test(url.pathname))return reply(res,200,landscapeGallery.list(url.pathname.split('/')[2],{offset:Number(url.searchParams.get('offset')??0),limit:Number(url.searchParams.get('limit')??24),query:url.searchParams.get('q')??'',status:url.searchParams.get('status')??'all'}));
   if(req.method==='GET'&&/^\/landscape-batches\/[a-f0-9-]{36}\/quality$/.test(url.pathname))return reply(res,200,await landscapeQuality.analyze(url.pathname.split('/')[2]));
   if(req.method==='POST'&&/^\/landscape-batches\/[a-f0-9-]{36}\/gallery\/selection$/.test(url.pathname)){let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>30000)throw Error('plr-request-too-large');}return reply(res,200,landscapeGallery.saveSelection(url.pathname.split('/')[2],JSON.parse(body)));}
   if(req.method==='GET'&&/^\/landscape-batches\/[a-f0-9-]{36}\/items\/[a-f0-9-]{36}\/thumbnail$/.test(url.pathname)){const parts=url.pathname.split('/'),bytes=await landscapeGallery.thumbnail(parts[2],parts[4]);res.writeHead(200,{'Content-Type':'image/jpeg','Content-Length':bytes.length,'Cache-Control':'no-store'});res.end(bytes);return;}
   if(url.pathname==='/landscape-batches'&&req.method==='GET')return reply(res,200,{runs:store.list().filter(run=>store.getState(run.id).run.preset.studio==='text-to-image-landscape')});
   if(url.pathname==='/landscape-batches'&&req.method==='POST'){
    let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>6000000)throw Error('plr-import-too-large');chunks.push(chunk);}const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if(workflow.isBusy()||dispatcher.isBusy())throw Error('plr-executor-busy');
    if(input.preset?.studio!=='text-to-image-landscape'||input.preset.productKind!=='background-art')throw Error('landscape-preset-required');
    const cap=await preflight.capabilities(),model=cap.models.find(model=>model.id===input.preset.model);if(!model?.resolutions.includes(input.preset.resolution)||!model.ratios.includes(input.preset.aspectRatio))throw Error('plr-model-config-not-supported');
    const run=store.create(input);return reply(res,201,{id:run.id,title:run.title,totalRows:run.itemIds.length});
   }
   if(/^\/landscape-batches\/[a-f0-9-]{36}(?:\/(?:preflight|start|resume|pause|reconcile)|\/items\/[a-f0-9-]{36}\/source)?$/.test(url.pathname)){
    if(store.getState(url.pathname.split('/')[2]).run.preset.studio!=='text-to-image-landscape')throw Error('landscape-batch-not-found');
    url.pathname=url.pathname.replace('/landscape-batches/','/runs/');
   }
   if(req.method==='GET'&&url.pathname==='/landscape-edits/assets')return reply(res,200,{assets:await landscapeEdits.assets()});
   if(req.method==='GET'&&url.pathname==='/landscape-edits/source'){const result=await landscapeEdits.source(url.searchParams.get('assetId'));res.writeHead(200,{'Content-Type':result.mime,'Content-Length':result.bytes.length,'Cache-Control':'no-store'});res.end(result.bytes);return;}
   if(req.method==='POST'&&(url.pathname==='/landscape-edits/preview'||/^\/landscape-edits\/[a-f0-9-]{36}\/save$/.test(url.pathname))){let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>2100000)throw Error('plr-request-too-large');}return reply(res,200,url.pathname.endsWith('/save')?await landscapeEdits.save(url.pathname.split('/')[2],JSON.parse(body)):await landscapeEdits.preview(JSON.parse(body)));}
   if(req.method==='GET'&&/^\/landscape-edits\/[a-f0-9-]{36}\/(preview|download)$/.test(url.pathname)){const parts=url.pathname.split('/');if(parts[3]==='preview'){const bytes=await landscapeEdits.image(parts[2]);res.writeHead(200,{'Content-Type':'image/png','Content-Length':bytes.length,'Cache-Control':'no-store'});res.end(bytes);}else{const result=await landscapeEdits.download(parts[2]);res.writeHead(200,{'Content-Type':'image/png','Content-Length':result.bytes.length,'Cache-Control':'no-store','Content-Disposition':'attachment; filename="'+result.fileName+'"'});res.end(result.bytes);}return;}
   if(req.method==='GET'&&/^\/runs\/[a-f0-9-]{36}\/workflow$/.test(url.pathname))return reply(res,200,publicWorkflow(url.pathname.split('/')[2]));
   if(req.method==='POST'&&/^\/runs\/[a-f0-9-]{36}\/workflow\/package-limit$/.test(url.pathname)){if(dispatcher.isBusy()||processor.isBusy()||preflight.isBusy()||quality.isBusy()||packager.isBusy())throw Error('plr-executor-busy');let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>10000)throw Error('plr-request-too-large');}workflow.updatePackageLimit(url.pathname.split('/')[2],JSON.parse(body));return reply(res,200,publicWorkflow(url.pathname.split('/')[2]));}
   if(req.method==='POST'&&/^\/runs\/[a-f0-9-]{36}\/workflow\/(start|resume|pause)$/.test(url.pathname)){const parts=url.pathname.split('/'),id=parts[2],action=parts[4];if(action==='pause')return reply(res,200,{...workflow.pause(id),active:workflow.isBusy()});if(dispatcher.isBusy()||processor.isBusy()||preflight.isBusy()||quality.isBusy()||packager.isBusy())throw Error('plr-executor-busy');let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>100000)throw Error('plr-workflow-options-too-large');}workflow.start(id,action==='start'?JSON.parse(body):undefined);return reply(res,200,publicWorkflow(id));}
   if(req.method==='POST'&&workflow.isBusy())throw Error('plr-workflow-busy');
   if(req.method==='POST'&&/^\/runs\/[a-f0-9-]{36}\/items\/[a-f0-9-]{36}\/exclude$/.test(url.pathname)){if(dispatcher.isBusy()||processor.isBusy()||preflight.isBusy()||quality.isBusy()||packager.isBusy())throw Error('plr-executor-busy');let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>10000)throw Error('plr-request-too-large');}const parts=url.pathname.split('/');return reply(res,200,store.excludeItem(parts[2],parts[4],JSON.parse(body)));}
   if(req.method==='GET'&&url.pathname==='/capabilities')return reply(res,200,{appId:'com.sorasleep.manager.plr',schemaVersion:1,backendVersion:2,reviewedVariants:true,qualityJobs:true,walletRefresh:true,importRuns:true,preflight:true,generation:true,processing:true,segmentation:segmentationAvailable(),quality:true,packaging:true,listing:true,workflow:true,executorBusy:dispatcher.isBusy()||processor.isBusy()||quality.isBusy()||packager.isBusy()||listing.isBusy()||workflow.isBusy()});
   if(req.method==='GET'&&/^\/runs\/[a-f0-9-]{36}\/quality$/.test(url.pathname))return reply(res,200,quality.read(url.pathname.split('/')[2]));
   if(req.method==='POST'&&/^\/runs\/[a-f0-9-]{36}\/quality$/.test(url.pathname)){if(dispatcher.isBusy()||processor.isBusy()||preflight.isBusy()||packager.isBusy())throw Error('plr-executor-busy');return reply(res,200,await quality.analyze(url.pathname.split('/')[2]));}
   if(req.method==='POST'&&/^\/runs\/[a-f0-9-]{36}\/selection$/.test(url.pathname)){if(dispatcher.isBusy()||processor.isBusy()||preflight.isBusy()||quality.isBusy()||packager.isBusy())throw Error('plr-executor-busy');let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>300000)throw Error('plr-selection-too-large');}return reply(res,200,quality.select(url.pathname.split('/')[2],JSON.parse(body)));}
   if(req.method==='GET'&&/^\/runs\/[a-f0-9-]{36}\/packages$/.test(url.pathname))return reply(res,200,{packages:packager.list(url.pathname.split('/')[2])});
   if(req.method==='POST'&&/^\/runs\/[a-f0-9-]{36}\/package$/.test(url.pathname)){if(dispatcher.isBusy()||processor.isBusy()||preflight.isBusy()||quality.isBusy())throw Error('plr-executor-busy');let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>100000)throw Error('plr-package-options-too-large');}return reply(res,200,await packager.build(url.pathname.split('/')[2],JSON.parse(body)));}
   if(req.method==='GET'&&/^\/runs\/[a-f0-9-]{36}\/packages\/[a-f0-9]{64}\/listings$/.test(url.pathname)){const parts=url.pathname.split('/');return reply(res,200,{listings:listing.list(parts[2],parts[4])});}
   if(req.method==='POST'&&/^\/runs\/[a-f0-9-]{36}\/packages\/[a-f0-9]{64}\/listing$/.test(url.pathname)){let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>10000)throw Error('plr-request-too-large');}const parts=url.pathname.split('/');return reply(res,200,await listing.build(parts[2],parts[4],body?JSON.parse(body):{}));}
   if(req.method==='GET'&&/^\/runs\/[a-f0-9-]{36}\/packages\/[a-f0-9]{64}\/listings\/[a-f0-9]{64}\/(listing-cover\.jpg|listing\.md|listing\.json)$/.test(url.pathname)){const parts=url.pathname.split('/'),artifact=await listing.artifact(parts[2],parts[4],parts[6],parts[7]);res.writeHead(200,{'Content-Type':artifact.mime,'Content-Length':artifact.bytes,'Cache-Control':'no-store',...(parts[7]==='listing.md'?{'Content-Disposition':'attachment; filename="listing.md"'}:{})});createReadStream(artifact.file).pipe(res);return;}
   if(req.method==='GET'&&/^\/runs\/[a-f0-9-]{36}\/packages\/[a-f0-9]{64}\/[a-z0-9_.-]+$/.test(url.pathname)){const parts=url.pathname.split('/'),artifact=await packager.artifact(parts[2],parts[4],parts[5]);res.writeHead(200,{'Content-Type':artifact.mime,'Content-Length':artifact.bytes,'Cache-Control':'no-store',...(artifact.mime==='application/zip'?{'Content-Disposition':'attachment; filename="'+parts[5]+'"'}:{})});const stream=createReadStream(artifact.file);stream.on('error',()=>res.destroy());stream.pipe(res);return;}
   if(req.method==='GET'&&url.pathname==='/image-dream/capabilities')return reply(res,200,await preflight.capabilities());
   if(req.method==='GET'&&/^\/runs\/[a-f0-9-]{36}\/processing$/.test(url.pathname))return reply(res,200,processor.read(url.pathname.split('/')[2]));
   if(req.method==='POST'&&/^\/runs\/[a-f0-9-]{36}\/process$/.test(url.pathname)){if(dispatcher.isBusy()||preflight.isBusy()||quality.isBusy()||packager.isBusy())throw Error('plr-executor-busy');return reply(res,200,await processor.process(url.pathname.split('/')[2]));}
   if(req.method==='GET'&&url.pathname==='/runs')return reply(res,200,{runs:store.list().filter(run=>store.getState(run.id).run.preset.studio!=='text-to-image-landscape')});
   if(req.method==='GET'&&/^\/runs\/[a-f0-9-]{36}\/items\/[a-f0-9-]{36}\/(source|master|preview|alpha-preview)$/.test(url.pathname)){
    const parts=url.pathname.split('/'),id=parts[2],itemId=parts[4],row=store.executionItem(id,itemId),kind=parts[5],processing=kind==='source'?null:processor.readItem(id,itemId),artifact=kind==='source'?row.attempts.at(-1)?.artifact:processing?.[kind==='alpha-preview'?'alphaPreview':kind];
    if(!artifact)throw Error('plr-source-not-downloaded');const file=realpathSync(artifact.file),folder=realpathSync(store.artifactDirectory(id,itemId)),relative=path.relative(folder,file);
    if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw Error('plr-artifact-path-invalid');
    const bytes=readFileSync(file);if((artifact.bytes!==undefined&&bytes.length!==artifact.bytes)||createHash('sha256').update(bytes).digest('hex')!==artifact.sha256)throw Error('plr-artifact-changed');
    const mime={'.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'}[path.extname(file)];if(!mime)throw Error('plr-artifact-format-invalid');
    res.writeHead(200,{'Content-Type':mime,'Content-Length':bytes.length,'Cache-Control':'no-store',...(url.searchParams.get('download')==='1'?{'Content-Disposition':'attachment; filename="landscape-'+String(row.ordinal).padStart(4,'0')+path.extname(file)+'"'}:{})});res.end(bytes);return;
   }
   if(req.method==='GET'&&/^\/runs\/[a-f0-9-]{36}$/.test(url.pathname))return reply(res,200,{...store.get(url.pathname.split('/')[2],{offset:Number(url.searchParams.get('offset')??0),limit:Number(url.searchParams.get('limit')??50)}),executorBusy:dispatcher.isBusy()||processor.isBusy()||quality.isBusy()||packager.isBusy()||workflow.isBusy()});
   if(req.method==='POST'&&/^\/runs\/[a-f0-9-]{36}\/preflight$/.test(url.pathname)){if(dispatcher.isBusy()||processor.isBusy()||quality.isBusy()||packager.isBusy())throw Error('plr-executor-busy');return reply(res,200,await preflight.quote(url.pathname.split('/')[2]));}
   if(req.method==='POST'&&/^\/runs\/[a-f0-9-]{36}\/(start|resume|pause|reconcile)$/.test(url.pathname)){
    const parts=url.pathname.split('/'),id=parts[2],action=parts[3];
    if(preflight.isBusy()||processor.isBusy()||quality.isBusy()||packager.isBusy())throw Error('plr-preflight-busy');
    return reply(res,200,action==='pause'?dispatcher.pause(id):action==='reconcile'?await dispatcher.reconcile(id):dispatcher.start(id));
   }
   if(req.method==='POST'&&url.pathname==='/runs'){
    let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>6000000){reply(res,413,{error:'plr-import-too-large'});return;}chunks.push(chunk);}
    const run=store.create(JSON.parse(Buffer.concat(chunks).toString('utf8')));return reply(res,201,{id:run.id,title:run.title,totalRows:run.itemIds.length,selectedRows:run.selectedRows});
   }
   return reply(res,404,{error:'plr-route-not-found'});
  }catch(e){return reply(res,e.code==='ENOENT'?404:400,{error:e instanceof SyntaxError?'plr-invalid-json':e.message});}
 });
 server.requestTimeout=30000;server.headersTimeout=10000;
 return {server,isBusy:()=>preflight.isBusy()||dispatcher.isBusy()||processor.isBusy()||quality.isBusy()||packager.isBusy()||listing.isBusy()||workflow.isBusy()||landscapeQuality.isBusy?.()||landscapeExporter.isBusy?.(),listen:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server.address()));}),close:()=>new Promise(resolve=>{landscapeQuality.dispose();landscapeExporter.dispose();workflow.dispose();dispatcher.dispose();processor.dispose();quality.dispose();packager.dispose();server.closeAllConnections();server.close(resolve);})};
}
