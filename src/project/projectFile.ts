import { MotionPairProject, parseProject, safeProjectFileName, serializeProject } from './projectSchema';
import { strToU8, zipSync } from 'fflate';
import { validatePackageFiles } from './packageValidator';

export function downloadProject(project: MotionPairProject) {
  const blob = new Blob([serializeProject(project)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeProjectFileName(project.title);
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function assetExtension(asset: MotionPairProject['assets']['imageA']) {
  const extension = asset.mimeType.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg');
  return extension && /^[a-z0-9]+$/i.test(extension) ? extension : 'bin';
}

async function readAsset(source: string) {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Could not package asset (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function encodeMaskPng(mask: { width: number; height: number; data: Uint8ClampedArray }) {
  const canvas = document.createElement('canvas');
  canvas.width = mask.width; canvas.height = mask.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create mask encoder.');
  const pixels = context.createImageData(mask.width, mask.height);
  for (let index = 0; index < mask.data.length; index += 1) {
    const output = index * 4; const value = mask.data[index];
    pixels.data[output] = pixels.data[output + 1] = pixels.data[output + 2] = value; pixels.data[output + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not encode difference mask.')), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

async function bakeAlignedPng(bytes: Uint8Array, mimeType: string, width: number, height: number, transform: MotionPairProject['alignment']['transform']) {
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: mimeType }));
  const source = document.createElement('canvas'); source.width = width; source.height = height;
  const sourceContext = source.getContext('2d');
  if (!sourceContext) throw new Error('Could not create alignment bake canvas.');
  sourceContext.drawImage(bitmap, 0, 0, width, height); bitmap.close();
  const output = document.createElement('canvas'); output.width = width; output.height = height;
  const context = output.getContext('2d');
  if (!context) throw new Error('Could not create aligned asset canvas.');
  const [a, b, c, d, tx, ty] = transform;
  context.setTransform(a, b, c, d, tx * width, ty * height);
  context.drawImage(source, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => output.toBlob((value) => value ? resolve(value) : reject(new Error('Could not encode aligned image.')), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

async function encodePreviewJpeg(bytes: Uint8Array, mimeType: string, width: number, height: number, maxWidth: number) {
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: mimeType }));
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create preview canvas.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not encode preview JPEG.')), 'image/jpeg', 0.9));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function exportWallpaperPackage(
  project: MotionPairProject,
  differenceMask?: { width: number; height: number; data: Uint8ClampedArray } | null,
) {
  const [imageA, imageB] = await Promise.all([readAsset(project.assets.imageA.source), readAsset(project.assets.imageB.source)]);
  const maskPng = differenceMask ? await encodeMaskPng(differenceMask) : null;
  const alignedB = await bakeAlignedPng(imageB, project.assets.imageB.mimeType, project.assets.imageA.width, project.assets.imageA.height, project.alignment.transform);
  const previewJpg = await encodePreviewJpeg(imageA, project.assets.imageA.mimeType, project.assets.imageA.width, project.assets.imageA.height, 1600);
  const thumbnailJpg = await encodePreviewJpeg(imageA, project.assets.imageA.mimeType, project.assets.imageA.width, project.assets.imageA.height, 512);
  const safeTitle = project.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'motion-pair-wallpaper';
  const config = {
    schemaVersion: 1,
    title: project.title,
    preset: project.preset.id,
    portal: project.presetSettings.portal ?? { glow: 72, ripple: 0 },
    canvas: project.canvas,
    lens: project.lens,
    mobileMotion: project.mobileMotion,
    mobileRender: project.mobileRender,
    alignment: project.alignment.transform,
    assets: { imageA: `assets/image-a.${assetExtension(project.assets.imageA)}`, imageB: 'assets/image-b-aligned.png' },
    differenceMask: differenceMask ? { width: differenceMask.width, height: differenceMask.height, asset: 'assets/difference-mask.png', data: Array.from(differenceMask.data) } : null,
  };
  const runtime = `const C=document.querySelector('canvas'),X=C.getContext('2d'),Q=window.WALLPAPER_CONFIG;let A=new Image(),B=new Image(),M=Q.differenceMask,MI=new Image(),P={x:.68,y:.6},T={...P},last=0;window.wallpaperPropertyListener={applyUserProperties:function(p){if(p.lensradius)Q.lens.radius=p.lensradius.value*100;if(p.magnification)Q.lens.magnification=p.magnification.value*100;if(p.feather)Q.lens.feather=p.feather.value*100;if(p.followspeed)Q.lens.followSpeed=p.followspeed.value;if(p.revealintensity)Q.lens.revealIntensity=p.revealintensity.value*100}};A.src=Q.assets.imageA;B.src=Q.assets.imageB;if(M&&M.asset)MI.src=M.asset;function fit(i){const s=Math.max(C.width/i.width,C.height/i.height),w=i.width*s,h=i.height*s;return{x:(C.width-w)/2,y:(C.height-h)/2,w,h}}function frame(t){const dt=Math.min((t-last)/1000,.1);last=t;P.x+=(T.x-P.x)*(1-Math.exp(-12*dt));P.y+=(T.y-P.y)*(1-Math.exp(-12*dt));if(A.complete&&B.complete){X.clearRect(0,0,C.width,C.height);const a=fit(A);X.drawImage(A,a.x,a.y,a.w,a.h);const r=Q.lens.radius/100*Math.min(C.width,C.height),cx=P.x*C.width,cy=(1-P.y)*C.height,z=Q.lens.magnification/100;X.save();X.beginPath();X.arc(cx,cy,r,0,Math.PI*2);X.clip();const zw=C.width/z,zh=C.height/z;X.drawImage(A,cx-zw/2,cy-zh/2,zw,zh);if(M&&!MI.complete){const o=document.createElement('canvas');o.width=M.width;o.height=M.height;const m=o.getContext('2d'),d=m.createImageData(M.width,M.height);for(let k=0;k<M.data.length;k++){d.data[k*4]=255;d.data[k*4+1]=255;d.data[k*4+2]=255;d.data[k*4+3]=M.data[k]}m.putImageData(d,0,0);const l=document.createElement('canvas');l.width=C.width;l.height=C.height;const lx=l.getContext('2d');lx.drawImage(B,cx-zw/2,cy-zh/2,zw,zh);lx.globalCompositeOperation='destination-in';lx.drawImage(o,cx-r,cy-r,r*2,r*2);X.globalAlpha=Q.lens.revealIntensity/100;X.drawImage(l,0,0)}if(MI.complete){const l=document.createElement('canvas');l.width=C.width;l.height=C.height;const lx=l.getContext('2d');lx.drawImage(B,cx-zw/2,cy-zh/2,zw,zh);lx.globalCompositeOperation='destination-in';lx.drawImage(MI,cx-r,cy-r,r*2,r*2);X.globalAlpha=Q.lens.revealIntensity/100;X.drawImage(l,0,0)}X.restore();X.strokeStyle='#b9e472';X.lineWidth=2;X.beginPath();X.arc(cx,cy,r,0,Math.PI*2);X.stroke()}requestAnimationFrame(frame)}C.onpointermove=e=>{const q=C.getBoundingClientRect();T={x:(e.clientX-q.left)/q.width,y:(e.clientY-q.top)/q.height}};function resize(){C.width=innerWidth*devicePixelRatio;C.height=innerHeight*devicePixelRatio}addEventListener('resize',resize);resize();requestAnimationFrame(frame);`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${project.title}</title><style>html,body,canvas{margin:0;width:100%;height:100%;overflow:hidden;background:#0b0d10}canvas{display:block}</style></head><body><canvas></canvas><script>window.WALLPAPER_CONFIG=${JSON.stringify(config)};<\/script><script src="runtime.js"><\/script></body></html>`;
  const projectJson = {
    title: project.title,
    description: `${project.preset.id === 'portal-reveal' ? 'Interactive Portal Reveal' : 'Interactive Difference Lens'} wallpaper generated by Motion Pair Studio.`,
    file: 'index.html',
    type: 'web',
    preview: 'preview.jpg',
    general: { properties: {
      lensradius: { order: 0, text: 'Lens radius', type: 'slider', value: project.lens.radius / 100, min: 0.08, max: 0.32 },
      magnification: { order: 1, text: 'Magnification', type: 'slider', value: project.lens.magnification / 100, min: 1, max: 2 },
      feather: { order: 2, text: 'Edge feather', type: 'slider', value: project.lens.feather / 100, min: 0.02, max: 0.3 },
      followspeed: { order: 3, text: 'Follow speed', type: 'slider', value: project.lens.followSpeed, min: 10, max: 100 },
      revealintensity: { order: 4, text: 'Reveal intensity', type: 'slider', value: project.lens.revealIntensity / 100, min: 0, max: 1 },
      ...(project.preset.id === 'portal-reveal' ? {
        portalglow: { order: 5, text: 'Portal glow', type: 'slider', value: Number((project.presetSettings.portal as { glow?: number } | undefined)?.glow ?? 72) / 100, min: 0, max: 1.5 },
        portalripple: { order: 6, text: 'Portal ripple', type: 'slider', value: Number((project.presetSettings.portal as { ripple?: number } | undefined)?.ripple ?? 0) / 100, min: 0, max: 1 },
      } : {}),
    } },
  };
  const files: Record<string, Uint8Array> = {
    'index.html': strToU8(html),
    'runtime.js': strToU8(runtime),
    'project.json': strToU8(JSON.stringify(projectJson, null, 2)),
    'config.json': strToU8(JSON.stringify(config, null, 2)),
    [`assets/image-a.${assetExtension(project.assets.imageA)}`]: imageA,
    'assets/image-b-aligned.png': alignedB,
    ...(maskPng ? { 'assets/difference-mask.png': maskPng } : {}),
    'preview.jpg': previewJpg,
    'thumbnail.jpg': thumbnailJpg,
    'INSTALL.txt': strToU8('Open index.html as a Web Wallpaper in Wallpaper Engine. All assets are local and the runtime makes no network requests.\n'),
    'LICENSE.txt': strToU8('Artwork license: verify and replace this notice before commercial distribution.\n'),
  };
  const fileValidationErrors = validatePackageFiles(files);
  if (fileValidationErrors.length > 0) throw new Error(`Package validation failed: ${fileValidationErrors[0]}`);
  const hashes: Record<string, string> = {};
  for (const name of Object.keys(files).sort()) hashes[name] = await sha256(files[name]);
  const manifest = {
    manifestVersion: 1,
    packageType: 'wallpaper-engine-web',
    title: project.title,
    entry: 'index.html',
    files: hashes,
  };
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
  files['sha256.json'] = strToU8(JSON.stringify(hashes, null, 2));
  const zip = zipSync(files, { level: 0, mtime: new Date(0) });
  const blob = new Blob([zip], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${safeTitle}.zip`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return { bytes: zip.byteLength, fileName: `${safeTitle}.zip` };
}

export async function readProjectFile(file: File) {
  if (file.size > 80 * 1024 * 1024) throw new Error('Project exceeds the 80 MB safety limit.');
  let value: unknown;
  try {
    value = JSON.parse(await file.text());
  } catch {
    throw new Error('The selected .wallproj file is not valid JSON.');
  }
  return parseProject(value);
}
