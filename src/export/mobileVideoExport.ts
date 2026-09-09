import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { prepareHiddenReveal } from './hiddenRevealFrame';
import { prepareParallaxVideo } from './parallaxVideoFrame';
import { drawTransitionFrame } from './transitionFrame';
import type { MotionPairProject } from '../project/projectSchema';

declare const VideoEncoder: any;
declare const VideoFrame: any;

type ExportMask = { width: number; height: number; data: Uint8ClampedArray } | null;

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`Could not load ${source}`)); image.src = source; });
}

function createMaskCanvas(mask: ExportMask) {
  if (!mask) return null;
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = mask.width;
  maskCanvas.height = mask.height;
  const maskContext = maskCanvas.getContext('2d');
  if (!maskContext) throw new Error('Could not create difference mask canvas.');
  const pixels = maskContext.createImageData(mask.width, mask.height);
  for (let index = 0; index < mask.data.length; index += 1) {
    const alpha = mask.data[index];
    const offset = index * 4;
    pixels.data[offset] = 255;
    pixels.data[offset + 1] = 255;
    pixels.data[offset + 2] = 255;
    pixels.data[offset + 3] = alpha;
  }
  maskContext.putImageData(pixels, 0, 0);
  return maskCanvas;
}

/**
 * The WebGL renderer treats alignment as an output UV -> source UV matrix.
 * Canvas draw transforms work in the opposite direction, so we rasterize a
 * fitted B image with the inverse matrix once and reuse it for every frame.
 */
export function createAlignedImage(image: HTMLImageElement, width: number, height: number, transform: MotionPairProject['alignment']['transform'], fit: 'cover' | 'contain' = 'cover') {
  const aligned = document.createElement('canvas');
  aligned.width = width;
  aligned.height = height;
  const context = aligned.getContext('2d');
  if (!context) throw new Error('Could not create aligned image canvas.');
  const scale = (fit === 'contain' ? Math.min : Math.max)(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const fitted = document.createElement('canvas');
  fitted.width = width;
  fitted.height = height;
  const fittedContext = fitted.getContext('2d');
  if (!fittedContext) throw new Error('Could not create fitted image canvas.');
  fittedContext.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);

  const [a, b, c, d, tx, ty] = transform;
  const determinant = a * d - b * c;
  if (Math.abs(determinant) < 1e-6) {
    context.drawImage(fitted, 0, 0);
    return aligned;
  }
  const ia = d / determinant;
  const ib = -b / determinant;
  const ic = -c / determinant;
  const id = a / determinant;
  const itx = (c * ty - d * tx) / determinant;
  const ity = (b * tx - a * ty) / determinant;
  context.setTransform(ia, ib * height / width, ic * width / height, id, itx * width, ity * height);
  context.drawImage(fitted, 0, 0, width, height);
  context.setTransform(1, 0, 0, 1, 0, 0);
  return aligned;
}

