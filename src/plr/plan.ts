export type PlrSeries = { id: string; title: string; subject: string; count: number };
export type PlrPlan = {
  kind: 'sorasleep-plr-plan'; schemaVersion: 1; revision: number;
  title: string; concept: string; style: string; palette: string; exclusions: string;
  aspect: '9:16' | '16:9' | '1:1' | '4:5'; target: number;
  buyerUse: string; licenseNotes: string; series: PlrSeries[];
};
export function newPlrPlan(): PlrPlan {
  return {kind:'sorasleep-plr-plan',schemaVersion:1,revision:1,title:'Spring Sakura Collection',concept:'Mùa xuân, hoa đào và thiên nhiên thanh bình',style:'Original soft botanical illustration',palette:'Dusty pink, sage, warm ivory',exclusions:'No text, no logos, no signatures, no copyrighted characters',aspect:'9:16',target:500,buyerUse:'Ảnh nền, thiết kế và bộ tài nguyên sáng tạo',licenseNotes:'',series:[
    ['Hoa đào','Cherry blossom branches and botanical details'],['Vườn xuân','Quiet spring gardens with coherent architecture'],['Hồ nước','Spring lakes and natural reflections'],['Đồng cỏ','Spring meadows with original wildflower compositions'],['Làng quê','Fictional countryside scenes in spring'],['Lối đi','Garden paths and footbridges'],['Trà thất','Original small tea houses in spring landscapes'],['Mưa xuân','Spring scenery after rain'],['Nền tối giản','Minimal botanical backgrounds with generous copy space'],['Bình minh','Spring landscapes in soft dawn light'],
  ].map(([title,subject],i)=>({id:`series-${i+1}`,title,subject,count:50}))};
}
export function distribute(target: number, series: PlrSeries[]): PlrSeries[] {
  if(!Number.isInteger(target)||target<1||target>5000||!series.length||series.length>50||target<series.length)throw Error('Mục tiêu phải từ 1–5.000 và không nhỏ hơn số nhóm.');
  return series.map((s,i)=>({...s,count:Math.floor(target/series.length)+(i<target%series.length?1:0)}));
}
export function planIssues(plan: PlrPlan): string[] {
  const issues:string[]=[];
  if(!plan.title.trim())issues.push('Nhập tên bộ ảnh.');
  if(!plan.concept.trim())issues.push('Nhập concept.');
  if(!plan.style.trim())issues.push('Nhập phong cách chung.');
  if(!Number.isInteger(plan.target)||plan.target<1||plan.target>5000)issues.push('Số ảnh mục tiêu phải là số nguyên từ 1–5.000.');
  if(!plan.series.length||plan.series.length>50)issues.push('Cần từ 1–50 nhóm series.');
  if(plan.series.some(s=>!s.title.trim()||!s.subject.trim()||!Number.isInteger(s.count)||s.count<1||s.count>5000))issues.push('Mỗi nhóm cần tên, mô tả và số ảnh nguyên dương tối đa 5.000.');
  if(plan.series.reduce((n,s)=>n+s.count,0)!==plan.target)issues.push('Tổng số ảnh các nhóm phải bằng mục tiêu.');
  const normalized=plan.series.map(s=>s.subject.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase());
  if(new Set(normalized).size!==normalized.length)issues.push('Có nhóm trùng mô tả; hãy phân biệt chủ thể hoặc công dụng.');
  return issues;
}
export function previewPrompt(plan: PlrPlan, series: PlrSeries): string {
  return [series.subject,`Collection concept: ${plan.concept}`,`Visual style: ${plan.style}`,plan.palette&&`Palette: ${plan.palette}`,plan.buyerUse&&`Intended use: ${plan.buyerUse}`,plan.exclusions].filter(Boolean).join('. ');
}
// Strictly read known fields. Saved JSON is data, never generation instructions.
export function parsePlrPlan(input: unknown): PlrPlan {
  if(!input||typeof input!=='object')throw Error('Kế hoạch PLR không hợp lệ.');
  const v=input as Record<string,unknown>;
  if(v.kind!=='sorasleep-plr-plan'||v.schemaVersion!==1||!Number.isInteger(v.revision)||(v.revision as number)<1||!['9:16','16:9','1:1','4:5'].includes(v.aspect as string)||!Array.isArray(v.series)||v.series.length>50)throw Error('Sai định dạng hoặc phiên bản kế hoạch PLR.');
  const text=(value:unknown,max:number)=>{if(typeof value!=='string'||value.length>max)throw Error('Trường văn bản không hợp lệ hoặc quá dài.');return value;};
  const series=v.series.map((raw:unknown)=>{if(!raw||typeof raw!=='object')throw Error('Nhóm không hợp lệ.');const s=raw as Record<string,unknown>;if(typeof s.count!=='number'||!Number.isFinite(s.count))throw Error('Số ảnh nhóm không hợp lệ.');return {id:text(s.id,100),title:text(s.title,160),subject:text(s.subject,2000),count:s.count};});
  if(new Set(series.map(s=>s.id)).size!==series.length||series.some(s=>!s.id))throw Error('ID nhóm thiếu hoặc trùng.');
  if(typeof v.target!=='number'||!Number.isFinite(v.target))throw Error('Mục tiêu không hợp lệ.');
  return {kind:'sorasleep-plr-plan',schemaVersion:1,revision:v.revision as number,title:text(v.title,160),concept:text(v.concept,2000),style:text(v.style,2000),palette:text(v.palette,500),exclusions:text(v.exclusions,2000),aspect:v.aspect as PlrPlan['aspect'],target:v.target,buyerUse:text(v.buyerUse,1000),licenseNotes:text(v.licenseNotes,4000),series};
}
