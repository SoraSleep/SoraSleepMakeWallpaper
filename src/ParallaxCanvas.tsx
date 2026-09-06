import { useEffect, useRef, useState } from 'react';
import type { ParallaxSettings } from './project/projectSchema';

type Props = {
  settings: ParallaxSettings;
  fit: 'cover' | 'contain';
  fps: number;
  onPerformance?: (metrics: { fps: number; frameMs: number }) => void;
};

function load(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Layer image could not be loaded.')); image.src = source;
  });
}

function drawDisplaced(context: CanvasRenderingContext2D, image: HTMLImageElement, depth: HTMLImageElement, mask: HTMLImageElement | null, width: number, height: number, camera: { x: number; y: number }, strength: number, fit: 'cover' | 'contain', quality: ParallaxSettings['quality']) {
  const base = fit === 'contain' ? Math.min(width / image.width, height / image.height) : Math.max(width / image.width, height / image.height);
  const dw = image.width * base; const dh = image.height * base; const ox = (width - dw) / 2; const oy = (height - dh) / 2;
  const depthCanvas = document.createElement('canvas'); depthCanvas.width = 64; depthCanvas.height = 64; const depthContext = depthCanvas.getContext('2d', { willReadFrequently: true }); if (!depthContext) { context.drawImage(image, ox, oy, dw, dh); return; } depthContext.drawImage(depth, 0, 0, 64, 64);
  const pixels = depthContext.getImageData(0, 0, 64, 64).data; const maskCanvas = mask ? document.createElement('canvas') : null; const maskContext = maskCanvas?.getContext('2d', { willReadFrequently: true }); if (maskCanvas && maskContext && mask) { maskCanvas.width = 64; maskCanvas.height = 64; maskContext.drawImage(mask, 0, 0, 64, 64); } const maskPixels = maskContext?.getImageData(0, 0, 64, 64).data; const cols = quality === 'economy' ? 12 : quality === 'premium' ? 36 : 24; const rows = quality === 'economy' ? 8 : quality === 'premium' ? 22 : 14; const sw = image.width / cols; const sh = image.height / rows;
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) { const sample = ((Math.floor(row * 64 / rows) * 64) + Math.floor(col * 64 / cols)) * 4; const depthValue = pixels[sample] / 255; const protection = maskPixels ? maskPixels[sample] / 255 : 1; const shiftX = (camera.x - 0.5) * strength * depthValue * protection * width * 0.08; const shiftY = (0.5 - camera.y) * strength * depthValue * protection * height * 0.08; context.drawImage(image, col * sw, row * sh, sw + 1, sh + 1, ox + col * sw * base + shiftX, oy + row * sh * base + shiftY, sw * base + 1, sh * base + 1); }
}

