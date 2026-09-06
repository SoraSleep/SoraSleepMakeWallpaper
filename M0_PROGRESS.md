# M0 — Mobile input contract

Status: **portrait foundation implemented**

- Added persisted 9:16 portrait canvas support.
- Added safe-area state for status bar, navigation bar and side/launcher clearance.
- Shows a dashed safe-area overlay only in 9:16 preview mode.
- Added portrait aspect-ratio quality gate: a mismatch above 0.5% blocks the transition to alignment.
- Existing import worker already applies EXIF orientation through `createImageBitmap(..., { imageOrientation: 'from-image' })` and validates PNG/JPEG/WebP, 512px minimum and 8K maximum.
- Existing 9:16 visual matrix remains part of the renderer test plan.

Next M0 task: phone-home-screen/lock-screen overlay templates and mobile target resolution presets (720p/1080p/1440p).
