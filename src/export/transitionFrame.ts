import type { MotionPairProject } from '../project/projectSchema';

/** Round-trip transition with a hold at both endpoints. Coordinates are output pixels. */
export function drawTransitionFrame(context: CanvasRenderingContext2D, project: MotionPairProject,
  a: CanvasImageSource, b: CanvasImageSource, width: number, height: number, time: number) {
  const phase = (time / project.mobileMotion.duration) % 1;
  const leg = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
  const progress = Math.max(0, Math.min(1, (leg - 0.15) / 0.7));
  const amount = progress * progress * (3 - 2 * progress);
  context.save(); context.clearRect(0, 0, width, height);
  context.drawImage(a, 0, 0, width, height);
  if (project.preset.id === 'transformation-loop') {
    context.globalAlpha = amount; context.drawImage(b, 0, 0, width, height);
  } else {
    const settings = project.presetSettings.sweep as { direction?: string; softness?: number } | undefined;
    const vertical = settings?.direction === 'vertical';
    const extent = vertical ? height : width;
    const feather = Math.max(1, extent * (settings?.softness ?? 3) / 100);
    const edge = amount * (extent + 2 * feather) - feather;
    const layer = document.createElement('canvas'); layer.width = width; layer.height = height;
    const ctx = layer.getContext('2d')!; ctx.drawImage(b, 0, 0, width, height);
    ctx.globalCompositeOperation = 'destination-in';
    const gradient = ctx.createLinearGradient(vertical ? 0 : edge - feather, vertical ? edge - feather : 0,
      vertical ? 0 : edge + feather, vertical ? edge + feather : 0);
    gradient.addColorStop(0, '#fff'); gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height); context.drawImage(layer, 0, 0);
  }
  context.restore();
}
