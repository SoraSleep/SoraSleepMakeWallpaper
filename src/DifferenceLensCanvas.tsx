import { useEffect, useRef, useState } from 'react';
import type { MaskStroke } from './project/projectSchema';

type DifferenceLensCanvasProps = {
  mode?: 'difference-lens' | 'portal-reveal';
  imageA: string;
  imageB: string;
  radius: number;
  feather: number;
  magnification: number;
  revealIntensity: number;
  portalGlow?: number;
  portalRipple?: number;
  portalRippleEnabled?: boolean;
  reducedMotion?: boolean;
  followSpeed: number;
  showDifference: boolean;
  fit: 'cover' | 'contain';
  alignment: [number, number, number, number, number, number];
  comparisonMode: 'composite' | 'overlay' | 'edges';
  differenceMask?: { width: number; height: number; data: Uint8ClampedArray } | null;
  maskTool?: Pick<MaskStroke, 'mode' | 'radius' | 'hardness'> | null;
  onMaskStroke?: (stroke: MaskStroke) => void;
  fps: number;
  onPerformance?: (metrics: { fps: number; frameMs: number }) => void;
  autoMotion?: { path: 'orbit' | 'figure8' | 'guided' | 'breathe'; duration: number; loop: 'repeat' | 'pingpong' } | null;
};

const vertexShader = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const fragmentShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uImageA;
uniform sampler2D uImageB;
uniform sampler2D uDifference;
uniform vec2 uPointer;
uniform float uRadius;
uniform float uFeather;
uniform float uZoom;
uniform float uReveal;
uniform float uLensOpacity;
uniform float uCanvasAspect;
uniform float uImageAspect;
uniform bool uShowDifference;
uniform bool uContain;
uniform mat3 uAlignment;
uniform int uComparisonMode;
uniform bool uPortal;
uniform float uPortalGlow;
uniform float uPortalRipple;
uniform float uTime;

vec3 srgbToLinear(vec3 color) {
  vec3 low = color / 12.92;
  vec3 high = pow((color + 0.055) / 1.055, vec3(2.4));
  return mix(low, high, step(vec3(0.04045), color));
}

vec3 linearToSrgb(vec3 color) {
  color = max(color, vec3(0.0));
  vec3 low = color * 12.92;
  vec3 high = 1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(vec3(0.0031308), color));
}

float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

vec2 imageUv(vec2 screenUv) {
  vec2 centered = screenUv - 0.5;
  if (uContain) {
    if (uCanvasAspect > uImageAspect) {
      centered.x *= uCanvasAspect / uImageAspect;
    } else {
      centered.y *= uImageAspect / uCanvasAspect;
    }
  } else {
    if (uCanvasAspect > uImageAspect) {
      centered.y *= uImageAspect / uCanvasAspect;
    } else {
      centered.x *= uCanvasAspect / uImageAspect;
    }
  }
  return centered + 0.5;
}

float insideImage(vec2 uv) {
  return step(0.0, uv.x) * step(0.0, uv.y) * step(uv.x, 1.0) * step(uv.y, 1.0);
}

