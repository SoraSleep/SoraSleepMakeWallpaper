import type { WallpaperPreset } from './types';

export const differenceLensPreset: WallpaperPreset = {
  id: 'difference-lens',
  version: 1,
  ordinal: '01',
  name: 'Hidden Reveal',
  summary: 'Hold to move closer and uncover approved changes. Release to return to the original.',
  category: 'interactive',
  status: 'ready',
  supportedTargets: ['desktop-web', 'mobile-video', 'both'],
  inputs: [
    { id: 'imageA', label: 'Base image A', required: true, accepts: ['image'], description: 'The image shown outside the lens.' },
    { id: 'imageB', label: 'Variant image B', required: true, accepts: ['image'], description: 'A similar image containing approved differences.' },
  ],
  workflow: ['assets', 'canvas', 'align', 'difference', 'motion', 'effects', 'validate', 'export'],
  capabilities: { alignment: true, differenceMask: true, timeline: true, desktopPointer: true },
  defaultSettings: {
    lens: { radius: 18, feather: 14, magnification: 145, revealIntensity: 100, followSpeed: 78 },
    mobileMotion: { path: 'guided', duration: 8, loop: 'repeat' },
  },
};
