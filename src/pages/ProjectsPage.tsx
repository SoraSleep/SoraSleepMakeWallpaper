import { FolderOpen, Layers3, Plus, Sparkles } from 'lucide-react';
import { getPreset, listDefaultPresets } from '../presets/registry';
import type { PresetId } from '../presets/types';
import type { MotionPairProject } from '../project/projectSchema';

type Props = {
  project: MotionPairProject;
  onContinue: () => void;
  onNew: () => void;
  onOpen: () => void;
  onPlan: () => void;
  onProducts: () => void;
  onPlr:()=>void;
  onLandscape:()=>void;onWardrobe:()=>void;
  onPreset: (id: PresetId) => void;
};

export function ProjectsPage({ project, onContinue, onNew, onOpen, onPreset, onPlan, onProducts,onLandscape,onWardrobe,onPlr }: Props) {
  return <main className="hub-page">
    <header className="hub-topbar">
      <div className="hub-brand"><span><Layers3 size={19} /></span><b>Motion Pair</b><small>STUDIO</small></div>
      <div><button className="secondary-button" onClick={onOpen}><FolderOpen size={16} /> Open project</button><button className="primary-button" onClick={onNew}><Plus size={16} /> New wallpaper</button></div>
    </header>
    <section className="hub-content">
      <div className="hub-heading"><span>PROJECTS</span><h1>Build wallpapers that reward a closer look.</h1><p>Choose a saved project or start from a preset. Your work stays local until you export it.</p></div>
      <section className="home-presets" aria-label="Default wallpaper presets"><h2>Chọn cách tạo sản phẩm</h2><div className="home-preset-grid">{listDefaultPresets().map((preset) => <button key={preset.id} className="home-preset" onClick={() => onPreset(preset.id)}><span>{preset.ordinal}</span><strong>{preset.name}</strong><p>{preset.summary}</p><small>Create wallpaper</small></button>)}<button className="home-preset plr-home-preset" onClick={onPlr}><span>02</span><strong>PLR Collection Studio</strong><p>Nhập file prompt có sẵn để chuẩn bị tạo bộ ảnh tĩnh hàng loạt.</p><small>Nhập danh sách prompt</small></button><a className="home-preset" href="?studio=text-to-image"><span>03</span><strong>Landscape Batch</strong><p>Tạo ảnh phong cảnh tĩnh từ tối đa 500 prompt qua Image Dream free models.</p><small>Nhập prompt và tạo ảnh</small></a></div></section>
      <button className="preset-callout" onClick={onPlan}><Sparkles size={18} /><span><b>Create from prompt · SFW</b><small>Lập kế hoạch artwork A/B với Image Dream trước khi tạo wallpaper.</small></span></button>
      <button className="preset-callout" onClick={onProducts}><Sparkles size={18}/><span><b>Product Center</b><small>Đóng gói output, tạo ảnh listing và lưu lịch sử sản phẩm.</small></span></button>
      <button className="preset-callout" onClick={onLandscape}><Sparkles size={18}/><span><b>Landscape Studio · Spring Sakura</b><small>Một ảnh phong cảnh, cánh hoa, vùng nước và ánh sáng có kiểm soát.</small></span></button>
      <button className="preset-callout" onClick={onWardrobe}><Sparkles size={18}/><span><b>Wardrobe Studio · SFW</b><small>Mask trang phục, vùng bảo vệ, composite và pair QA trước khi reveal.</small></span></button>
      <article className="project-card">
        <div className="project-thumb"><img src={project.assets.imageA.source} alt="Current project thumbnail" /></div>
        <div className="project-card-copy"><span>RECENT PROJECT</span><h2>{project.title}</h2><p>{getPreset(project.preset.id).ordinal} — {getPreset(project.preset.id).name} · {project.target === 'both' ? 'Desktop + Mobile' : project.target}</p><small>Last saved locally · {new Date(project.updatedAt).toLocaleString()}</small></div>
        <button className="primary-button" onClick={onContinue}>Continue editing</button>
      </article>
      <button className="preset-callout" onClick={onNew}><Sparkles size={18} /><span><b>Preset library & experiments</b><small>Browse the defaults and optional depth, sweep and transformation experiments.</small></span></button>
    </section>
  </main>;
}