export function ParallaxCanvas({ settings, fit, fps, onPerformance }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ settings, fit, fps });
  const pointer = useRef({ x: 0.5, y: 0.5 });
  const camera = useRef({ x: 0.5, y: 0.5 });
  const callback = useRef(onPerformance);
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>('loading');
  latest.current = { settings, fit, fps }; callback.current = onPerformance;

  useEffect(() => {
    const canvas = canvasRef.current; const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    let disposed = false; let frame = 0; let paused = document.hidden; let last = performance.now(); let lastDraw = 0; let statAt = last; let frames = 0;
    const visible = settings.layers.filter((layer) => layer.visible && layer.asset?.source);
    setStatus(visible.length ? 'loading' : 'ready');
    Promise.all([Promise.all(visible.map(async (layer) => ({ layer, image: await load(layer.asset!.source) }))), settings.depthMap?.source ? load(settings.depthMap.source) : Promise.resolve(null), settings.distortionMask?.source ? load(settings.distortionMask.source) : Promise.resolve(null)]).then(([loaded, depthImage, maskImage]) => {
      if (disposed) return; setStatus('ready');
      const draw = (now: number) => {
        frame = requestAnimationFrame(draw); if (paused) { last = now; return; }
        const state = latest.current; if (lastDraw && now - lastDraw < 1000 / Math.max(1, state.fps)) return; lastDraw = now;
        const dt = Math.min((now - last) / 1000, 0.1); last = now;
        if (canvas.clientHeight > canvas.clientWidth && state.settings.mobile.input === 'auto' && !state.settings.mobile.reducedMotion) {
          const angle = now / 1000 / 8 * Math.PI * 2;
          pointer.current = { x: 0.5 + Math.cos(angle) * state.settings.mobile.strength / 100, y: 0.5 + Math.sin(angle) * state.settings.mobile.strength / 120 };
        }
        const response = state.settings.cameraMode === 'direct'
          ? 1
          : 1 - Math.exp(-(state.settings.cameraMode === 'inertia' ? 5 : 2 + state.settings.smoothing * 0.14) * dt);
        camera.current.x += (pointer.current.x - camera.current.x) * response;
        camera.current.y += (pointer.current.y - camera.current.y) * response;
        const ratio = Math.min(window.devicePixelRatio || 1, 2); const width = Math.max(1, Math.round(canvas.clientWidth * ratio)); const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        context.clearRect(0, 0, width, height); context.fillStyle = '#090b0e'; context.fillRect(0, 0, width, height);
        for (const { layer, image } of loaded) {
          if (!layer.visible) continue;
          const base = state.fit === 'contain' ? Math.min(width / image.width, height / image.height) : Math.max(width / image.width, height / image.height);
          // The layer must cover the camera excursion at its depth. Overscan
          // is applied on top of the user's scale so corners never reveal the
          // canvas background during parallax movement.
          const requiredScale = 1 + state.settings.overscan / 100 + state.settings.cameraStrength * layer.depth / 100;
          const scale = base * Math.max(layer.scale, requiredScale);
          const drawWidth = image.width * scale; const drawHeight = image.height * scale;
          const movement = state.settings.cameraStrength * layer.depth / 100;
          const cameraX = state.settings.axis === 'vertical' ? 0.5 : camera.current.x;
          const cameraY = state.settings.axis === 'horizontal' ? 0.5 : camera.current.y;
          const x = (width - drawWidth) / 2 + (cameraX - 0.5) * width * movement + width * layer.offsetX / 100;
          const y = (height - drawHeight) / 2 + (0.5 - cameraY) * height * movement + height * layer.offsetY / 100;
          if (state.settings.mode === 'depth-map' && depthImage && layer === loaded[0].layer) {
            drawDisplaced(context, image, depthImage, maskImage, width, height, camera.current, state.settings.depthPerspective / 20, state.fit, state.settings.quality);
          } else context.drawImage(image, x, y, drawWidth, drawHeight);
        }
        frames += 1; if (now - statAt >= 1000) { const measured = frames * 1000 / (now - statAt); callback.current?.({ fps: measured, frameMs: 1000 / Math.max(1, measured) }); statAt = now; frames = 0; }
      };
      frame = requestAnimationFrame(draw);
    }).catch(() => { if (!disposed) setStatus('error'); });
    const visibility = () => { paused = document.hidden; };
    const orientation = (event: DeviceOrientationEvent) => {
      if (latest.current.settings.mobile.input !== 'gyroscope') return;
      const gamma = Math.max(-30, Math.min(30, event.gamma ?? 0));
      const beta = Math.max(-30, Math.min(30, event.beta ?? 0));
      pointer.current = { x: 0.5 + gamma / 60, y: 0.5 + beta / 60 };
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('deviceorientation', orientation);
    return () => { disposed = true; cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('deviceorientation', orientation); };
  }, [settings.layers, settings.mode, settings.depthMap?.source, settings.distortionMask?.source, settings.depthPerspective, settings.quality]);

  return <><canvas ref={canvasRef} className="difference-lens-canvas" aria-label="Interactive layered parallax preview" onPointerMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); pointer.current = { x: (event.clientX - rect.left) / rect.width, y: 1 - (event.clientY - rect.top) / rect.height }; }} onPointerLeave={() => { pointer.current = { x: 0.5, y: 0.5 }; }} />{status !== 'ready' && <div className="renderer-state" role="status">{status === 'loading' ? 'Loading parallax layers…' : 'Parallax layer could not be loaded.'}</div>}</>;
}
