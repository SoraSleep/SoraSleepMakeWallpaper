import { FolderOpen, Layers3, Plus, Sparkles } from 'lucide-react';
import type { MotionPairProject } from '../project/projectSchema';

type Props = {
  project: MotionPairProject;
  onContinue: () => void;
  onNew: () => void;
  onOpen: () => void;
};

export function ProjectsPage({ project, onContinue, onNew, onOpen }: Props) {
  return <main className="hub-page">
    <header className="hub-topbar">
      <div className="hub-brand"><span><Layers3 size={19} /></span><b>Motion Pair</b><small>STUDIO</small></div>
      <div><button className="secondary-button" onClick={onOpen}><FolderOpen size={16} /> Open project</button><button className="primary-button" onClick={onNew}><Plus size={16} /> New wallpaper</button></div>
    </header>
    <section className="hub-content">
      <div className="hub-heading"><span>PROJECTS</span><h1>Build wallpapers that reward a closer look.</h1><p>Choose a saved project or start from a preset. Your work stays local until you export it.</p></div>
      <article className="project-card">
        <div className="project-thumb"><img src={project.assets.imageA.source} alt="Current project thumbnail" /></div>
        <div className="project-card-copy"><span>RECENT PROJECT</span><h2>{project.title}</h2><p>01 — Difference Lens · {project.target === 'both' ? 'Desktop + Mobile' : project.target}</p><small>Last saved locally · {new Date(project.updatedAt).toLocaleString()}</small></div>
        <button className="primary-button" onClick={onContinue}>Continue editing</button>
      </article>
      <button className="preset-callout" onClick={onNew}><Sparkles size={18} /><span><b>Explore wallpaper presets</b><small>Choose from interactive reveal, portal, sweep and transformation formats.</small></span></button>
    </section>
  </main>;
}
