# U4 — Create Project wizard

Status: **Complete**

## Delivered

- Four-step wizard: project identity, input pair, canvas/delivery, commercial rights.
- Input slots are presented from the selected preset's contract.
- Reuses the existing image import worker for A/B replacement; no duplicate import pipeline.
- Shows asset dimensions, file size and import progress.
- Supports Desktop Web, Mobile Video and Both targets.
- Mobile target defaults the canvas to 9:16.
- Provides aspect presets: 16:9, 21:9, 32:9, 9:16 and native.
- Requires a non-empty title and verified commercial rights for both images.
- Blocks mobile entry when A/B aspect ratio delta exceeds the portrait compatibility threshold.
- Sticky project check makes blocking reason visible beside the form.

## Validation boundary

The wizard validates input readiness only. Alignment quality and difference-mask acceptance remain editor/export validation because they require processing after import.

## Verification

```text
npm run build
TypeScript: PASS
Vite production build: PASS
```
