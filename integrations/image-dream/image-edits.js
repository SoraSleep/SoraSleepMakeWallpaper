const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const {Worker}=require('node:worker_threads');
function sourceFile(root,name){
 if(typeof name!=='string'||path.basename(name)!==name||name.includes('..')||! /\.(png|jpe?g|webp)$/i.test(name))throw new Error('Tên ảnh không hợp lệ.');
 const file=fs.realpathSync(path.join(root,name));const relative=path.relative(fs.realpathSync(root),file);
 if(relative.startsWith('..')||path.isAbsolute(relative)||!fs.statSync(file).isFile()||fs.statSync(file).size>30*1024*1024)throw new Error('Ảnh không thuộc kho hoặc quá 30MB.');return file;
}
function processImage(file,rect,options={},timeout=60000){if(typeof options==='number'){timeout=options;options={};}return new Promise((resolve,reject)=>{
 const directory=__dirname.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
 const worker=new Worker(path.join(directory,'image-edit-worker.js'),{workerData:{file,rect,method:options.method,radius:options.radius}});let settled=false;
 const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);worker.terminate();error?reject(error):resolve(result);};
 const timer=setTimeout(()=>finish(new Error('Chỉnh ảnh quá thời gian; ảnh gốc không bị thay đổi.')),timeout);
 worker.on('message',message=>message.ok?finish(null,message):finish(new Error(message.error)));worker.on('error',e=>finish(e));worker.on('exit',()=>{if(!settled)finish(new Error('Worker dừng trước khi có kết quả.'));});
});}
function registerImageEdits(app,{downloads,exports,loadMeta,saveMeta}){
 const jobs=new Map();let busy=false;
 app.use('/api/image-edits',(req,res,next)=>{
  const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  let sameOrigin=true;try{if(req.headers.origin)sameOrigin=new URL(req.headers.origin).host===req.headers.host;}catch{sameOrigin=false;}
  if(!local||!sameOrigin)return res.status(403).json({error:'Chỉnh ảnh chỉ cho phép giao diện local cùng nguồn.'});next();
 });
 app.get('/api/image-edits/status',(_req,res)=>res.json({available:true,engine:'opencv',methods:['ns','telea'],defaultMethod:'ns',radius:[1,7],aiModel:false,busy,maxMaskArea:.05,retainsAIProvenance:true}));
 app.post('/api/image-edits/preview',async(req,res)=>{
  if(busy)return res.status(409).json({error:'Đang xử lý ảnh khác.'});
  if(req.body.confirmRights!==true)return res.status(400).json({error:'Cần xác nhận quyền chỉnh sửa ảnh.'});
  busy=true;
  try{
   const file=sourceFile(downloads,req.body.fileName);const rect=req.body.rect;const method=req.body.method==='telea'?'telea':'ns';const radius=Number.isFinite(req.body.radius)?Math.max(1,Math.min(7,Math.round(req.body.radius))):3;
   if(!rect||!['x','y','width','height'].every(k=>Number.isInteger(rect[k])))throw new Error('Vùng chọn không hợp lệ.');
   for(const [id,job] of jobs)if(job.expires<Date.now()){fs.rmSync(job.preview,{force:true});jobs.delete(id);}
   if(jobs.size>=10)throw new Error('Có quá nhiều bản xem trước; thử lại sau 10 phút.');
   const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');const result=await processImage(file,rect,{method,radius});
   const id=crypto.randomUUID();const dir=path.join(exports,'ImageEdits');fs.mkdirSync(dir,{recursive:true});const preview=path.join(dir,`${id}.png`);fs.writeFileSync(preview,Buffer.from(result.png));
   jobs.set(id,{preview,source:req.body.fileName,sourceHash:hash,rect,method,radius,width:result.width,height:result.height,expires:Date.now()+600000});
   res.json({id,url:`/api/image-edits/${id}/preview`,width:result.width,height:result.height,engine:`opencv-${method}`,method,radius,warning:'Chỉ chỉnh vùng nhìn thấy; ảnh vẫn có nguồn gốc AI. Kiểm tra chất lượng trước khi lưu.'});
  }catch(e){res.status(400).json({error:e.message});}finally{busy=false;}
 });
 app.get('/api/image-edits/:id/preview',(req,res)=>{const job=jobs.get(req.params.id);if(!job||job.expires<Date.now())return res.status(404).json({error:'Bản xem trước hết hạn.'});res.sendFile(job.preview);});
 app.post('/api/image-edits/:id/save',(req,res)=>{
  const job=jobs.get(req.params.id);if(!job||job.expires<Date.now())return res.status(404).json({error:'Bản xem trước hết hạn.'});
  if(req.body.confirmRights!==true||req.body.reviewed!==true)return res.status(400).json({error:'Cần xác nhận quyền chỉnh sửa và đã xem kết quả.'});
  try{
   const source=sourceFile(downloads,job.source);if(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')!==job.sourceHash)throw new Error('Ảnh nguồn đã thay đổi; hãy xem trước lại.');
   if(job.saved)return res.json({ok:true,fileName:job.saved,reused:true});
   const fileName=`edited_${path.parse(job.source).name.slice(0,65)}_${req.params.id}.png`;const destination=path.join(downloads,fileName);
   fs.copyFileSync(job.preview,destination+'.pending',fs.constants.COPYFILE_EXCL);fs.renameSync(destination+'.pending',destination);
   const meta=loadMeta();meta[fileName]={...meta[job.source],fileName,width:job.width,height:job.height,aspectRatio:meta[job.source]?.aspectRatio||(job.width===job.height?'1:1':`${job.width}:${job.height}`),downloadSource:'local_edit',aiGenerated:true,rightsStatus:'unreviewed',
    sourceAssetId:job.source,sourceHash:job.sourceHash,editOperation:'region-inpaint',editEngine:`opencv-${job.method}`,editMethod:job.method,editRadius:job.radius,editMask:job.rect,editedAt:Date.now(),watermarkStatus:'user-reviewed-visible-region',commercialRightsVerified:false};
   try{saveMeta(meta);}catch(e){fs.rmSync(destination,{force:true});throw e;}
   job.saved=fileName;res.json({ok:true,fileName});
  }catch(e){res.status(400).json({error:e.message});}
 });
 return {isBusy:()=>busy};
}
module.exports={registerImageEdits,sourceFile,processImage};
