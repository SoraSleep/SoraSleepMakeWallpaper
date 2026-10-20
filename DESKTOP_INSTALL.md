# SoraSleep MakeWallpaper desktop for Windows x64

The user-scope Setup installs the three core studios, an Electron window, Node, FFmpeg/FFprobe, a relocatable Python runtime with its image libraries and the BiRefNet lite segmentation model. Installed runtime tools are selected by absolute application paths; Node/Python/FFmpeg do not need to be installed separately. Image Dream remains a separate provider application: keep it running to generate through existing accounts and credits. The installer includes no accounts, prompts, batches, cookies or local configuration.

## Install and use

Run `SoraSleep-MakeWallpaper-Setup-1.0.3.exe`, choose a writable installation directory and open the desktop or Start menu shortcut. No administrator access is requested. This build is unsigned; it has no publisher certificate or automatic updater. The fixed Python runtime excludes pip/ensurepip development installers; they are not needed for image processing.

Choose Reveal, PLR Collection Studio or Landscape Batch. Use the Application menu to open the data folder or select the installed `SoraSleep Image Dream.exe`. Selecting Image Dream saves only its executable path in local configuration. It does not import account data. Closing MakeWallpaper while work is active is blocked; pause and wait for the current task, then close. The owned backend exits when idle. If its desktop owner disappears unexpectedly, it waits for in-flight work to become idle before exiting.

Application data lives in `%APPDATA%\SoraSleepMakeWallpaper`, outside the installed program. Uninstall preserves it. Existing Manager batches are left at their original location; the desktop starts with its own store to avoid two controllers modifying the same runs. Existing browser projects are also not automatically migrated into Electron browser storage. Keep originals/backups and explicitly import project files as needed.

Local endpoints are `http://127.0.0.1:17880` (studio), `17932` (desktop API), and `17897` (Image Dream provider). Close a portable launcher occupying17880 before starting desktop. Startup failures are reported, with logs in the application data folder. Runtime configuration is `runtime.local.json` there. Never point the desktop at a store while another controller is using it.

This packages the same core scope as the portable release. Experimental Artwork Plan/Product Center backend routes are not included. Technical QA and local inpainting do not guarantee aesthetic quality or a ready-to-sell product. Review outputs before publication.

## Automatic output cleanup in 1.0.2

Reveal A/B wallpaper assets, mobile MP4/WebM and static fallback images, Landscape downloads/ZIPs/thumbnails and PLR masters/transparent images/packages pass through one local cleanup service. It recognizes the known Dreamina bottom-right logo and upper-left AI badge at multiple scales. Detailed backgrounds use a pinned OpenCV LaMa ONNX model (92,591,623 bytes, Apache-2.0); flat regions use local inpainting. It preserves dimensions and all pixels outside the reconstructed rectangles, and retains original source files and hashes. Clean inputs are returned byte-for-byte. Model inference runs locally on CPU and consumes no generation credits. The first uncached image can take tens of seconds; subsequent exports reuse verified cached outputs.

Ambiguous detection, residual known marks, model/cache corruption and unavailable cleanup block export rather than returning an unprocessed product. Rebuild historical ZIPs created before this recipe. Editing backups and explicit before/after source previews retain originals. This recognizes two provider marks, not every possible logo, signature or text. Inspect restored regions at full size: inpainting reconstructs the scene and may change details within those regions. Generated-origin records remain in processing manifests; cleanup does not make AI artwork human-made.

For source builds, configure the model folder and run `npm run setup:watermark-model`; this downloads the pinned model and verifies SHA-256. The desktop installer bundles the model and its license, so installed use needs no model download.

## Build and verification

Install development dependencies with `npm ci`; configure `runtime.local.json` to locate the build machine's working Python environment and model folder. Run `npm run build` followed by `npm run build:desktop`. The preparer makes a new staging directory and refuses to overwrite one. `SORASLEEP_DESKTOP_STAGE` optionally sets its path. Electron/electron-builder/sharp versions are pinned. Runtime sources are copied from the configured working environment; the staged checksum inventory binds every shipped payload file. Build toolchain files are not included as app dependencies.

`node scripts/desktop-smoke.mjs "absolute path to SoraSleep MakeWallpaper.exe"` verifies payload hashes, runs actual segmentation inference with the bundled Python/model under a restricted PATH, opens the three core studios, checks mobile overflow and renderer isolation, then checks idle shutdown leaves no backend. It uses a temporary empty store and makes no generation requests. Running on this machine is not a fresh Windows VM certification. A fresh VM, signed release and automatic upgrade/rollback are separate release milestones.

Version1.0.3 adds persistent native-resolution output review and approval gates. Follow [the review workflow](VISUAL_REVIEW.md) before packaging products. The installer SHA-256 is `bd24d081028b98be3097d5e6f12f2e764716777fe22a44080be15ed2f3911d4e`.
