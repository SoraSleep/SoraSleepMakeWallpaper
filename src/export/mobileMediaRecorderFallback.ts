import type { MotionPairProject } from '../project/projectSchema';
import { createAlignedImage } from './mobileVideoExport';

type ExportMask = { width: number; height: number; data: Uint8ClampedArray } | null;

const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`Could not load ${source}`)); image.src = source;
});

/** Best-effort fallback for browsers without WebCodecs. Output is WebM. */
export async function exportMobileVideoFallback(project: MotionPairProject, mask: ExportMask, onProgress?: (value: number) => void, signal?: AbortSignal) {
  if (typeof MediaRecorder === 'undefined') throw new Error('Video export is unsupported in this browser.');
  const [a, b] = await Promise.all([loadImage(project.assets.imageA.source), loadImage(project.assets.imageB.source)]);
  const { width, height, fps } = project.mobileRender;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); if (!context || typeof canvas.captureStream !== 'function') throw new Error('Canvas video capture is unsupported.');
  const stream = canvas.captureStream(fps);
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('No compatible fallback video format was found.');
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: project.mobileRender.quality === 'premium' ? 14_000_000 : project.mobileRender.quality === 'economy' ? 4_000_000 : 8_000_000 });
  const chunks: BlobPart[] = []; recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const maskCanvas = document.createElement('canvas');
  if (mask) { maskCanvas.width = mask.width; maskCanvas.height = mask.height; const maskContext = maskCanvas.getContext('2d')!; const pixels = maskContext.createImageData(mask.width, mask.height); mask.data.forEach((alpha, index) => { pixels.data[index * 4] = 255; pixels.data[index * 4 + 1] = 255; pixels.data[index * 4 + 2] = 255; pixels.data[index * 4 + 3] = alpha; }); maskContext.putImageData(pixels, 0, 0); }
  const total = Math.ceil(project.mobileMotion.duration * fps); let index = 0;
  const alignedB = createAlignedImage(b, width, height, project.alignment.transform);
  const parallax = project.preset.id === 'layered-parallax';
  const parallaxLayers = parallax ? project.parallax.layers.filter((layer) => layer.visible !== false).map((layer, layerIndex) => ({ layer, image: layerIndex === 0 ? a : alignedB })) : [];
  const portal = project.preset.id === 'portal-reveal';
  const portalSettings = (project.presetSettings.portal ?? {}) as { glow?: number; ripple?: number; rippleEnabled?: boolean; reducedMotion?: boolean };
  const draw = () => {
    const phase = (index / fps % project.mobileMotion.duration) / project.mobileMotion.duration; const angle = phase * Math.PI * 2;
    const still = portalSettings.reducedMotion === true;
    const x = still ? 0.5 : project.mobileMotion.path === 'orbit' ? 0.5 + Math.cos(angle) * 0.2 : project.mobileMotion.path === 'figure8' ? 0.5 + Math.sin(angle) * 0.22 : project.mobileMotion.path === 'breathe' ? 0.5 + Math.cos(angle) * 0.035 : 0.5 - Math.cos(angle) * 0.17;
    const y = still ? 0.54 : project.mobileMotion.path === 'orbit' ? 0.5 + Math.sin(angle) * 0.24 : project.mobileMotion.path === 'figure8' ? 0.5 + Math.sin(angle * 2) * 0.16 : project.mobileMotion.path === 'breathe' ? 0.54 + Math.sin(angle) * 0.035 : 0.52 + Math.sin(angle) * 0.1;
    const scale = Math.max(width / a.width, height / a.height); const dw = a.width * scale; const dh = a.height * scale;
    context.clearRect(0, 0, width, height);
    if (parallax) { const px = (x - 0.5) * width * project.parallax.cameraStrength / 100; const py = (y - 0.5) * height * project.parallax.cameraStrength / 100; for (const entry of parallaxLayers) { const fitScale = Math.max(width / entry.image.width, height / entry.image.height) * (1 + project.parallax.overscan / 100) * Math.max(1, entry.layer.scale); const lw = entry.image.width * fitScale; const lh = entry.image.height * fitScale; context.drawImage(entry.image, (width - lw) / 2 - px * entry.layer.depth, (height - lh) / 2 + py * entry.layer.depth, lw, lh); } } else context.drawImage(a, (width - dw) / 2, (height - dh) / 2, dw, dh);
    if (parallax) return;
    const radius = project.lens.radius / 100 * Math.min(width, height); const cx = x * width; const cy = (1 - y) * height; const zoom = project.lens.magnification / 100;
    context.save(); context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.clip();
    if (portal) { context.globalAlpha = project.lens.revealIntensity / 100; context.drawImage(alignedB, 0, 0); }
    else { context.drawImage(a, cx - width / zoom / 2, cy - height / zoom / 2, width / zoom, height / zoom); }
    if (!portal && mask) {
      const layer = document.createElement('canvas'); layer.width = width; layer.height = height;
      const layerContext = layer.getContext('2d')!;
      layerContext.drawImage(alignedB, cx - width / zoom / 2, cy - height / zoom / 2, width / zoom, height / zoom);
      layerContext.globalCompositeOperation = 'destination-in';
      layerContext.drawImage(maskCanvas, cx - radius, cy - radius, radius * 2, radius * 2);
      context.globalAlpha = project.lens.revealIntensity / 100; context.drawImage(layer, 0, 0);
    }
    context.restore(); const glow = portal ? Number(portalSettings.glow ?? 72) / 100 : 0; context.save(); context.strokeStyle = '#b9e472'; context.lineWidth = Math.max(2, width / 900) * (1 + glow); context.shadowColor = 'rgba(185,228,114,.9)'; context.shadowBlur = portal ? 12 + 24 * glow : 0; context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.stroke();
    if (portal && portalSettings.rippleEnabled !== false && !still) { const ripple = Number(portalSettings.ripple ?? 0) / 100; for (let ring = 0; ring < 2; ring += 1) { const ringPhase = (phase + ring * 0.5) % 1; context.globalAlpha = (1 - ringPhase) * ripple * 0.45; context.lineWidth = Math.max(1, width / 1080); context.beginPath(); context.arc(cx, cy, radius * (1 + ringPhase * 0.5), 0, Math.PI * 2); context.stroke(); } } context.restore();
  };
  recorder.start();
  await new Promise<void>((resolve, reject) => { const timer = window.setInterval(() => { if (signal?.aborted) { window.clearInterval(timer); recorder.stop(); reject(new DOMException('Export cancelled', 'AbortError')); return; } draw(); index += 1; onProgress?.(index / total); if (index >= total) { window.clearInterval(timer); recorder.stop(); resolve(); } }, 1000 / fps); });
  const blob = await new Promise<Blob>((resolve) => { recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType })); });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'mobile-wallpaper'}-${width}x${height}.webm`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  return { bytes: blob.size, format: 'webm' as const, blob };
}
