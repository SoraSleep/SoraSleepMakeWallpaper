import { ArrowLeft, CheckCircle2, ChevronRight, Image as ImageIcon, Monitor, MonitorSmartphone, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { listPresets, listDefaultPresets } from '../presets/registry';
import type { PresetId, WallpaperPreset } from '../presets/types';

export function PresetLibraryPage({ onBack, onUse }: { onBack: () => void; onUse: (presetId: PresetId) => void }) {
  const [query, setQuery] = useState('');
  const [showExperiments, setShowExperiments] = useState(false);
  const [filter, setFilter] = useState<'all' | 'interactive' | 'mobile' | 'two-image' | 'ambient'>('all');
  const [selectedPreset, setSelectedPreset] = useState<WallpaperPreset | null>(null);
  const [loadState, setLoadState] = useState<'ready' | 'loading' | 'error'>('ready');
  const presets = useMemo(() => (showExperiments ? listPresets() : listDefaultPresets()).filter((preset) => {
    const matchesQuery = `${preset.name} ${preset.summary}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = filter === 'all'
      || filter === preset.category
      || filter === 'mobile' && preset.supportedTargets.some((target) => target === 'mobile-video' || target === 'both')
      || filter === 'two-image' && preset.inputs.filter((input) => input.required).length >= 2;
    return matchesQuery && matchesFilter;
  }), [filter, query, showExperiments]);
  useEffect(() => {
    if (!selectedPreset) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedPreset(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedPreset]);
  const reload = () => { setLoadState('loading'); window.setTimeout(() => setLoadState('ready'), 250); };
  return <main className="hub-page"><header className="hub-topbar"><button className="back-button" onClick={onBack}><ArrowLeft size={16} /> Projects</button><div className="hub-brand"><span><Sparkles size={18} /></span><b>Preset Library</b></div></header>
    <section className="hub-content preset-library"><div className="hub-heading"><span>START WITH A FORMAT</span><h1>Pick the interaction before you build the scene.</h1><p>Every preset defines its own inputs, editor workflow and compatible export targets.</p></div>
      <div className="preset-library-controls"><label className="preset-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search presets" aria-label="Search presets" /></label><div className="preset-filters" role="tablist" aria-label="Preset filters">{([['all', 'All'], ['interactive', 'Interactive'], ['mobile', 'Mobile'], ['two-image', 'Two images'], ['ambient', 'Ambient']] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={filter === id} className={filter === id ? 'selected' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div></div>
      <label><input type="checkbox" checked={showExperiments} onChange={event => setShowExperiments(event.target.checked)} /> Show experimental presets (03–05)</label>
      {loadState === 'loading' && <div className="preset-library-status">Loading preset library…</div>}
      {loadState === 'error' && <div className="preset-library-status"><span>Preset library could not be loaded.</span><button className="secondary-button" onClick={reload}>Retry</button></div>}
      {loadState === 'ready' && presets.length === 0 && <div className="preset-empty"><Sparkles size={22} /><b>No matching preset yet.</b><small>Try another search or choose All. Ambient modes will appear when their renderer is ready.</small><button className="secondary-button" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</button></div>}
      {loadState === 'ready' && presets.length > 0 && <div className="preset-grid">{presets.map((preset) => <article className="preset-library-card" key={preset.id}>
        <div className="preset-poster"><span>{preset.ordinal}</span><Sparkles size={28} /></div><div className="preset-library-copy"><div><small>{preset.category.toUpperCase()}</small><h2>{preset.name}</h2></div><p>{preset.summary}</p><div className="preset-meta"><span><MonitorSmartphone size={14} /> {preset.supportedTargets.includes('mobile-video') || preset.supportedTargets.includes('both') ? 'Mobile capable' : 'Desktop'}</span><span><ImageIcon size={14} /> {preset.inputs.filter((input) => input.required).length} image inputs</span><span><CheckCircle2 size={14} /> {preset.status === 'ready' ? 'Ready' : 'Beta'}</span></div><div className="preset-actions"><button className="secondary-button" onClick={() => setSelectedPreset(preset)}>Details <ChevronRight size={15} /></button><button className="primary-button" disabled={['before-after-sweep', 'transformation-loop'].includes(preset.id)} onClick={() => onUse(preset.id)}>Use this preset</button></div></div>
      </article>)}</div>}
    </section>
    {selectedPreset && <div className="preset-drawer-backdrop" role="presentation" onMouseDown={() => setSelectedPreset(null)}><aside className="preset-drawer" role="dialog" aria-modal="true" aria-labelledby="preset-detail-title" onMouseDown={(event) => event.stopPropagation()}><button className="drawer-close" aria-label="Close details" onClick={() => setSelectedPreset(null)}><X size={18} /></button><div className="drawer-ordinal">{selectedPreset.ordinal}</div><small>{selectedPreset.category.toUpperCase()} · VERSION {selectedPreset.version}</small><h2 id="preset-detail-title">{selectedPreset.name}</h2><p>{selectedPreset.summary}</p><div className="drawer-section"><b>INPUT CONTRACT</b>{selectedPreset.inputs.map((input) => <div className="drawer-input" key={input.id}><ImageIcon size={15} /><span><strong>{input.label}</strong><small>{input.description}</small></span><em>{input.required ? 'Required' : 'Optional'}</em></div>)}</div><div className="drawer-section"><b>OUTPUTS</b><div className="drawer-tags">{selectedPreset.supportedTargets.map((target) => <span key={target}>{target === 'desktop-web' ? <Monitor size={14} /> : <MonitorSmartphone size={14} />}{target === 'both' ? 'Desktop + Mobile' : target === 'desktop-web' ? 'Desktop Web' : 'Mobile Video'}</span>)}</div></div><div className="drawer-section"><b>WORKFLOW</b><p>{selectedPreset.workflow.join(' → ')}</p></div><button className="primary-button drawer-use" disabled={['before-after-sweep', 'transformation-loop'].includes(selectedPreset.id)} onClick={() => onUse(selectedPreset.id)}>Use {selectedPreset.name}</button></aside></div>}
  </main>;
}
