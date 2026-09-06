# M7 — Mobile distribution bundle

Status: **Implemented; production build passes**

Mobile export now downloads the encoded video and a companion `*-mobile-bundle.zip` containing:

- MP4 or WebM video with the selected portrait settings.
- `static-fallback.jpg` for launchers that need a static image.
- `metadata.json` with title, dimensions, FPS, duration and motion path.
- `INSTALL.txt` with Android Wallpaper Engine transfer/import guidance.
- `LICENSE.txt` commercial rights reminder.
- `manifest.json` and `sha256.json` checksums.

The bundle is deterministic at the ZIP level (`mtime` fixed) and contains no source project or cache files.

Verification: `npm run build` passes TypeScript and Vite production compilation.