void main() {
  vec2 screenDelta = vUv - uPointer;
  vec2 aspectDelta = vec2(screenDelta.x * uCanvasAspect, screenDelta.y);
  float distanceToPointer = length(aspectDelta);
  float lens = 1.0 - smoothstep(uRadius - uFeather, uRadius, distanceToPointer);
  lens *= uLensOpacity;

  float zoom = uPortal ? uZoom : mix(1.0, min(uZoom, 1.18), uLensOpacity);
  vec2 zoomedScreenUv = uPointer + screenDelta / zoom;
  vec2 baseUv = imageUv(vUv);
  vec2 zoomUv = imageUv(zoomedScreenUv);
  vec2 alignedBaseBUv = (uAlignment * vec3(baseUv, 1.0)).xy;
  vec2 alignedBUv = (uAlignment * vec3(zoomUv, 1.0)).xy;

  vec4 base = texture(uImageA, baseUv);
  base.rgb = srgbToLinear(base.rgb);
  float baseValid = insideImage(baseUv);
  base = mix(vec4(0.025, 0.028, 0.034, 1.0), base, baseValid);
  vec4 lensA = texture(uImageA, zoomUv);
  vec4 lensB = texture(uImageB, alignedBUv);
  lensA.rgb = srgbToLinear(lensA.rgb);
  lensB.rgb = srgbToLinear(lensB.rgb);
  float valid = insideImage(zoomUv) * insideImage(alignedBUv);
  lensA = mix(vec4(0.025, 0.028, 0.034, 1.0), lensA, valid);
  float difference = texture(uDifference, zoomUv).r * valid;
  difference = clamp(difference * uReveal, 0.0, 1.0);

  // Portal Reveal uses the portal as a clean window into image B. Difference
  // Lens keeps the analyzed-difference compositing behavior.
  vec4 insideLens = uPortal ? mix(lensA, lensB, uReveal) : mix(lensA, lensB, difference);
  vec4 composite = mix(base, insideLens, lens);
  if (!uPortal && uComparisonMode == 0 && !uShowDifference) {
    composite = mix(lensA, lensB, difference * smoothstep(0.3, 1.0, uLensOpacity));
  }

  if (uComparisonMode == 1) {
    vec4 alignedBaseB = texture(uImageB, alignedBaseBUv);
    alignedBaseB.rgb = srgbToLinear(alignedBaseB.rgb);
    float alignedValid = insideImage(baseUv) * insideImage(alignedBaseBUv);
    composite = mix(base, mix(base, alignedBaseB, 0.5), alignedValid);
  } else if (uComparisonMode == 2) {
    vec3 alignedBaseB = srgbToLinear(texture(uImageB, alignedBaseBUv).rgb);
    float lightA = luminance(base.rgb);
    float lightB = luminance(alignedBaseB);
    float edgeA = clamp(length(vec2(dFdx(lightA), dFdy(lightA))) * 8.0, 0.0, 1.0);
    float edgeB = clamp(length(vec2(dFdx(lightB), dFdy(lightB))) * 8.0, 0.0, 1.0);
    composite = vec4(edgeA, edgeB, min(edgeA, edgeB) * 0.35, 1.0);
  } else if (uShowDifference) {
    vec3 heat = mix(vec3(0.035, 0.045, 0.055), vec3(0.72, 0.9, 0.43), difference);
    composite.rgb = mix(base.rgb * 0.22, heat, 0.82);
  } else {
    float border = 1.0 - smoothstep(0.0025, 0.0065, abs(distanceToPointer - uRadius));
    float rippleWave = sin(distanceToPointer * 76.0 - uTime * 2.4) * 0.5 + 0.5;
    float rippleRing = smoothstep(0.0, 0.08, 0.08 - abs(fract(distanceToPointer * 8.0 - uTime * 0.22) - 0.5));
    float ripple = mix(rippleWave, rippleRing, 0.55);
    float ring = uPortal ? border * uPortalGlow : 0.0;
    composite.rgb = mix(composite.rgb, vec3(0.78, 0.94, 0.52), ring * uLensOpacity);
    if (uPortal) composite.rgb += vec3(0.18, 0.24, 0.12) * ripple * uPortalRipple * border * uLensOpacity;
  }

  outColor = vec4(linearToSrgb(composite.rgb), composite.a);
}`;

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${source}`));
    image.src = source;
  });
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not allocate WebGL shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Unknown shader compile error.';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext) {
  const program = gl.createProgram();
  if (!program) throw new Error('Could not allocate WebGL program.');
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'Unknown WebGL link error.';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function createTexture(gl: WebGL2RenderingContext, source: TexImageSource, unit: number) {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Could not allocate WebGL texture.');
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  return texture;
}

