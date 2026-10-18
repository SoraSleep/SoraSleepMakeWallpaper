import { useRef, useState, useEffect } from 'react';
import { ArtworkPairReview } from './ArtworkPairReview';

type Plan = {
  schemaVersion: number; plannerVersion: string; presetId: string | null; aspectRatio: string; workflowType?: string; requiresB?: boolean; concept?: Record<string,string>; collectionId?:string|null; exportProfile?:string;
  planId?: string; revision?: number; sourcePrompt?: string; planCopyReviewed?: boolean;
  imageA: { prompt: string }; imageB: { prompt: string | null; change?: string }; protectedRegions: string[]; blockers: string[];
};
export function ArtworkPlanPage({ onBack }: { onBack: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [workflow,setWorkflow]=useState('pair-reveal');
  const requiresB=!['landscape','stock'].includes(workflow);
  const [change, setChange] = useState('');
  const [preset, setPreset] = useState('portal-reveal');
  const workflowFields={workflowType:workflow,presetId:requiresB?preset:null,variantChange:requiresB?change:''};
  const [aspect, setAspect] = useState('9:16');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [saved, setSaved] = useState<Plan[]>([]);
  const [notice, setNotice] = useState('');
  const [identity, setIdentity] = useState<{ planId: string; revision: number } | null>(null);
  const [model, setModel] = useState('');
  const [resolution, setResolution] = useState('2k');
  const [generation, setGeneration] = useState<{id:string;status:string;assets?:unknown[];error?:string}|null>(null);
  const generationRequest=async(refresh=false)=>{
    if(!plan?.planId||!plan.revision)return;
    setBusy(true);setError('');
    try{
      const response=await fetch(refresh?'/image-dream/refresh':'/image-dream/generate-a',{method:'POST',headers:{'Content-Type':'application/json','X-SoraSleep-Bridge':'1'},body:JSON.stringify(refresh?{id:generation?.id}:{planId:plan.planId,revision:plan.revision,model,resolution})});
      const result=await response.json();if(!response.ok)throw new Error(result.error);setGeneration(result);setNotice(`Ảnh A: ${result.status}. ${requiresB?'B theo mask chưa được provider xác minh.':'Ảnh cần duyệt chất lượng trước khi xuất.'}`);
    }catch(e){setError(e instanceof Error?e.message:'Image Dream chưa kết nối.');}finally{setBusy(false);}
  };
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { const abort = new AbortController(); fetch('/artwork-plans', { signal: abort.signal }).then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(result => {
    setSaved(result.plans);
    const requested=new URLSearchParams(window.location.search).get('planId');
    if(requested){const item=(result.plans as Plan[]).filter(p=>p.planId===requested).sort((a,b)=>(b.revision??0)-(a.revision??0))[0];
      if(item){setPrompt(item.sourcePrompt??'');setChange(item.imageB.change??'');setPreset(item.presetId??'portal-reveal');setWorkflow(item.workflowType??'pair-reveal');setAspect(item.aspectRatio);setPlan(item);setReviewed(item.planCopyReviewed===true);setIdentity({planId:item.planId!,revision:item.revision!});setNotice('Đã nhận kế hoạch từ Image Dream. Hãy duyệt trước khi tiếp tục.');}
      else setNotice('Không tìm thấy kế hoạch được yêu cầu.');
    }
  }).catch(() => { if (!abort.signal.aborted) setNotice('Chưa tải được lịch sử kế hoạch.'); }); return () => abort.abort(); }, []);
  const save = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/artwork-plans', { method:'POST', headers:{'Content-Type':'application/json','X-SoraSleep-Bridge':'1'}, body:JSON.stringify({prompt,...workflowFields,aspectRatio:aspect,planCopyReviewed:reviewed,planId:identity?.planId,baseRevision:identity?.revision}) });
      if (!response.ok) throw new Error(response.status===409?'Kế hoạch đã có revision mới. Mở bản mới nhất trước khi lưu.':'Không lưu được kế hoạch.');
      const result = await response.json(); setPlan(result); setIdentity({planId:result.planId,revision:result.revision}); setSaved(current => [result,...current]); setNotice(`Đã lưu revision ${result.revision}. Chưa tạo ảnh.`);
    } catch(reason){setError(reason instanceof Error?reason.message:'Lưu thất bại.');} finally {setBusy(false);}
  };
  const invalidate = () => { controller.current?.abort(); setBusy(false); setPlan(null); setGeneration(null); setReviewed(false); setError(''); };
  const generate = async () => {
    const current = new AbortController(); controller.current?.abort(); controller.current = current;
    setBusy(true); setError(''); setPlan(null); setReviewed(false);
    try {
      const response = await fetch('/artwork-plan', { method: 'POST', signal: current.signal,
        headers: { 'Content-Type': 'application/json', 'X-SoraSleep-Bridge': '1' },
        body: JSON.stringify({ prompt, ...workflowFields, aspectRatio: aspect }) });
      if (!response.ok) throw new Error(`Không lập được kế hoạch (HTTP ${response.status}).`);
      const result = await response.json();
      if (!current.signal.aborted) setPlan(result);
    } catch (reason) { if (!current.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không kết nối được planner.'); }
    finally { if (!current.signal.aborted) setBusy(false); }
  };
  const download = () => {
    const blob = new Blob([JSON.stringify({ ...plan, planCopyReviewed: reviewed, generationAllowed: false }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'sfw-artwork-plan.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <main className="hub-page"><header className="hub-topbar"><button className="secondary-button" onClick={onBack}>← Projects</button><b>Image Dream → MakeWallpaper</b></header>
    <section className="hub-content"><div className="hub-heading"><span>SFW · ARTWORK PLAN</span><h1>Từ ý tưởng đến kế hoạch wallpaper</h1><p>Chọn workflow phù hợp trước khi lập kế hoạch. Bước này chưa tạo ảnh hoặc sử dụng credits.</p></div>
      <form className="art-plan-form" onSubmit={event => { event.preventDefault(); void generate(); }}>
        <label>Workflow<select aria-label="Workflow" value={workflow} onChange={event=>{invalidate();setWorkflow(event.target.value);setChange('');}}><option value="pair-reveal">A/B Reveal · dự án hiện có</option><option value="landscape">Landscape Collection · phong cảnh</option><option value="stock">Stock Collection · ảnh tĩnh</option><option value="character-wardrobe">Character Wardrobe · nhân vật trưởng thành SFW</option></select></label><label>Prompt artwork<textarea aria-label="Prompt artwork" required maxLength={8000} rows={5} value={prompt} onChange={event => { invalidate(); setPrompt(event.target.value); }} placeholder="Quán cà phê bên hồ ban đêm, ánh sáng ấm…" /></label>
        {requiresB&&<><label>Ảnh B cần thay đổi điều gì?<textarea required maxLength={2000} rows={3} value={change} onChange={event => { invalidate(); setChange(event.target.value); }} placeholder="Chỉ làm hoa và đèn phát sáng; giữ nguyên kiến trúc và bố cục." /></label>
        <label>Reveal Studio · Chế độ<select aria-label="Preset" value={preset} onChange={event => { invalidate(); setPreset(event.target.value); }}><option value="portal-reveal">Portal Reveal · Window reveal</option><option value="difference-lens">Difference Lens · Zoom reveal</option></select></label></>}
        <label>Tỷ lệ artwork<select value={aspect} onChange={event => { invalidate(); setAspect(event.target.value); }}><option value="9:16">9:16 · Điện thoại</option><option value="16:9">16:9 · Desktop</option></select></label>
        <button className="primary-button" disabled={busy || !prompt.trim() || (requiresB&&!change.trim())}>{busy ? 'Đang lập kế hoạch…' : 'Lập kế hoạch'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <p role="status">{notice}</p>
      {plan && <button className="primary-button" disabled={busy} onClick={() => void save()}>Lưu revision kế hoạch</button>}
      <section aria-label="Lịch sử kế hoạch"><h2>Kế hoạch đã lưu</h2><button className="secondary-button" onClick={() => { invalidate(); setIdentity(null); setNotice('Đang soạn kế hoạch mới.'); }}>Tạo kế hoạch độc lập</button>{saved.map(item => <button className="preset-callout" key={`${item.planId}-${item.revision}`} onClick={() => { invalidate(); setPrompt(item.sourcePrompt ?? ''); setChange(item.imageB.prompt ? (item as Plan & { imageB: { change?: string } }).imageB.change ?? '' : ''); setPreset(item.presetId??'portal-reveal');setWorkflow(item.workflowType??'pair-reveal'); setAspect(item.aspectRatio); setPlan(item); setReviewed(item.planCopyReviewed === true); setIdentity({planId:item.planId!,revision:item.revision!}); setNotice(`Đang mở revision ${item.revision}.`); }}>Revision {item.revision} · {item.sourcePrompt?.slice(0,100)}</button>)}</section>
      {plan && <section className="art-plan-result" aria-label="Kế hoạch artwork"><h2>Kế hoạch chờ duyệt</h2><p>Template hỗ trợ soạn chỉ dẫn; chưa phân tích nội dung ảnh hoặc xác định vùng chỉnh sửa.</p><h3>Ảnh A</h3><p>{plan.imageA.prompt}</p>{requiresB&&<><h3>Chỉnh sửa A thành B</h3><p>{plan.imageB.prompt}</p></>}<h3>Vùng bảo vệ</h3><ul>{plan.protectedRegions.map(region => <li key={region}>{region}</li>)}</ul><h3>Còn cần thực hiện</h3><ul>{plan.blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul><label><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /> Tôi đã đọc và duyệt nội dung chỉ dẫn này.</label><p>{requiresB?'Mask và chất lượng cặp ảnh cần kiểm tra riêng.':'Chất lượng ảnh và điều kiện xuất theo kênh cần kiểm tra riêng.'} SFW và quyền sử dụng chưa được xác minh tự động.</p><button className="secondary-button" onClick={download}>Tải kế hoạch JSON</button></section>}
      {requiresB&&<ArtworkPairReview />}
      <section className="art-plan-result"><h2>Tạo ảnh A qua Image Dream</h2><p>Chỉ gửi revision đã lưu và duyệt. Thao tác này có thể sử dụng credits của Image Dream. {requiresB?'B chưa được tạo tự động.':'Workflow này không cần ảnh B.'} Trạng thái chưa chắc chắn không tự gửi lại.</p><label>Model ID từ Image Dream<input value={model} onChange={e=>setModel(e.target.value)}/></label><label>Resolution<select value={resolution} onChange={e=>setResolution(e.target.value)}><option>2k</option><option>1k</option></select></label><button className="primary-button" disabled={busy||!plan?.planId||!plan.planCopyReviewed||!model.trim()} onClick={()=>void generationRequest()}>Gửi tạo A bằng revision đã lưu</button>{generation&&<><p>{generation.status} {generation.error}</p><button className="secondary-button" disabled={busy} onClick={()=>void generationRequest(true)}>Kiểm tra kết quả A</button><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(generation.assets??[],null,2)}</pre></>}</section>
    </section></main>;
}
