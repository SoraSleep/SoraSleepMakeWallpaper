import type { MotionPairProject } from './projectSchema';

export function validateMobileCommercialExport(project: MotionPairProject, hasMask: boolean) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { width, height, fps, quality } = project.mobileRender;
  if (height / width !== 16 / 9) errors.push('Mobile output must use a 9:16 portrait resolution.');
  if (width % 2 !== 0 || height % 2 !== 0) errors.push('Video dimensions must be divisible by 2 for H.264.');
  if (!hasMask) errors.push('Difference mask is required before mobile export.');
  if (project.mobileMotion.duration < 3 || project.mobileMotion.duration > 30) errors.push('Loop duration must be between 3 and 30 seconds.');
  if (project.assets.imageA.rights !== 'verified' || project.assets.imageB.rights !== 'verified') errors.push('Both images need verified commercial rights.');
  if (project.alignment.status !== 'good' && project.alignment.status !== 'review') errors.push('Alignment must be reviewed before mobile export.');
  const bitrate = quality === 'premium' ? 14 : quality === 'economy' ? 4 : 8;
  const estimatedMb = bitrate * project.mobileMotion.duration / 8;
  if (estimatedMb > 250) warnings.push(`Estimated video size is ${estimatedMb.toFixed(0)} MB; consider Economy or Standard for storefront delivery.`);
  if (fps === 24) warnings.push('24 FPS saves battery but may look less fluid on 120 Hz phones.');
  return { errors, warnings, estimatedMb };
}
