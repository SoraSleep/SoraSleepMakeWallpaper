# SoraSleep MakeWallpaper

Local studios for interactive A/B wallpapers and static image collections generated through the user's Image Dream application.

- **Reveal Studio:** Difference Lens and Portal Reveal modes in one preset, A/B image preparation, alignment, editing and wallpaper export.
- **PLR Collection Studio:** import a prompt list, generate static collections, optionally process transparent backgrounds, review, and package selected outputs.
- **Landscape Batch:** up to 500 verbatim prompts with supported free-model settings, budget checks, durable task identities, resume/reconciliation, gallery selection, technical QA and split ZIP export.

Image Dream owns provider login and generation credits. MakeWallpaper does not ship account profiles or replace Image Dream. Generated images require visual review; technical QA does not certify aesthetics or watermark cleanup. Live scale evidence currently covers 50 prompts, not a 500-image live run.

## Windows desktop

The user-scope 1.0.1 installer bundles Electron, Node, FFmpeg/FFprobe, Python image libraries and the BiRefNet lite model. See [desktop installation and build instructions](DESKTOP_INSTALL.md). The desktop uses its own persistent data folder and leaves existing Manager/browser stores in place. Experimental Artwork Plan/Product Center backend routes are outside the packaged core scope.

The release is unsigned. A fresh Windows VM test and an automatic updater are not yet certified. Installer binaries, model weights, private stores and test media are intentionally excluded from Git.

## Development

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Configure the ignored `runtime.local.json` from `runtime.example.json` before running the local Manager integration. Use `npm run dev:plr-manager` only when another controller is not already running against the same store. Keep Image Dream running for generation.

```sh
npm run build
npm run build:desktop
```

Building the full desktop runtime requires a configured working Python environment and local segmentation model directory. The preparer creates a new staging directory, includes runtime checksums and excludes private configuration and data. Windows x64 is the current desktop target.

## Checks and reports

```sh
npm run test:manager-integration
npm run test:portable-runtime
node scripts/desktop-smoke.mjs "absolute path to SoraSleep MakeWallpaper.exe"
```

The desktop smoke test verifies installed payload hashes, bundled runtime execution, model inference, WebGL2/H.264 support, downloads, three studio entry points, renderer isolation and idle shutdown. It uses an isolated store and an existing local image fixture, without generating new images. See [pipeline results](UPGRADE_RESULT_2026-10-19.md) and [desktop release results](DESKTOP_RESULT_2026-10-19.md) for measured limits. The portable web ZIP remains available separately; its external runtime requirements are described in [the portable guide](PORTABLE_STUDIO_README.md).
