import { differenceLensPreset } from './differenceLens';
import { beforeAfterSweepPreset, layeredParallaxPreset, portalRevealPreset, transformationLoopPreset } from './corePresets';
import type { PresetId, WallpaperPreset } from './types';

export const isRevealPreset = (id: PresetId) => id === 'difference-lens' || id === 'portal-reveal';
export const revealStudioPreset: WallpaperPreset = {
  ...differenceLensPreset, name: 'Reveal Studio', ordinal: '01',
  summary: 'Một preset A/B, hai chế độ: Difference Lens phóng đại vùng khác biệt hoặc Portal Reveal mở cửa sổ sang ảnh B.',
};
export const revealModes = [
  { id: 'difference-lens' as const, label: 'Difference Lens · Zoom reveal' },
  { id: 'portal-reveal' as const, label: 'Portal Reveal · Window reveal' },
];

const presets: WallpaperPreset[] = [differenceLensPreset, portalRevealPreset, layeredParallaxPreset, beforeAfterSweepPreset, transformationLoopPreset];

export function listPresets() {
  return [revealStudioPreset, ...presets.filter(preset => !isRevealPreset(preset.id))];
}

export function listDefaultPresets() {
  return [revealStudioPreset];
}

export function getPreset(id: PresetId) {
  const preset = presets.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`Unsupported preset: ${id}`);
  return isRevealPreset(id) ? { ...preset, ordinal: '01', name: `Reveal Studio · ${id === 'difference-lens' ? 'Difference Lens' : 'Portal Reveal'}` } : preset;
}

export { differenceLensPreset };
export type { EditorPhase, PresetId, PresetTarget, WallpaperPreset } from './types';
