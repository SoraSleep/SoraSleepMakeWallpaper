import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createProductStore } from '../product-store.mjs';
const root=path.resolve('real-test-output');
const products=createProductStore(path.join(root,'product-store'));
const outputs=[];
for(const preset of ['difference-lens','portal-reveal']){
 const video=path.join(root,preset+'.mp4');
 const generate=(name,args)=>{const target=path.join(root,`${preset}-${name}`);execFileSync('ffmpeg',['-y','-v','error',...args,target],{stdio:'pipe'});return target;};
 const cover=generate('cover.jpg',['-ss','1.5','-i',video,'-frames:v','1','-vf','scale=450:800,pad=1200:800:375:0:color=0x101722']);
 const sheet=generate('contact.jpg',['-i',video,'-vf','fps=1,scale=270:480,tile=3x1','-frames:v','1']);
 const mock=generate('mockup.jpg',['-ss','1.5','-i',video,'-frames:v','1','-vf','scale=324:576,pad=348:624:12:24:black,pad=1200:800:426:88:color=0x101722']);
 const teaser=generate('teaser.mp4',['-i',video,'-vf',"drawtext=text='SoraSleep PREVIEW':fontsize=24:fontcolor=white:box=1:boxcolor=black@0.5:x=(w-text_w)/2:y=h-70",'-an','-c:v','libx264','-pix_fmt','yuv420p']);
 const artifacts=[['Android',video],['Windows',path.join(root,preset+'.desktop.zip')],['Listing',cover,'cover'],['Listing',sheet,'contact-sheet'],['Listing',mock,'device-mockup'],['Listing',teaser,'watermarked-teaser']].map(([category,file,role])=>{const bytes=readFileSync(file);return {category,name:path.basename(file),role,base64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex')};});
 const item=products.save({schemaVersion:1,contentScope:'sfw',title:`${preset} technical review`,seller:'SoraSleep QA',support:'Internal review only',sku:`qa-${preset}`,version:'0.1-test',license:'Internal technical review only. Demo artwork rights are unreviewed. This bundle is not authorized for sale.',description:'Actual demo render and marketing previews for technical evaluation.',aiDisclosure:'Existing demo pair; generation provenance and rights require review.',artifacts});
 const result=products.download(item.id);writeFileSync(path.join(root,item.fileName),result.bytes);outputs.push(item);
 console.log('CREATED',item.fileName);
}
writeFileSync(path.join(root,'products-report.json'),JSON.stringify(outputs,null,2));
