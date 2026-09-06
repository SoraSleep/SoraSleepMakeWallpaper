import type { MotionPairProject } from './projectSchema';
import { getPreset } from '../presets/registry';

export type PackageValidation = { errors: string[]; warnings: string[] };

export function visualValidationMatrix(project: MotionPairProject) {
  const aspects = ['16:9', '21:9', '32:9', '9:16'] as const;
  const pointers = ['center', 'corner', 'edge'] as const;
  const cases = aspects.flatMap((aspect) => pointers.map((pointer) => ({
    id: `${aspect}-${pointer}`,
    aspect,
    pointer,
    passed: Number.isFinite(project.lens.magnification) && project.lens.magnification >= 100 && project.lens.magnification <= 200
      && project.lens.radius >= 8 && project.lens.radius <= 32,
  })));
  return cases;
}

export function validatePackageFiles(files: Record<string, Uint8Array>) {
  const errors: string[] = [];
  const allowed = /^(index\.html|runtime\.js|project\.json|config\.json|preview\.jpg|thumbnail\.jpg|INSTALL\.txt|LICENSE\.txt|CHANGELOG\.txt|THIRD-PARTY-NOTICES\.txt|manifest\.json|sha256\.json|assets\/[a-z0-9._-]+)$/i;
  for (const [name, bytes] of Object.entries(files)) {
    if (!allowed.test(name)) errors.push(`File is outside the package whitelist: ${name}`);
    if (name.includes('..') || name.includes('\\') || name.startsWith('/')) errors.push(`Unsafe package path: ${name}`);
    if (/\.(map|pem|key|env)$/i.test(name)) errors.push(`Forbidden file type: ${name}`);
    if (/\.(html|js|json|txt)$/i.test(name)) {
      const text = new TextDecoder().decode(bytes);
      if (/sourceMappingURL=|https?:\/\//i.test(text)) errors.push(`Offline/source-map check failed: ${name}`);
      if (/(api[_-]?key|secret|token)\s*[:=]/i.test(text)) errors.push(`Possible secret detected: ${name}`);
    }
  }
  if (!files['index.html']) errors.push('Missing runtime entry: index.html');
  if (!files['project.json']) errors.push('Missing Wallpaper Engine metadata: project.json');
  return errors;
}

export function validateWallpaperPackage(project: MotionPairProject, hasDifferenceMask: boolean): PackageValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const preset = getPreset(project.preset.id);
  if (preset.status !== 'ready') errors.push(`${preset.name} is in beta and cannot be commercially exported yet.`);
  if (!project.title.trim()) errors.push('Project title is required.');
  if (project.assets.imageA.rights !== 'verified' || project.assets.imageB.rights !== 'verified') {
    errors.push('Commercial rights must be verified for both images.');
  }
  if (project.alignment.status === 'pending' || project.alignment.status === 'rejected') {
    errors.push('Alignment must be reviewed before export.');
  }
  if (!hasDifferenceMask) errors.push('Difference mask is not ready.');
  const assets: Array<['A' | 'B', MotionPairProject['assets']['imageA']]> = [['A', project.assets.imageA], ['B', project.assets.imageB]];
  for (const [label, asset] of assets) {
    if (!asset.source) errors.push(`Asset ${label} has no source.`);
    if (/^https?:\/\//i.test(asset.source)) errors.push(`Asset ${label} uses a network URL; package must be offline.`);
    if (asset.width > 8192 || asset.height > 8192) errors.push(`Asset ${label} exceeds the 8K safety limit.`);
    if (!asset.mimeType.startsWith('image/')) errors.push(`Asset ${label} is not an image.`);
  }
  if (project.alignment.transform.some((value) => !Number.isFinite(value))) errors.push('Alignment transform contains an invalid number.');
  if (project.assets.imageA.size + project.assets.imageB.size > 100 * 1024 * 1024) warnings.push('Source images exceed 100 MB combined; export may take longer.');
  if (visualValidationMatrix(project).some((test) => !test.passed)) errors.push('Visual validation matrix contains a failed case.');
  return { errors, warnings };
}
