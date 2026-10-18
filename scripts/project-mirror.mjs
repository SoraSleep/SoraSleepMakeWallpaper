import fs from 'node:fs';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';
export function projectMirror(root){
 const reply=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 return async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1'),match=url.pathname.match(/^\/bridge\/(projects|exports)\/([A-Za-z0-9-]{8,80})(?:\/(desktop-web|mobile-bundle))?$/);if(!match)return false;
  const origin=req.headers.origin;if(req.method!=='PUT'||req.headers['x-sorasleep-bridge']!=='1'||(origin&&origin!=='http://'+req.headers.host)){reply(res,403,{error:'local-origin-required'});return true;}
  const [,kind,id,target]=match;if((kind==='exports'&&!target)||(kind==='projects'&&target)){reply(res,400,{error:'mirror-route-invalid'});return true;}
  let temp;try{let size=0;const chunks=[],limit=kind==='projects'?256*1024*1024:1024*1024*1024;for await(const bytes of req){size+=bytes.length;if(size>limit)throw Error('mirror-payload-too-large');chunks.push(bytes);}const bytes=Buffer.concat(chunks);if(kind==='projects'){const project=JSON.parse(bytes.toString('utf8'));if(project.id!==id||![1,2].includes(project.schemaVersion))throw Error('mirror-project-invalid');}else if(bytes.length<4||bytes[0]!==80||bytes[1]!==75)throw Error('mirror-zip-invalid');
   fs.mkdirSync(root,{recursive:true});const file=path.join(root,id+(target?'-'+target:'')+(kind==='projects'?'.json':'.zip'));if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink())throw Error('mirror-symlink-denied');temp=file+'.'+randomUUID()+'.part';fs.writeFileSync(temp,bytes,{flag:'wx'});fs.renameSync(temp,file);temp=null;reply(res,200,{ok:true,bytes:size,sha256:createHash('sha256').update(bytes).digest('hex')});
  }catch(error){reply(res,400,{error:error.message});}finally{if(temp&&fs.existsSync(temp))fs.unlinkSync(temp);}return true;
 };
}