export async function exportMobileVideo(project: MotionPairProject, mask: ExportMask, onProgress?: (progress: number) => void, signal?: AbortSignal) {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') throw new Error('This browser does not support WebCodecs video export.');
  const [imageA, imageB] = await Promise.all([loadImage(project.assets.imageA.source), loadImage(project.assets.imageB.source)]);
  const { width, height, fps } = project.mobileRender;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false }); if (!context) throw new Error('Could not create video canvas.');
  const alignedImageB = createAlignedImage(imageB, width, height, project.alignment.transform, project.canvas.fit);
  const fittedA = createAlignedImage(imageA, width, height, [1, 0, 0, 1, 0, 0], project.canvas.fit);
  const hiddenReveal = prepareHiddenReveal(project, fittedA, alignedImageB, mask);
  const parallax = project.preset.id === 'layered-parallax';
  const drawParallax = await prepareParallaxVideo(project);
  const maskCanvas = createMaskCanvas(mask);
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: 'avc', width, height, frameRate: fps }, fastStart: 'in-memory' });
  let failure: Error | null = null;
  const encoderConfig = { codec: 'avc1.42001f', width, height, bitrate: project.mobileRender.quality === 'premium' ? 14_000_000 : project.mobileRender.quality === 'economy' ? 4_000_000 : 8_000_000, framerate: fps };
  if (typeof VideoEncoder.isConfigSupported === 'function') {
    const support = await VideoEncoder.isConfigSupported(encoderConfig);
    if (!support.supported) throw new Error(`H.264 export is not supported at ${width}×${height} and ${fps} FPS.`);
  }
  const encoder = new VideoEncoder({ output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta), error: (error: Error) => { failure = error; } });
  encoder.configure(encoderConfig);
  const encodeCanvas = async (index: number) => {
    if (failure) throw failure;
    // Keep at most one second of frames queued. This prevents 1080p exports
    // from retaining the entire animation in memory when hardware encoding is slow.
    if (encoder.encodeQueueSize >= fps) await encoder.flush();
    if (failure) throw failure;
    const frame = new VideoFrame(canvas, { timestamp: Math.round(index * 1_000_000 / fps) });
    try { encoder.encode(frame, { keyFrame: index % (fps * 2) === 0 }); } finally { frame.close(); }
  };
  const duration = project.mobileMotion.duration;
  const portal = project.preset.id === 'portal-reveal';
  const portalSettings = (project.presetSettings.portal ?? {}) as { glow?: number; ripple?: number; rippleEnabled?: boolean; reducedMotion?: boolean };
  for (let index = 0; index < Math.ceil(duration * fps); index += 1) {
    if (signal?.aborted) { encoder.close(); throw new DOMException('Export cancelled', 'AbortError'); }
    const time = index / fps; const phase = (time % duration) / duration; const angle = phase * Math.PI * 2;
    if (project.preset.id === 'before-after-sweep' || project.preset.id === 'transformation-loop') {
      drawTransitionFrame(context, project, fittedA, alignedImageB, width, height, time);
      await encodeCanvas(index);
      onProgress?.((index + 1) / Math.ceil(duration * fps)); continue;
    }
    const still = portalSettings.reducedMotion === true;
    const x = still ? 0.5 : project.mobileMotion.path === 'figure8' ? 0.5 + Math.sin(angle) * 0.22 : project.mobileMotion.path === 'breathe' ? 0.5 + Math.cos(angle) * 0.035 : project.mobileMotion.path === 'orbit' ? 0.5 + Math.cos(angle) * 0.2 : 0.5 - Math.cos(angle) * 0.17;
    const y = still ? 0.54 : project.mobileMotion.path === 'figure8' ? 0.5 + Math.sin(angle * 2) * 0.16 : project.mobileMotion.path === 'breathe' ? 0.54 + Math.sin(angle) * 0.035 : project.mobileMotion.path === 'orbit' ? 0.5 + Math.sin(angle) * 0.24 : 0.52 + Math.sin(angle) * 0.1;
    const scale = Math.max(width / imageA.width, height / imageA.height); const drawWidth = imageA.width * scale; const drawHeight = imageA.height * scale;
    if (hiddenReveal) {
      hiddenReveal(context, phase, x, y);
      await encodeCanvas(index);
      onProgress?.((index + 1) / Math.ceil(duration * fps)); continue;
    }
    context.clearRect(0, 0, width, height);
    if (parallax) {
      drawParallax!(context, width, height, x, y);
    } else context.drawImage(imageA, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    if (parallax) { await encodeCanvas(index); onProgress?.((index + 1) / Math.ceil(duration * fps)); continue; }
    const radius = project.lens.radius / 100 * Math.min(width, height); const cx = x * width; const cy = (1 - y) * height; const zoom = project.lens.magnification / 100;
    context.save(); context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.clip();
    if (portal) { context.globalAlpha = project.lens.revealIntensity / 100; context.drawImage(alignedImageB, 0, 0); }
    else { context.drawImage(imageA, cx - width / zoom / 2, cy - height / zoom / 2, width / zoom, height / zoom); if (maskCanvas) { const layer = document.createElement('canvas'); layer.width = width; layer.height = height; const layerContext = layer.getContext('2d')!; layerContext.drawImage(alignedImageB, cx - width / zoom / 2, cy - height / zoom / 2, width / zoom, height / zoom); layerContext.globalCompositeOperation = 'destination-in'; layerContext.drawImage(maskCanvas, cx - radius, cy - radius, radius * 2, radius * 2); context.globalAlpha = project.lens.revealIntensity / 100; context.drawImage(layer, 0, 0); } }
    context.restore(); const glow = portal ? Number(portalSettings.glow ?? 72) / 100 : 0; context.save(); context.strokeStyle = '#b9e472'; context.lineWidth = Math.max(2, width / 900) * (1 + glow); context.shadowColor = 'rgba(185,228,114,.9)'; context.shadowBlur = portal ? 12 + 24 * glow : 0; context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.stroke();
    if (portal && portalSettings.rippleEnabled !== false && !still) { const ripple = Number(portalSettings.ripple ?? 0) / 100; for (let ring = 0; ring < 2; ring += 1) { const ringPhase = (phase + ring * 0.5) % 1; context.globalAlpha = (1 - ringPhase) * ripple * 0.45; context.lineWidth = Math.max(1, width / 1080); context.beginPath(); context.arc(cx, cy, radius * (1 + ringPhase * 0.5), 0, Math.PI * 2); context.stroke(); } } context.restore();
    await encodeCanvas(index); onProgress?.((index + 1) / Math.ceil(duration * fps));
  }
  await encoder.flush(); encoder.close(); if (failure) throw failure; muxer.finalize();
  const blob = new Blob([target.buffer], { type: 'video/mp4' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'mobile-wallpaper'}-${width}x${height}.mp4`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0); return { bytes: target.buffer.byteLength, blob };
}