function limitPreviewTexture(image: HTMLImageElement, maxDimension: number): TexImageSource {
  const largest = Math.max(image.naturalWidth, image.naturalHeight);
  if (largest <= maxDimension) return image;
  const scale = maxDimension / largest;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return image;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function createDifferenceMap(
  imageA: HTMLImageElement,
  imageB: HTMLImageElement,
  alignment: [number, number, number, number, number, number],
) {
  const width = 512;
  const height = Math.max(1, Math.round(width * imageA.naturalHeight / imageA.naturalWidth));
  const canvasA = document.createElement('canvas');
  const canvasB = document.createElement('canvas');
  const mask = document.createElement('canvas');
  canvasA.width = canvasB.width = mask.width = width;
  canvasA.height = canvasB.height = mask.height = height;
  const contextA = canvasA.getContext('2d', { willReadFrequently: true });
  const contextB = canvasB.getContext('2d', { willReadFrequently: true });
  const maskContext = mask.getContext('2d');
  if (!contextA || !contextB || !maskContext) throw new Error('Canvas 2D is unavailable.');
  contextA.drawImage(imageA, 0, 0, width, height);
  contextB.drawImage(imageB, 0, 0, width, height);
  const pixelsA = contextA.getImageData(0, 0, width, height);
  const pixelsB = contextB.getImageData(0, 0, width, height);
  const output = maskContext.createImageData(width, height);

  for (let index = 0; index < output.data.length; index += 4) {
    const pixel = index / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const u = (x + 0.5) / width;
    const v = 1 - (y + 0.5) / height;
    const [a, b, c, d, tx, ty] = alignment;
    const bu = a * u + c * v + tx;
    const bv = b * u + d * v + ty;
    const bx = Math.max(0, Math.min(width - 1, Math.round(bu * width - 0.5)));
    const by = Math.max(0, Math.min(height - 1, Math.round((1 - bv) * height - 0.5)));
    const bIndex = (by * width + bx) * 4;
    const valid = bu >= 0 && bu <= 1 && bv >= 0 && bv <= 1;
    const red = valid ? Math.abs(pixelsA.data[index] - pixelsB.data[bIndex]) : 0;
    const green = valid ? Math.abs(pixelsA.data[index + 1] - pixelsB.data[bIndex + 1]) : 0;
    const blue = valid ? Math.abs(pixelsA.data[index + 2] - pixelsB.data[bIndex + 2]) : 0;
    const delta = Math.max(red, green, blue) / 255;
    // Ignore small generative/compression drift and retain deliberate color changes.
    const normalized = Math.max(0, Math.min(1, (delta - 0.1) / 0.1));
    const value = Math.round(normalized * normalized * (3 - 2 * normalized) * 255);
    output.data[index] = output.data[index + 1] = output.data[index + 2] = value;
    output.data[index + 3] = 255;
  }
  maskContext.putImageData(output, 0, 0);
  return mask;
}

function maskToCanvas(mask: { width: number; height: number; data: Uint8ClampedArray }) {
  const canvas = document.createElement('canvas');
  canvas.width = mask.width; canvas.height = mask.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable.');
  const pixels = context.createImageData(mask.width, mask.height);
  for (let index = 0; index < mask.data.length; index += 1) {
    const output = index * 4; const value = mask.data[index];
    pixels.data[output] = pixels.data[output + 1] = pixels.data[output + 2] = value;
    pixels.data[output + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

export function DifferenceLensCanvas({
  mode = 'difference-lens',
  imageA,
  imageB,
  radius,
  feather,
  magnification,
  revealIntensity,
  portalGlow = 72,
  portalRipple = 0,
  portalRippleEnabled = true,
  reducedMotion = false,
  followSpeed,
  showDifference,
  fit,
  alignment,
  comparisonMode,
  differenceMask,
  maskTool,
  onMaskStroke,
  fps,
  onPerformance,
  autoMotion,
}: DifferenceLensCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [contextGeneration, setContextGeneration] = useState(0);
  const [renderStatus, setRenderStatus] = useState<'ready' | 'lost' | 'unsupported' | 'error'>('ready');
  const initialPointer = (() => {
    const params = new URLSearchParams(window.location.search);
    const values = params.get('pointer')?.split(',').map(Number);
    return values && values.length === 2 && values.every(Number.isFinite)
      ? { x: Math.min(1, Math.max(0, values[0])), y: Math.min(1, Math.max(0, values[1])) }
      : { x: 0.68, y: 0.6 };
  })();
  const targetPointer = useRef(initialPointer);
  const currentPointer = useRef(initialPointer);
  const currentRadius = useRef(radius);
  const targetRadius = useRef(radius);
  const lastInteraction = useRef(0);
  const targetOpacity = useRef(0);
  const settings = useRef({ mode, radius, feather, magnification, revealIntensity, portalGlow, portalRipple, portalRippleEnabled, reducedMotion, followSpeed, showDifference, fit, comparisonMode, fps, autoMotion });
  const imageAspectRef = useRef(1);
  const strokePoints = useRef<Array<{ x: number; y: number }>>([]);
  const performanceCallback = useRef(onPerformance);

  settings.current = { mode, radius, feather, magnification, revealIntensity, portalGlow, portalRipple, portalRippleEnabled, reducedMotion, followSpeed, showDifference, fit, comparisonMode, fps, autoMotion };
  performanceCallback.current = onPerformance;

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl2', { alpha: false, antialias: true });
    if (!canvas) return;
    if (!gl) { setRenderStatus('unsupported'); return; }
    setRenderStatus('ready');
    let disposed = false;
    let animationFrame = 0;
    let previousTime = performance.now();
    let previousDrawTime = 0;
    let statsStartedAt = performance.now();
    let renderedFrames = 0;
    let renderScale = 1;
    let slowWindows = 0;
    let fastWindows = 0;
    let documentHidden = document.hidden;
    let inViewport = true;
    let drawFrame: ((now: number) => void) | null = null;
    const textures: WebGLTexture[] = [];
    let program: WebGLProgram;
    try {
      program = createProgram(gl);
    } catch {
      setRenderStatus('error');
      return;
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);

    const uniforms = {
      pointer: gl.getUniformLocation(program, 'uPointer'),
      radius: gl.getUniformLocation(program, 'uRadius'),
      feather: gl.getUniformLocation(program, 'uFeather'),
      zoom: gl.getUniformLocation(program, 'uZoom'),
      reveal: gl.getUniformLocation(program, 'uReveal'),
      opacity: gl.getUniformLocation(program, 'uLensOpacity'),
      canvasAspect: gl.getUniformLocation(program, 'uCanvasAspect'),
      imageAspect: gl.getUniformLocation(program, 'uImageAspect'),
      showDifference: gl.getUniformLocation(program, 'uShowDifference'),
      contain: gl.getUniformLocation(program, 'uContain'),
      alignment: gl.getUniformLocation(program, 'uAlignment'),
      comparisonMode: gl.getUniformLocation(program, 'uComparisonMode'),
      portal: gl.getUniformLocation(program, 'uPortal'),
      portalGlow: gl.getUniformLocation(program, 'uPortalGlow'),
      portalRipple: gl.getUniformLocation(program, 'uPortalRipple'),
      time: gl.getUniformLocation(program, 'uTime'),
    };
    const syncAnimation = () => {
      const active = !disposed && !documentHidden && inViewport && Boolean(drawFrame);
      canvas.dataset.animationActive = active ? 'true' : 'false';
      if (active && animationFrame === 0 && drawFrame) {
        previousTime = performance.now();
        animationFrame = requestAnimationFrame(drawFrame);
      } else if (!active && animationFrame !== 0) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };
    const handleVisibility = () => { documentHidden = document.hidden; syncAnimation(); };
    const handleContextLost = (event: Event) => { event.preventDefault(); setRenderStatus('lost'); };
    const handleContextRestored = () => { setRenderStatus('ready'); setContextGeneration((value) => value + 1); };
    document.addEventListener('visibilitychange', handleVisibility);
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    const viewportObserver = new IntersectionObserver(([entry]) => {
      inViewport = entry?.isIntersecting ?? false;
      syncAnimation();
    }, { threshold: 0.01 });
    viewportObserver.observe(canvas);

    const wallpaperWindow = window as Window & {
      wallpaperPropertyListener?: {
        applyGeneralProperties?: (properties: { fps?: number }) => void;
      };
    };
    const previousListener = wallpaperWindow.wallpaperPropertyListener;
    const installedListener = {
      ...previousListener,
      applyGeneralProperties: (properties: { fps?: number }) => {
        previousListener?.applyGeneralProperties?.(properties);
        if (typeof properties.fps === 'number') settings.current.fps = properties.fps;
      },
    };
    wallpaperWindow.wallpaperPropertyListener = installedListener;

    Promise.all([loadImage(imageA), loadImage(imageB)]).then(([loadedA, loadedB]) => {
      if (disposed) return;
      imageAspectRef.current = loadedA.naturalWidth / loadedA.naturalHeight;
      const difference = differenceMask ? maskToCanvas(differenceMask) : createDifferenceMap(loadedA, loadedB, alignment);
      const previewTextureLimit = Math.min(Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)), settings.current.fps <= 15 ? 2048 : 4096);
      const previewA = limitPreviewTexture(loadedA, previewTextureLimit);
      const previewB = limitPreviewTexture(loadedB, previewTextureLimit);
      canvas.dataset.textureLimit = String(previewTextureLimit);
      canvas.dataset.renderScale = String(renderScale);
      textures.push(createTexture(gl, previewA, 0), createTexture(gl, previewB, 1), createTexture(gl, difference, 2));
      gl.uniform1i(gl.getUniformLocation(program, 'uImageA'), 0);
      gl.uniform1i(gl.getUniformLocation(program, 'uImageB'), 1);
      gl.uniform1i(gl.getUniformLocation(program, 'uDifference'), 2);
      const [a, b, c, d, tx, ty] = alignment;
      gl.uniformMatrix3fv(uniforms.alignment, false, new Float32Array([a, b, 0, c, d, 0, tx, ty, 1]));

      drawFrame = (now: number) => {
        animationFrame = 0;
        if (disposed || documentHidden || !inViewport) return;
        animationFrame = requestAnimationFrame(drawFrame!);
        if (gl.isContextLost()) { previousTime = now; return; }
        const fpsLimit = Math.max(1, settings.current.fps);
        const frameInterval = 1000 / fpsLimit;
        const elapsedSinceDraw = now - previousDrawTime;
        // rAF timestamps fluctuate around the requested interval. A small
        // tolerance avoids turning a 30 FPS target into every third 60 Hz tick.
        if (previousDrawTime > 0 && elapsedSinceDraw < frameInterval * 0.8) return;
        previousDrawTime = previousDrawTime > 0 ? now - elapsedSinceDraw % frameInterval : now;
        const delta = Math.min((now - previousTime) / 1000, 0.1);
        previousTime = now;
        const state = settings.current;
        currentRadius.current += (targetRadius.current - currentRadius.current) * (1 - Math.exp(-10 * delta));
        if (state.autoMotion && !state.reducedMotion && (now - lastInteraction.current > 1200)) {
          const phaseBase = (now / 1000 % state.autoMotion.duration) / state.autoMotion.duration;
          const phase = state.autoMotion.loop === 'pingpong' ? 0.5 - Math.abs(phaseBase - 0.5) : phaseBase;
          const angle = phase * Math.PI * 2;
          if (state.autoMotion.path === 'orbit') targetPointer.current = { x: 0.5 + Math.cos(angle) * 0.2, y: 0.5 + Math.sin(angle) * 0.24 };
          else if (state.autoMotion.path === 'figure8') targetPointer.current = { x: 0.5 + Math.sin(angle) * 0.22, y: 0.5 + Math.sin(angle * 2) * 0.16 };
          else if (state.autoMotion.path === 'breathe') targetPointer.current = { x: 0.5 + Math.cos(angle) * 0.035, y: 0.54 + Math.sin(angle) * 0.035 };
          else targetPointer.current = { x: 0.33 + phase * 0.34, y: 0.62 - Math.sin(phase * Math.PI) * 0.2 };
          targetOpacity.current = state.mode === 'portal-reveal' ? 1 : (1 - Math.cos(phaseBase * Math.PI * 2)) / 2;
        }
        const response = 1 - Math.exp(-(2 + state.followSpeed * 0.14) * delta);
        currentPointer.current.x += (targetPointer.current.x - currentPointer.current.x) * response;
        currentPointer.current.y += (targetPointer.current.y - currentPointer.current.y) * response;
        const currentOpacity = Number(canvas.dataset.opacity ?? '0');
        const nextOpacity = currentOpacity + (targetOpacity.current - currentOpacity) * (1 - Math.exp(-8 * delta));
        canvas.dataset.opacity = String(nextOpacity);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2) * renderScale;
        const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
        const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        gl.viewport(0, 0, width, height);
        gl.uniform2f(uniforms.pointer, currentPointer.current.x, currentPointer.current.y);
        gl.uniform1f(uniforms.radius, currentRadius.current / 100);
        gl.uniform1f(uniforms.feather, Math.max(0.003, currentRadius.current / 100 * state.feather / 100));
        gl.uniform1f(uniforms.zoom, state.magnification / 100);
        gl.uniform1f(uniforms.reveal, state.revealIntensity / 100);
        gl.uniform1f(uniforms.opacity, nextOpacity);
        gl.uniform1f(uniforms.canvasAspect, width / height);
        gl.uniform1f(uniforms.imageAspect, loadedA.naturalWidth / loadedA.naturalHeight);
        gl.uniform1i(uniforms.showDifference, state.showDifference ? 1 : 0);
        gl.uniform1i(uniforms.contain, state.fit === 'contain' ? 1 : 0);
        gl.uniform1i(uniforms.comparisonMode, state.comparisonMode === 'overlay' ? 1 : state.comparisonMode === 'edges' ? 2 : 0);
        gl.uniform1i(uniforms.portal, state.mode === 'portal-reveal' ? 1 : 0);
        gl.uniform1f(uniforms.portalGlow, state.portalGlow / 100);
        gl.uniform1f(uniforms.portalRipple, state.portalRippleEnabled && !state.reducedMotion ? state.portalRipple / 100 : 0);
        gl.uniform1f(uniforms.time, now / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        renderedFrames += 1;
        const statsWindow = now - statsStartedAt;
        if (statsWindow >= 1000) {
          const measuredFps = renderedFrames * 1000 / statsWindow;
          performanceCallback.current?.({ fps: measuredFps, frameMs: 1000 / Math.max(measuredFps, 1) });
          const targetFps = Math.max(1, settings.current.fps);
          slowWindows = measuredFps < targetFps * 0.8 ? slowWindows + 1 : 0;
          fastWindows = measuredFps > targetFps * 0.94 ? fastWindows + 1 : 0;
          if (slowWindows >= 2 && renderScale > 0.5) {
            renderScale = Math.max(0.5, renderScale - 0.25); slowWindows = 0; fastWindows = 0;
          } else if (fastWindows >= 4 && renderScale < 1) {
            renderScale = Math.min(1, renderScale + 0.25); slowWindows = 0; fastWindows = 0;
          }
          canvas.dataset.renderScale = String(renderScale);
          renderedFrames = 0;
          statsStartedAt = now;
        }
      };
      syncAnimation();
    }).catch((error) => {
      canvas.dataset.error = error instanceof Error ? error.message : 'Unable to initialize preview.';
      setRenderStatus('error');
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      canvas.dataset.animationActive = 'false';
      viewportObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      if (wallpaperWindow.wallpaperPropertyListener === installedListener) {
        wallpaperWindow.wallpaperPropertyListener = previousListener;
      }
      textures.forEach((texture) => gl.deleteTexture(texture));
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [alignment, contextGeneration, differenceMask, imageA, imageB]);

  const pointerToImageUv = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const screen = { x: (event.clientX - rect.left) / rect.width, y: 1 - (event.clientY - rect.top) / rect.height };
    let x = screen.x - 0.5; let y = screen.y - 0.5;
    const canvasAspect = rect.width / rect.height;
    const imageAspect = imageAspectRef.current;
    if (settings.current.fit === 'contain') {
      if (canvasAspect > imageAspect) x *= canvasAspect / imageAspect;
      else y *= imageAspect / canvasAspect;
    } else if (canvasAspect > imageAspect) y *= imageAspect / canvasAspect;
    else x *= canvasAspect / imageAspect;
    return { x: x + 0.5, y: y + 0.5 };
  };

  return (
    <>
    <canvas
      ref={canvasRef}
      className="difference-lens-canvas"
      data-tool={maskTool?.mode ?? 'lens'}
      aria-label="Interactive difference lens preview"
      onPointerMove={(event) => {
        lastInteraction.current = performance.now();
        const rect = event.currentTarget.getBoundingClientRect();
        targetPointer.current = {
          x: (event.clientX - rect.left) / rect.width,
          y: 1 - (event.clientY - rect.top) / rect.height,
        };
        if (settings.current.mode === 'portal-reveal') targetOpacity.current = 1;
        if (maskTool && event.buttons === 1) {
          const point = pointerToImageUv(event);
          const previous = strokePoints.current.at(-1);
          if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > 0.003) strokePoints.current.push(point);
        }
      }}
      onPointerDown={(event) => {
        if (!maskTool && settings.current.mode !== 'portal-reveal') targetOpacity.current = 1;
        event.currentTarget.setPointerCapture(event.pointerId);
        lastInteraction.current = performance.now();
        if (settings.current.mode === 'portal-reveal' && !settings.current.reducedMotion) targetRadius.current = Math.min(42, radius * 1.45);
        if (maskTool) strokePoints.current = [pointerToImageUv(event)];
      }}
      onPointerUp={(event) => {
        if (settings.current.mode !== 'portal-reveal') {
          targetOpacity.current = 0;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (!maskTool) {
          if (settings.current.mode === 'portal-reveal') {
            targetRadius.current = radius;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          return;
        }
        if (strokePoints.current.length === 0) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        onMaskStroke?.({
          id: globalThis.crypto?.randomUUID?.() ?? `stroke-${Date.now()}`,
          mode: maskTool.mode,
          radius: maskTool.radius,
          hardness: maskTool.hardness,
          points: strokePoints.current,
        });
        strokePoints.current = [];
      }}
      onPointerCancel={() => { targetOpacity.current = 0; targetRadius.current = radius; strokePoints.current = []; }}
      onPointerEnter={() => { if (settings.current.mode === 'portal-reveal') targetOpacity.current = 1; }}
      onPointerLeave={(event) => {
        // Touch pointers should keep the portal visible after a drag ends;
        // mouse pointers fade it when leaving the preview surface.
        if (event.pointerType !== 'touch' && settings.current.mode !== 'portal-reveal') targetOpacity.current = 0;
      }}
    />
    {renderStatus !== 'ready' && <div className="renderer-state" role="status">
      {renderStatus === 'lost' ? 'GPU context lost · recovering…' : renderStatus === 'unsupported' ? 'WebGL 2 is required for Difference Lens.' : 'Renderer initialization failed.'}
    </div>}
    </>
  );
}
