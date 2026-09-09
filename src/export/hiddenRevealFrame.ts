import type { MotionPairProject } from '../project/projectSchema';

/** Cache the masked variant once. A, B and mask then share one camera transform. */
export function prepareHiddenReveal(project: MotionPairProject, a: HTMLCanvasElement, b: HTMLCanvasElement,
  mask: { width: number; height: number; data: Uint8ClampedArray } | null) {
  if (project.preset.id !== 'difference-lens') return null;
  if (!mask || mask.data.length !== mask.width * mask.height) throw new Error('Hidden Reveal requires a valid approved difference mask.');
  const width = a.width, height = a.height;
  const layer = document.createElement('canvas'); layer.width = width; layer.height = height;
  const ctx = layer.getContext('2d')!;
  const maskImage = document.createElement('canvas'); maskImage.width = mask.width; maskImage.height = mask.height;
  const mc = maskImage.getContext('2d')!; const pixels = mc.createImageData(mask.width, mask.height);
  mask.data.forEach((value, i) => { pixels.data[i * 4] = pixels.data[i * 4 + 1] = pixels.data[i * 4 + 2] = 255; pixels.data[i * 4 + 3] = value; });
  mc.putImageData(pixels, 0, 0);
  ctx.drawImage(b, 0, 0); ctx.globalCompositeOperation = 'destination-in';
  const scale = (project.canvas.fit === 'contain' ? Math.min : Math.max)(width / mask.width, height / mask.height);
  ctx.drawImage(maskImage, (width - mask.width * scale) / 2, (height - mask.height * scale) / 2, mask.width * scale, mask.height * scale);
  return (context: CanvasRenderingContext2D, phase: number, x: number, y: number) => {
    const progress = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    const zoom = 1 + (Math.max(1, Math.min(1.18, project.lens.magnification / 100)) - 1) * progress;
    const raw = Math.max(0, Math.min(1, (progress - 0.3) / 0.7));
    const reveal = raw * raw * (3 - 2 * raw) * Math.max(0, Math.min(1, project.lens.revealIntensity / 100));
    context.save(); context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#090b0e'; context.fillRect(0, 0, width, height);
    context.setTransform(zoom, 0, 0, zoom, x * width * (1 - zoom), (1 - y) * height * (1 - zoom));
    context.drawImage(a, 0, 0); context.globalAlpha = reveal; context.drawImage(layer, 0, 0); context.restore();
  };
}
