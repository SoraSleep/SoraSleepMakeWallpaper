import { createHash } from 'node:crypto';
import { strToU8, zipSync } from 'fflate';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const text = (value, field, max=2000) => {
  if(typeof value!=='string' || !value.trim() || value.length>max) throw new Error(`invalid-${field}`);
  if(/\[ARTIST|REPLACE BEFORE|YOUR NAME/i.test(value))throw new Error(`placeholder-${field}`);
  return value.trim();
};

/** Packages supplied artifacts without claiming that they have passed device QA. */
export function buildSalesBundle(input) {
  if(input?.schemaVersion!==1 || input.contentScope!=='sfw')throw new Error('invalid-sales-contract');
  const title=text(input.title,'title',160),seller=text(input.seller,'seller',160),support=text(input.support,'support',300);
  const sku=text(input.sku,'sku',80),version=text(input.version,'version',40);
  if(!/^[a-zA-Z0-9._-]+$/.test(sku+version))throw new Error('invalid-sku-version');
  const license=text(input.license,'license',20000),description=text(input.description,'description',10000);
  const disclosure=text(input.aiDisclosure,'ai-disclosure',2000);
  const files={},artifacts=[];
  if(!Array.isArray(input.artifacts)||!input.artifacts.length||input.artifacts.length>20)throw new Error('invalid-artifacts');
  let total=0;
  for(const asset of input.artifacts){
    if(!['Windows','Android','Static','Listing'].includes(asset.category)||!/^[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,100}$/.test(asset.name||'')||! /\.(zip|mp4|webm|jpg|png)$/i.test(asset.name)||typeof asset.base64!=='string')throw new Error('invalid-artifact-path');
    const bytes=Buffer.from(asset.base64,'base64');total+=bytes.length;
    if(!bytes.length||total>64*1024*1024||digest(bytes)!==asset.sha256)throw new Error('artifact-integrity-failed');
    const name=`${asset.category==='Listing'?'Listing':`Customer/${asset.category}`}/${asset.name}`;
    if(files[name])throw new Error('duplicate-artifact');files[name]=bytes;
    artifacts.push({path:name,bytes:bytes.length,sha256:asset.sha256,validation:'pending'});
  }
  const compatibility={Windows:artifacts.some(a=>a.path.startsWith('Customer/Windows/'))?'supplied-not-device-tested':'not-included',Android:artifacts.some(a=>a.path.startsWith('Customer/Android/'))?'supplied-not-device-tested':'not-included',iOS:'static-only-if-included'};
  files['Customer/README.txt']=strToU8(`${title}\nSeller: ${seller}\nSupport: ${support}\nVersion: ${version}\n\nWindows: interactive packages require a compatible wallpaper host. Extract the supplied ZIP and follow its instructions.\nAndroid: use a video-wallpaper application supporting the included codec. Lock-screen support varies by device.\niPhone/iPad: static images only; MP4 is not a Live Photo wallpaper.\n\nReview/device testing is pending.\n`);
  files['Customer/LICENSE.txt']=strToU8(license);
  files['Customer/CHANGELOG.txt']=strToU8(`${version}\nPrepared for review. SKU: ${sku}\n`);
  files['Listing/description.txt']=strToU8(`${title}\n\n${description}\n\nAI disclosure: ${disclosure}\n\nIncluded files:\n${artifacts.filter(a=>a.path.startsWith('Customer/')).map(a=>a.path).join('\n')}\n\nSupport: ${support}\nCompatibility: ${JSON.stringify(compatibility)}\n`);
  files['Listing/tags.txt']=strToU8(Array.isArray(input.tags)?input.tags.filter(t=>typeof t==='string').slice(0,30).join(', '):'');
  const report={schemaVersion:1,sku,version,title,status:'needs_review',commercialReady:false,compatibility,artifacts,checks:{checksums:'passed',decode:'pending',pixelParity:'pending',loop:'pending',deviceInstallation:'pending',rights:'unreviewed',sfw:'unreviewed'},missingMarketing:['cover','contact-sheet','watermarked-teaser','device-mockup'].filter(role=>!input.artifacts.some(a=>a.role===role)),createdAt:new Date().toISOString()};
  files['QA/report.json']=strToU8(JSON.stringify(report,null,2));
  files['Customer/sha256.json']=strToU8(JSON.stringify(Object.fromEntries(Object.entries(files).filter(([n])=>n.startsWith('Customer/')).map(([n,b])=>[n,digest(b)])),null,2));
  return {bytes:zipSync(files,{level:0}),fileName:`${sku}-${version}-review.zip`,report};
}
