import { useRef, useState } from 'react';
import { inspectPairPixels } from '../project/pairQuality';

type Slot = 'A' | 'B' | 'mask';
export function ArtworkPairReview() {
  const [files, setFiles] = useState<Partial<Record<Slot, File>>>({});
  const [status, setStatus] = useState('');
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const sequence = useRef(0);
  const check = async () => {
    const run = ++sequence.current; setStatus('Đang kiểm tra…'); setReport(null);
    const bitmaps: ImageBitmap[] = [];
    try {
      const hashes: Record<string,string> = {};
      for (const slot of ['A','B','mask'] as const) {
        const file = files[slot]; if (!file || file.size > 24*1024*1024 || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Chọn đủ A, B và mask raster, tối đa 24 MB/file.');
        bitmaps.push(await createImageBitmap(file));
        hashes[slot] = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))).map(v=>v.toString(16).padStart(2,'0')).join('');
      }
      const [a,b,m] = bitmaps;
      if (a.width!==b.width || a.height!==b.height || a.width!==m.width || a.height!==m.height) throw new Error('A/B/mask phải cùng kích thước. Căn chỉnh trước khi duyệt.');
      if (Math.min(a.width,a.height)<512 || Math.max(a.width,a.height)>8192) throw new Error('Artwork phải có cạnh ngắn ≥512 và cạnh dài ≤8192.');
      const width=Math.min(512,a.width),height=Math.max(1,Math.round(a.height*width/a.width));
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
      const read=(image:ImageBitmap)=>{ctx.clearRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);return ctx.getImageData(0,0,width,height).data;};
      const result=inspectPairPixels(read(a),read(b),read(m));
      const warnings=[];
      if(result.changedFraction<0.001)warnings.push('Khác biệt rất ít; cần kiểm tra hiệu ứng có đủ rõ.');
      if(result.protectedChangeFraction>0.01)warnings.push('Thay đổi ngoài vùng cho phép vượt 1%; cần sửa B hoặc duyệt lại mask.');
      if(run===sequence.current){setReport({schemaVersion:1,hashes,dimensions:{width:a.width,height:a.height},sample:{width,height},changedFraction:result.changedFraction,protectedChangeFraction:result.protectedChangeFraction,warnings,approval:'pending',sfw:'unreviewed',rights:'unreviewed',method:'pixel-difference-v1',limitations:'Không phát hiện lỗi mặt/tay, không xác minh SFW/quyền, không thay thế alignment hoặc duyệt hình ảnh.'});setStatus('Đã kiểm tra. Kết quả cần được duyệt bằng mắt.');}
    } catch(error){if(run===sequence.current)setStatus(error instanceof Error?error.message:'Kiểm tra thất bại.');}
    finally { bitmaps.forEach(bitmap=>bitmap.close()); }
  };
  const download=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='pair-quality-report.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  return <section className="art-plan-result"><h2>Kiểm tra artwork A/B và vùng chỉnh sửa</h2><p>Chọn B đã chỉnh từ A. Mask trắng cho phép đổi, đen bảo vệ; mask cùng kích thước artwork. Công cụ đo pixel, chưa phân tích nội dung.</p>{(['A','B','mask'] as const).map(slot=><label key={slot} style={{display:'block',marginBottom:16}}>Ảnh {slot}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{sequence.current++;setReport(null);setStatus('');setFiles(current=>({...current,[slot]:event.target.files?.[0]}));}} /></label>)}<button className="secondary-button" disabled={!files.A||!files.B||!files.mask} onClick={()=>void check()}>Kiểm tra cặp ảnh</button><p role="status">{status}</p>{report&&<><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(report,null,2)}</pre><button className="secondary-button" onClick={download}>Tải báo cáo kiểm tra</button></>}</section>;
}
