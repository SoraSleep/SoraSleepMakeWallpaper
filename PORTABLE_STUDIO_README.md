# SoraSleep Studio — local web build

This package contains the built frontend, Manager PLR/Landscape integration backend, region-editor integration source and local launcher. It is a portable web build, not an installed Electron desktop application.

## Start on Windows

1. Extract the ZIP into a user-writable folder. Install Node 24+, FFmpeg/FFprobe and keep Image Dream running locally.
2. Copy `runtime.example.json` to `runtime.local.json`. Set dataRoot to the existing batch store if continuing an installation. Configure Python/models for transparent PLR output. Never point a new installation at another active controller's store.
3. Run `powershell -File launch-studio.ps1`, or run `node scripts/runtime-check.mjs` then `node scripts/studio-launch.mjs` from the extracted folder. Keep the terminal running.
4. Open http://127.0.0.1:17880. The frontend uses the configured Manager port injected by the launcher. Close with Ctrl+C when work is idle.

The default config stores no account details. Accounts remain managed by your existing Image Dream. The ZIP excludes runtime.local.json, profiles, source/test outputs and private batch data. `checksums.json` lists delivered files. The adjacent `.sha256` file verifies the archive.

The portable server mirrors Reveal project/export PUT requests locally under WallpaperMirror beside the configured batch store; browser autosave and downloads remain available. Experimental Artwork Plan/Product Center server workflows are not included in this core portable launcher; use the development/full Manager integration for those routes.

## Reviewed outputs and QA

Expand a gallery image's reviewed PNG section, confirm it belongs to that original, then import a PNG at the same native dimensions (up to20MB). Export original, reviewed-only (all chosen images need a valid reviewed PNG), or both. This preserves originals and verifies source/derived hashes. Importing a reviewed PNG does not certify watermark removal or aesthetics.

QA has a persistent decode cache, progress and cancellation after the current image. Source hashes are verified again. Export checks QA within the chosen scope.

## Image Dream editor integration

The files under integrations/image-dream are integration sources for a compatible Image Dream project. They are not automatically installed over a running application. Painted-mask controls appear only when the Image Dream backend advertises customMask support. Preview and inspect output before saving; local inpainting can blur complex textures. The background mask worker is verified to preserve pixels outside its selected mask, not to guarantee sale-ready cleanup.

## Release limits

No bundled Node/Python/FFmpeg, no code signing, no installer/update rollback and no clean-machine certification yet. Runtime checking confirms locally installed tools. Refer to the repository release audit for remaining Windows release milestones.
