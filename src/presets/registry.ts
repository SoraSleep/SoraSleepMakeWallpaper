import { differenceLensPreset } from './differenceLens';
import { beforeAfterSweepPreset, layeredParallaxPreset, portalRevealPreset, transformationLoopPreset } from './corePresets';
import type { PresetId, WallpaperPreset } from './types';

const presets: WallpaperPreset[] = [differenceLensPreset, portalRevealPreset, layeredParallaxPreset, beforeAfterSweepPreset, transformationLoopPreset];

export function listPresets() {
  return presets;
}

export function getPreset(id: PresetId) {
  const preset = presets.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`Unsupported preset: ${id}`);
  return preset;
}

export { differenceLensPreset };
export type { EditorPhase, PresetId, PresetTarget, WallpaperPreset } from './types';
