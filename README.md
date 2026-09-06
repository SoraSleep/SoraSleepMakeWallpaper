# Motion Pair Studio

Interactive UI prototype for a desktop app that turns two related images into an offline Wallpaper Engine web wallpaper.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Production build

```bash
npm run build
```

## Prototype scope

- Five-step workflow: Import, Align, Motion, Effects and Export.
- Local image selection for A/B.
- Pointer-controlled reveal preview.
- Reveal, Hybrid and Morph preview modes.
- Interactive motion controls, timeline and effect toggles.
- Step-specific inspectors and export summary.

The current quality metrics and flow preview are presentation data. Computer-vision alignment, optical flow, mask editing and Wallpaper Engine export are specified in `IMPLEMENTATION_BACKLOG.md` and are the next implementation stages.
