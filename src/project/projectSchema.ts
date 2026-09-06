export const CURRENT_PROJECT_VERSION = 2 as const;

export type ProjectPreset = { id: 'difference-lens' | 'portal-reveal' | 'layered-parallax' | 'before-after-sweep' | 'transformation-loop'; version: 1 };
export type ProjectTarget = 'desktop-web' | 'mobile-video' | 'both';

export type ProjectAsset = {
  name: string;
  source: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  rights: 'unknown' | 'verified' | 'rejected';
};

export type MaskStroke = {
  id: string;
  mode: 'reveal' | 'erase' | 'protect';
  radius: number;
  hardness: number;
  points: Array<{ x: number; y: number }>;
};

export type ParallaxLayer = {
  id: string;
  name: string;
  asset: ProjectAsset | null;
  depth: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  visible: boolean;
};

export type ParallaxSettings = {
  mode: 'layers' | 'depth-map';
  cameraStrength: number;
  smoothing: number;
  overscan: number;
  depthPerspective: number;
  layers: ParallaxLayer[];
  depthMap: ProjectAsset | null;
  mobile: {
    input: 'touch' | 'gyroscope' | 'auto';
    strength: number;
    reducedMotion: boolean;
  };
};

export const defaultParallaxSettings = (): ParallaxSettings => ({
  mode: 'layers',
  cameraStrength: 18,
  smoothing: 72,
  overscan: 12,
  depthPerspective: 20,
  layers: [],
  depthMap: null,
  mobile: { input: 'auto', strength: 16, reducedMotion: false },
});

export type MotionPairProject = {
  schemaVersion: typeof CURRENT_PROJECT_VERSION;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  preset: ProjectPreset;
  target: ProjectTarget;
  /** Preset-owned data is introduced in v2; legacy fields remain until the UI migration is complete. */
  presetSettings: Record<string, unknown>;
  exportSettings: Record<string, unknown>;
  assets: {
    imageA: ProjectAsset;
    imageB: ProjectAsset;
  };
  canvas: {
    aspectRatio: '16:9' | '21:9' | '32:9' | '9:16' | 'native';
    fit: 'cover' | 'contain';
    safeArea: { top: number; bottom: number; sides: number };
  };
  alignment: {
    status: 'pending' | 'good' | 'review' | 'rejected';
    transform: [number, number, number, number, number, number];
  };
  difference: {
    thresholdLow: number;
    thresholdHigh: number;
    strokes: MaskStroke[];
  };
  lens: {
    radius: number;
    feather: number;
    magnification: number;
    revealIntensity: number;
    followSpeed: number;
  };
  mobileMotion: {
    path: 'orbit' | 'figure8' | 'guided' | 'breathe';
    duration: number;
    loop: 'repeat' | 'pingpong';
  };
  mobileRender: { quality: 'economy' | 'standard' | 'premium'; width: number; height: number; fps: 24 | 30 };
  parallax: ParallaxSettings;
};

type ProjectSeed = Pick<MotionPairProject, 'title' | 'assets' | 'lens'>;

