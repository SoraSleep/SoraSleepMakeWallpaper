export type PromptRow = { id:string; prompt:string; title:string; group:string };
export function readPromptText(text:string,format:'txt'|'csv'):PromptRow[]{
 if(new TextEncoder().encode(text).length>5_000_000)throw Error('File tối đa 5 MB.');
 text=text.replace(/^\uFEFF/,'');let rows:{prompt:string;title:string;group:string}[];
 if(format==='txt')rows=text.split(/\r?\n/).filter(line=>line.trim()).map(prompt=>({prompt,title:'',group:''}));
 else{
  const records:string[][]=[];let record:string[]=[],field='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
   if(c==='"'){if(field||closed)throw Error('CSV sai dấu ngoặc kép.');quoted=true;continue;}
   if(c===','||c==='\n'||c==='\r'){record.push(field);field='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(record.some(v=>v.trim()))records.push(record);record=[];}continue;}
   if(closed){if(c===' '||c==='\t')continue;throw Error('CSV có ký tự sau dấu ngoặc kép.');}field+=c;
  }
  if(quoted)throw Error('CSV chưa đóng dấu ngoặc kép.');record.push(field);if(record.some(v=>v.trim()))records.push(record);
  const header=(records.shift()??[]).map(v=>v.trim().toLowerCase());if(header.filter(v=>v==='prompt').length!==1)throw Error('CSV cần đúng một cột prompt; title và group là tùy chọn.');
  if(new Set(header).size!==header.length)throw Error('CSV trùng tên cột.');const at=(r:string[],key:string)=>header.includes(key)?r[header.indexOf(key)]:'';
  rows=records.map(r=>{if(r.length!==header.length)throw Error('CSV sai số cột.');return {prompt:at(r,'prompt'),title:at(r,'title'),group:at(r,'group')};});
 }
 if(!rows.length||rows.length>5000)throw Error('Danh sách cần 1–5.000 prompt.');
 if(rows.some(r=>!r.prompt.trim()||r.prompt.length>8000||r.title.length>160||r.group.length>160))throw Error('Prompt rỗng hoặc quá dài (8.000 ký tự); title/group tối đa 160 ký tự.');
 return rows.map((r,i)=>({...r,id:`prompt-${i+1}`}));
}
export function duplicateRows(rows:PromptRow[]){const seen=new Map<string,number>();return rows.map((row,i)=>{const k=row.prompt.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();const prior=seen.get(k);if(prior===undefined)seen.set(k,i+1);return prior??null;});}
export function promptBatches(rows:PromptRow[],skipDuplicates:boolean){const duplicates=duplicateRows(rows),selected=rows.filter((_,i)=>!skipDuplicates||duplicates[i]===null);return Array.from({length:Math.ceil(selected.length/100)},(_,i)=>({index:i+1,rows:selected.slice(i*100,i*100+100)}));}
