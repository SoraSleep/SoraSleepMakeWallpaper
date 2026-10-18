import {useState} from 'react';
type Report={passed:number;flagged:number;items:Array<{ordinal:number;warnings:string[]}>};
const labels:Record<string,string>={'missing-source':'Chưa có ảnh','source-hash-mismatch':'Nguồn đã đổi','unreadable':'Không đọc được','duplicate':'Trùng hệt ảnh khác','aspect-ratio':'Sai tỷ lệ','metadata-mismatch':'Sai kích thước lưu trữ'};
export function BatchQualityPanel({runId}:{runId:string}){
 const [report,setReport]=useState<Report|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function inspect(){setBusy(true);setError('');try{const response=await fetch('http://127.0.0.1:17930/landscape-batches/'+runId+'/quality'),value=await response.json();if(!response.ok)throw Error(value.error);setReport(value);}catch(e){setError(String(e));}finally{setBusy(false);}}
 return <section aria-label="Landscape quality review"><button disabled={busy} className="secondary-button" onClick={()=>void inspect()}>{busy?'Đang kiểm tra ảnh…':'Kiểm tra chất lượng batch'}</button>{error&&<p role="alert">{error}</p>}{report&&<><p role="status">{report.passed} đạt kiểm tra kỹ thuật · {report.flagged} cần xem lại. Khi xuất ZIP, hệ thống kiểm tra lại phạm vi xuất.</p><ul>{report.items.filter(item=>item.warnings.length).map(item=><li key={item.ordinal}>Ảnh #{item.ordinal}: {item.warnings.map(w=>labels[w]??w).join(', ')}</li>)}</ul><p>Kiểm tra kỹ thuật chưa đánh giá bố cục, chi tiết hoặc watermark; cần xem ảnh trước khi bán.</p></>}</section>;
}