export function createProject(seed: ProjectSeed): MotionPairProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_PROJECT_VERSION,
    id: globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}`,
    title: seed.title,
    createdAt: now,
    updatedAt: now,
    preset: { id: 'difference-lens', version: 1 },
    target: 'both',
    presetSettings: { lens: seed.lens, portal: { glow: 72, ripple: 0, rippleEnabled: true, reducedMotion: false }, mobileMotion: { path: 'guided', duration: 8, loop: 'repeat' } },
    exportSettings: { mobileVideo: { quality: 'standard', width: 1080, height: 1920, fps: 30 } },
    assets: seed.assets,
    canvas: { aspectRatio: '16:9', fit: 'cover', safeArea: { top: 0, bottom: 0, sides: 0 } },
    alignment: { status: 'pending', transform: [1, 0, 0, 1, 0, 0] },
    difference: { thresholdLow: 0.1, thresholdHigh: 0.2, strokes: [] },
    lens: seed.lens,
    mobileMotion: { path: 'guided', duration: 8, loop: 'repeat' },
    mobileRender: { quality: 'standard', width: 1080, height: 1920, fps: 30 },
    parallax: defaultParallaxSettings(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isAsset(value: unknown): value is ProjectAsset {
  if (!isRecord(value)) return false;
  return typeof value.name === 'string'
    && typeof value.source === 'string'
    && typeof value.mimeType === 'string'
    && isFiniteNumber(value.width) && value.width > 0 && value.width <= 8192
    && isFiniteNumber(value.height) && value.height > 0 && value.height <= 8192
    && isFiniteNumber(value.size) && value.size >= 0
    && ['unknown', 'verified', 'rejected'].includes(String(value.rights));
}

/** Converts persisted v1 projects without changing the caller's source object. */
export function migrateProject(value: unknown): unknown {
  if (!isRecord(value) || value.schemaVersion !== 1) return value;
  const mobileMotion = value.mobileMotion ?? { path: 'guided', duration: 8, loop: 'repeat' };
  const mobileRender = value.mobileRender ?? { quality: 'standard', width: 1080, height: 1920, fps: 30 };
  return {
    ...value,
    schemaVersion: CURRENT_PROJECT_VERSION,
    preset: { id: 'difference-lens', version: 1 },
    target: 'both',
    presetSettings: { lens: value.lens, mobileMotion },
    exportSettings: { mobileVideo: mobileRender },
    mobileMotion,
    mobileRender,
  };
}

export function parseProject(value: unknown): MotionPairProject {
  value = migrateProject(value);
  if (!isRecord(value)) throw new Error('Project file must contain a JSON object.');
  if (value.schemaVersion !== CURRENT_PROJECT_VERSION) {
    throw new Error(`Unsupported project schema: ${String(value.schemaVersion)}.`);
  }
  if (typeof value.id !== 'string' || typeof value.title !== 'string'
    || typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') {
    throw new Error('Project identity is invalid.');
  }
  if (!isRecord(value.preset) || !['difference-lens', 'portal-reveal', 'layered-parallax', 'before-after-sweep', 'transformation-loop'].includes(String(value.preset.id)) || value.preset.version !== 1) {
    throw new Error('Project preset is invalid or unsupported.');
  }
  if (!['desktop-web', 'mobile-video', 'both'].includes(String(value.target))) {
    throw new Error('Project target is invalid.');
  }
  if (!isRecord(value.presetSettings) || !isRecord(value.exportSettings)) {
    throw new Error('Project preset/export settings are invalid.');
  }
  if (!isRecord(value.assets) || !isAsset(value.assets.imageA) || !isAsset(value.assets.imageB)) {
    throw new Error('Project image assets are invalid or missing.');
  }
  if (!isRecord(value.lens)) throw new Error('Project lens settings are missing.');
  const lens = value.lens;
  const lensKeys = ['radius', 'feather', 'magnification', 'revealIntensity', 'followSpeed'] as const;
  if (lensKeys.some((key) => !isFiniteNumber(lens[key]))) {
    throw new Error('Project lens settings are invalid.');
  }
  if (value.mobileMotion === undefined) value.mobileMotion = { path: 'guided', duration: 8, loop: 'repeat' };
  if (!isRecord(value.mobileMotion)
    || !['orbit', 'figure8', 'guided', 'breathe'].includes(String(value.mobileMotion.path))
    || !isFiniteNumber(value.mobileMotion.duration) || value.mobileMotion.duration < 3 || value.mobileMotion.duration > 30
    || !['repeat', 'pingpong'].includes(String(value.mobileMotion.loop))) {
    throw new Error('Mobile motion settings are invalid.');
  }
  if (value.mobileRender === undefined) value.mobileRender = { quality: 'standard', width: 1080, height: 1920, fps: 30 };
  if (!isRecord(value.mobileRender) || !['economy', 'standard', 'premium'].includes(String(value.mobileRender.quality))
    || ![720, 1080, 1440].includes(Number(value.mobileRender.width)) || Number(value.mobileRender.height) !== Number(value.mobileRender.width) * 16 / 9
    || ![24, 30].includes(Number(value.mobileRender.fps))) throw new Error('Mobile render settings are invalid.');
  if (value.parallax === undefined) value.parallax = defaultParallaxSettings();
  if (!isRecord(value.parallax)
    || !['layers', 'depth-map'].includes(String(value.parallax.mode))
    || !isFiniteNumber(value.parallax.cameraStrength) || value.parallax.cameraStrength < 0 || value.parallax.cameraStrength > 60
    || !isFiniteNumber(value.parallax.smoothing) || value.parallax.smoothing < 0 || value.parallax.smoothing > 100
    || !isFiniteNumber(value.parallax.overscan) || value.parallax.overscan < 0 || value.parallax.overscan > 50
    || !isFiniteNumber(value.parallax.depthPerspective) || value.parallax.depthPerspective < 0 || value.parallax.depthPerspective > 100
    || !Array.isArray(value.parallax.layers)
    || !isRecord(value.parallax.mobile)
    || !['touch', 'gyroscope', 'auto'].includes(String(value.parallax.mobile.input))
    || !isFiniteNumber(value.parallax.mobile.strength) || value.parallax.mobile.strength < 0 || value.parallax.mobile.strength > 60
    || typeof value.parallax.mobile.reducedMotion !== 'boolean') throw new Error('Parallax settings are invalid.');
  if (value.parallax.layers.some((layer) => !isRecord(layer)
    || typeof layer.id !== 'string' || typeof layer.name !== 'string'
    || (layer.asset !== null && !isAsset(layer.asset))
    || !isFiniteNumber(layer.depth) || layer.depth < 0 || layer.depth > 1
    || !isFiniteNumber(layer.scale) || layer.scale < 0.5 || layer.scale > 3
    || !isFiniteNumber(layer.offsetX) || !isFiniteNumber(layer.offsetY)
    || typeof layer.visible !== 'boolean')) throw new Error('Parallax layer settings are invalid.');
  if (value.parallax.depthMap !== null && value.parallax.depthMap !== undefined && !isAsset(value.parallax.depthMap)) throw new Error('Parallax depth map is invalid.');
  if (!isRecord(value.canvas) || !isRecord(value.alignment) || !isRecord(value.difference)) {
    throw new Error('Project processing settings are incomplete.');
  }
  if (value.difference.strokes === undefined) value.difference.strokes = [];
  if (value.canvas.safeArea === undefined) value.canvas.safeArea = { top: 0, bottom: 0, sides: 0 };
  if (!['16:9', '21:9', '32:9', '9:16', 'native'].includes(String(value.canvas.aspectRatio))
    || !['cover', 'contain'].includes(String(value.canvas.fit))) {
    throw new Error('Project canvas settings are invalid.');
  }
  if (!isRecord(value.canvas.safeArea)
    || !isFiniteNumber(value.canvas.safeArea.top) || !isFiniteNumber(value.canvas.safeArea.bottom) || !isFiniteNumber(value.canvas.safeArea.sides)
    || value.canvas.safeArea.top < 0 || value.canvas.safeArea.bottom < 0 || value.canvas.safeArea.sides < 0
    || value.canvas.safeArea.top > 25 || value.canvas.safeArea.bottom > 25 || value.canvas.safeArea.sides > 25) {
    throw new Error('Canvas safe area is invalid.');
  }
  if (!['pending', 'good', 'review', 'rejected'].includes(String(value.alignment.status))
    || !Array.isArray(value.alignment.transform)
    || value.alignment.transform.length !== 6
    || value.alignment.transform.some((entry) => !isFiniteNumber(entry))) {
    throw new Error('Project alignment data is invalid.');
  }
  if (!isFiniteNumber(value.difference.thresholdLow)
    || !isFiniteNumber(value.difference.thresholdHigh)
    || value.difference.thresholdLow < 0
    || value.difference.thresholdHigh > 1
    || value.difference.thresholdLow >= value.difference.thresholdHigh) {
    throw new Error('Project difference thresholds are invalid.');
  }
  if (!Array.isArray(value.difference.strokes)) throw new Error('Project mask strokes are invalid.');
  return value as MotionPairProject;
}

export function serializeProject(project: MotionPairProject) {
  return JSON.stringify({ ...project, updatedAt: new Date().toISOString() }, null, 2);
}

export function safeProjectFileName(title: string) {
  const normalized = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${normalized || 'motion-pair-project'}.wallproj`;
}
