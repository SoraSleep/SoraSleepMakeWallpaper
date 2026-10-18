import {createReadStream,createWriteStream,readFileSync,existsSync,realpathSync,statSync,readdirSync,mkdirSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {once} from 'node:events';import {finished} from 'node:stream/promises';import {createHash,randomUUID} from 'node:crypto';import path from 'node:path';
const table=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const overhead=name=>92+2*Buffer.byteLength(name);
export function splitZipFiles(files,{maxBytes,maxParts=100}){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1024||maxBytes>1000000000||!Number.isInteger(maxParts)||maxParts<1||maxParts>100)throw new Error('zip-invalid-limits');
 const common=files.filter(f=>f.shared),images=files.filter(f=>!f.shared),base=22+common.reduce((n,f)=>n+f.bytes+overhead(f.name),0);
 if(base>=maxBytes)throw new Error('zip-shared-documents-exceed-limit');const groups=[];
 for(const file of [...images].sort((a,b)=>b.bytes-a.bytes||a.name.localeCompare(b.name))){const cost=file.bytes+overhead(file.name);if(base+cost>maxBytes)throw new Error('zip-single-file-exceeds-limit:'+file.name);let group=groups.find(g=>g.bytes+cost<=maxBytes);if(!group){group={bytes:base,files:[...common]};groups.push(group);}group.bytes+=cost;group.files.push(file);}
 if(!groups.length)groups.push({bytes:base,files:common});if(groups.length>maxParts)throw new Error('zip-too-many-parts:'+groups.length);return groups;
}
export async function writeStoredZip(target,files){
 const output=createWriteStream(target,{flags:'wx',highWaterMark:65536}),completion=finished(output);completion.catch(()=>{});let streamError;output.on('error',e=>{streamError=e;});let offset=0;const central=[],archiveHash=createHash('sha256');
 async function write(buffer){if(streamError)throw streamError;archiveHash.update(buffer);offset+=buffer.length;if(!output.write(buffer))await once(output,'drain');}
 try{
  for(const file of files){
   if(!/^[a-zA-Z0-9_./-]+$/.test(file.name)||file.name.includes('..')||file.name.startsWith('/')||file.name.includes('\\'))throw new Error('zip-invalid-entry-name');
   const name=Buffer.from(file.name),start=offset,header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x0808,6);header.writeUInt16LE(33,12);header.writeUInt16LE(name.length,26);await write(header);await write(name);
   let crc=0xffffffff,size=0;const hash=createHash('sha256');
   for await(const bytes of createReadStream(file.path,{highWaterMark:65536})){size+=bytes.length;if(size>file.bytes)throw new Error('zip-source-size-changed');hash.update(bytes);for(const byte of bytes)crc=table[(crc^byte)&255]^(crc>>>8);await write(bytes);}
   crc=(crc^0xffffffff)>>>0;if(size!==file.bytes||hash.digest('hex')!==file.sha256)throw new Error('zip-source-hash-changed');
   const descriptor=Buffer.alloc(16);descriptor.writeUInt32LE(0x08074b50);descriptor.writeUInt32LE(crc,4);descriptor.writeUInt32LE(size,8);descriptor.writeUInt32LE(size,12);await write(descriptor);
   const directory=Buffer.alloc(46);directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(0x0808,8);directory.writeUInt16LE(33,14);directory.writeUInt32LE(crc,16);directory.writeUInt32LE(size,20);directory.writeUInt32LE(size,24);directory.writeUInt16LE(name.length,28);directory.writeUInt32LE(start,42);central.push(directory,name);
  }
  const directoryStart=offset;for(const buffer of central)await write(buffer);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(offset-directoryStart,12);end.writeUInt32LE(directoryStart,16);await write(end);output.end();await completion;return{bytes:offset,sha256:archiveHash.digest('hex')};
 }catch(error){output.destroy();await completion.catch(()=>{});throw error;}
}
export async function archiveWallpaperPack({folder,delivery='zip',maxPartBytes=100000000}){
 const sourceRoot=realpathSync(folder),files=[];
 async function walk(directory,prefix=''){for(const entry of readdirSync(directory,{withFileTypes:true})){const full=path.join(directory,entry.name),name=prefix+entry.name;if(entry.isSymbolicLink())throw new Error('zip-symlink-not-allowed');if(entry.isDirectory()){await walk(full,name+'/');continue;}const actual=realpathSync(full),relative=path.relative(sourceRoot,actual);if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('zip-source-outside-pack');const hash=createHash('sha256');for await(const bytes of createReadStream(actual))hash.update(bytes);files.push({name,path:actual,bytes:statSync(actual).size,sha256:hash.digest('hex'),shared:!name.startsWith('images/')&&!name.startsWith('review/')});}}
 if(!['zip','etsy','custom'].includes(delivery))throw new Error('zip-invalid-delivery');await walk(sourceRoot);
 if(existsSync(path.join(sourceRoot,'checksums.sha256'))){const declared=new Map();for(const line of readFileSync(path.join(sourceRoot,'checksums.sha256'),'utf8').trim().split(/\r?\n/)){const match=/^([a-f0-9]{64})  (.+)$/.exec(line);if(!match||declared.has(match[2]))throw new Error('zip-invalid-source-checksums');declared.set(match[2],match[1]);}const payload=files.filter(f=>f.name!=='checksums.sha256');if(declared.size!==payload.length||payload.some(f=>declared.get(f.name)!==f.sha256))throw new Error('zip-source-pack-checksum-mismatch');}
 const maxBytes=delivery==='etsy'?20000000:maxPartBytes,maxParts=delivery==='etsy'?5:100,groups=splitZipFiles(files,{maxBytes,maxParts});
 const id=randomUUID(),staging=path.join(path.dirname(sourceRoot),id+'.zip-part'),destination=path.join(path.dirname(sourceRoot),id+'.archives');mkdirSync(staging);const archives=[];
 try{for(const [index,group] of groups.entries()){const file='wallpaper-'+String(index+1).padStart(2,'0')+'-of-'+String(groups.length).padStart(2,'0')+'.zip',result=await writeStoredZip(path.join(staging,file),group.files);if(result.bytes!==group.bytes||result.bytes>maxBytes)throw new Error('zip-output-limit-mismatch');archives.push({file,...result,entries:group.files.map(f=>({file:f.name,sha256:f.sha256,bytes:f.bytes}))});}
  const report={schemaVersion:1,delivery,maxBytes,maxParts,archives,method:'ZIP STORE, streaming 64 KiB; independent parts, shared metadata repeated; original image bytes unchanged',commercialReady:false,sourcePack:sourceRoot};writeFileSync(path.join(staging,'delivery.json'),JSON.stringify(report,null,2),{flag:'wx'});renameSync(staging,destination);return{folder:destination,manifestFile:path.join(destination,'delivery.json'),archives:archives.map(a=>({file:a.file,bytes:a.bytes,sha256:a.sha256})),commercialReady:false};
 }catch(error){if(path.relative(path.dirname(sourceRoot),staging)===id+'.zip-part')rmSync(staging,{recursive:true,force:true});throw error;}
}
