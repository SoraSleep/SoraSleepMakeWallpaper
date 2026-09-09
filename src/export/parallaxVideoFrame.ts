import type { MotionPairProject } from '../project/projectSchema';

/** Load assets by identity, never by the position of a visible layer. */
export async function prepareParallaxVideo(project: MotionPairProject) {
  if (project.preset.id !== 'layered-parallax') return null;
  if (project.parallax.mode === 'depth-map') throw new Error('Depth-map video export is not implemented yet. Use layer mode.');
  const layers = await Promise.all(project.parallax.layers.filter(layer => layer.visible).map(async layer => {
    if (!layer.asset?.source) throw new Error(`Missing image for layer: ${layer.name}`);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const value = new Image(); value.onload = () => resolve(value);
      value.onerror = () => reject(new Error(`Could not load layer: ${layer.name}`));
      value.src = layer.asset!.source;
    });
    return { layer, image };
  }));
  if (!layers.length) throw new Error('At least one visible layer is required.');
  return (context: CanvasRenderingContext2D, width: number, height: number, x: number, y: number) => {
    const settings = project.parallax;
    const cx = settings.mobile.reducedMotion || settings.axis === 'vertical' ? 0.5 : x;
    const cy = settings.mobile.reducedMotion || settings.axis === 'horizontal' ? 0.5 : y;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#090b0e'; context.fillRect(0, 0, width, height);
    for (const { layer, image } of layers) {
      const base = (project.canvas.fit === 'contain' ? Math.min : Math.max)(width / image.width, height / image.height);
      const movement = settings.cameraStrength * layer.depth / 100;
      const scale = base * Math.max(layer.scale, 1 + settings.overscan / 100 + movement);
      const dw = image.width * scale, dh = image.height * scale;
      context.drawImage(image, (width - dw) / 2 + (cx - 0.5) * width * movement + width * layer.offsetX / 100,
        (height - dh) / 2 + (0.5 - cy) * height * movement + height * layer.offsetY / 100, dw, dh);
    }
  };
}
