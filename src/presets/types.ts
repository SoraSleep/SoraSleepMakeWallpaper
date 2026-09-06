export type PresetId = 'difference-lens' | 'portal-reveal' | 'layered-parallax' | 'before-after-sweep' | 'transformation-loop';
export type PresetTarget = 'desktop-web' | 'mobile-video' | 'both';
export type EditorPhase = 'assets' | 'canvas' | 'align' | 'difference' | 'motion' | 'effects' | 'validate' | 'export';

export type PresetInputDefinition = {
  id: string;
  label: string;
  required: boolean;
  accepts: Array<'image'>;
  description: string;
};

export type WallpaperPreset = {
  id: PresetId;
  version: number;
  ordinal: string;
  name: string;
  summary: string;
  category: 'interactive' | 'timeline';
  status: 'ready' | 'beta';
  supportedTargets: PresetTarget[];
  inputs: PresetInputDefinition[];
  workflow: EditorPhase[];
  capabilities: {
    alignment: boolean;
    differenceMask: boolean;
    timeline: boolean;
    desktopPointer: boolean;
  };
  defaultSettings: Record<string, unknown>;
};
