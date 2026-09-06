# M5 — Encoder compatibility fallback

Status: **Implemented; production build passes**

## Delivered

- Mobile export first attempts H.264 WebCodecs MP4.
- If WebCodecs/H.264 is unavailable, the app automatically falls back to `MediaRecorder`.
- Fallback downloads a WebM video with the selected portrait resolution, FPS, duration, motion path, and progress reporting.
- Export status now distinguishes MP4 from WebM fallback.
- Cancellation and unsupported-browser errors are surfaced in the project notice.

## Verification

```text
npm run build
TypeScript: PASS
Vite production build: PASS
```

## Compatibility note

WebM fallback is useful on Android and desktop Chromium, but iOS playback support is less consistent than H.264 MP4. For commercial iOS delivery, use a WebCodecs-capable browser or transcode the WebM fallback to H.264 before sale.
