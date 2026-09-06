# M4 — Mobile alignment parity and export pipeline

Status: **Implemented; production build passes**

## Delivered

- Mobile MP4 export now applies the same six-value affine alignment transform used by the WebGL preview.
- B is cover-fitted to the selected mobile output dimensions, then rasterized with the inverse UV transform so exported pixels sample the aligned source correctly.
- Difference mask conversion is prepared once per export instead of once per frame.
- Existing motion paths, portrait presets, quality levels, FPS selection, progress reporting, and cancellation remain supported.

## Verification

```text
npm run build
TypeScript: PASS
Vite production build: PASS
```

## Remaining M4 validation

- Run a real 9:16 export in a WebCodecs-enabled Chromium browser and compare a frame against the Difference Lens preview.
- Validate playback on Android and iOS hardware.
- Add an encoder fallback for browsers without H.264 WebCodecs support.
