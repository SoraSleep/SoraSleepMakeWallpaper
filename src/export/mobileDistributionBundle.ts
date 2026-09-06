import { strToU8, zipSync } from 'fflate';
import type { MotionPairProject } from '../project/projectSchema';

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function downloadMobileDistributionBundle(project: MotionPairProject, video: Blob) {
  const videoBytes = new Uint8Array(await video.arrayBuffer());
  const safe = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mobile-wallpaper';
  const extension = video.type.includes('webm') ? 'webm' : 'mp4';
  const imageResponse = await fetch(project.assets.imageA.source);
  const staticBytes = new Uint8Array(await imageResponse.arrayBuffer());
  const files: Record<string, Uint8Array> = {
    [`${safe}.${extension}`]: videoBytes,
    'static-fallback.jpg': staticBytes,
    'metadata.json': strToU8(JSON.stringify({ title: project.title, format: extension, width: project.mobileRender.width, height: project.mobileRender.height, fps: project.mobileRender.fps, duration: project.mobileMotion.duration, motion: project.mobileMotion.path }, null, 2)),
    'INSTALL.txt': strToU8('Android: import the video in Wallpaper Engine Mobile or set it as a video wallpaper in your launcher. For MP4, use the paired-device transfer or .mpkg import flow. WebM fallback is intended for Android/desktop players.\n'),
    'LICENSE.txt': strToU8('Commercial license reminder: verify rights for all artwork before distribution.\n'),
  };
  const hashes: Record<string, string> = {};
  for (const name of Object.keys(files).sort()) hashes[name] = await sha256(files[name]);
  files['sha256.json'] = strToU8(JSON.stringify(hashes, null, 2));
  files['manifest.json'] = strToU8(JSON.stringify({ manifestVersion: 1, packageType: 'mobile-wallpaper', title: project.title, video: `${safe}.${extension}`, staticFallback: 'static-fallback.jpg', files: hashes }, null, 2));
  const zip = zipSync(files, { level: 0, mtime: new Date(0) });
  const blob = new Blob([zip], { type: 'application/zip' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${safe}-mobile-bundle.zip`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  return { bytes: zip.byteLength, fileName: `${safe}-mobile-bundle.zip` };
}
