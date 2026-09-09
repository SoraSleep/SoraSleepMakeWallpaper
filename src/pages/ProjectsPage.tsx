import { FolderOpen, Layers3, Plus, Sparkles } from 'lucide-react';
import { getPreset, listDefaultPresets } from '../presets/registry';
import type { PresetId } from '../presets/types';
import type { MotionPairProject } from '../project/projectSchema';

type Props = {
  project: MotionPairProject;
  onContinue: () => void;
  onNew: () => void;
  onOpen: () => void;
  onPreset: (id: PresetId) => void;
};

export function ProjectsPage({ project, onContinue, onNew, onOpen, onPreset }: Props) {
  return <main className="hub-page">
    <header className="hub-topbar">
      <div className="hub-brand"><span><Layers3 size={19} /></span><b>Motion Pair</b><small>STUDIO</small></div>
      <div><button className="secondary-button" onClick={onOpen}><FolderOpen size={16} /> Open project</button><button className="primary-button" onClick={onNew}><Plus size={16} /> New wallpaper</button></div>
    </header>
    <section className="hub-content">
      <div className="hub-heading"><span>PROJECTS</span><h1>Build wallpapers that reward a closer look.</h1><p>Choose a saved project or start from a preset. Your work stays local until you export it.</p></div>
      <section className="home-presets" aria-label="Default wallpaper presets"><h2>Your two default presets</h2><div className="home-preset-grid">{listDefaultPresets().map((preset) => <button key={preset.id} className="home-preset" onClick={() => onPreset(preset.id)}><span>{preset.ordinal}</span><strong>{preset.name}</strong><p>{preset.summary}</p><small>Create wallpaper</small></button>)}</div></section>
      <article className="project-card">
        <div className="project-thumb"><img src={project.assets.imageA.source} alt="Current project thumbnail" /></div>
        <div className="project-card-copy"><span>RECENT PROJECT</span><h2>{project.title}</h2><p>{getPreset(project.preset.id).ordinal} — {getPreset(project.preset.id).name} · {project.target === 'both' ? 'Desktop + Mobile' : project.target}</p><small>Last saved locally · {new Date(project.updatedAt).toLocaleString()}</small></div>
        <button className="primary-button" onClick={onContinue}>Continue editing</button>
      </article>
      <button className="preset-callout" onClick={onNew}><Sparkles size={18} /><span><b>Preset library & experiments</b><small>Browse the defaults and optional depth, sweep and transformation experiments.</small></span></button>
    </section>
  </main>;
}
