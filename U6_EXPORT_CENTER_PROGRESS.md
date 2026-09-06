# U6 — Export Center and result screen

Status: **Complete**

## Delivered

- Added a dedicated Export Center route.
- Replaced the inspector's direct export action with `Review in Export Center`.
- Added target cards for Windows Interactive and Android Portrait Video.
- Shows target-specific codec/container, output dimensions/FPS, estimated size and package contents before export.
- Consolidates desktop and mobile validator errors/warnings in a single export decision panel.
- Keeps export disabled while any blocking validation error exists.
- Added a result screen after successful export, summarising the downloaded package and intended installation target.
- Existing download behavior remains intact: desktop ZIP, mobile MP4/WebM plus mobile distribution bundle.

## Files

- `src/pages/ExportCenterPage.tsx`
- `src/pages/ExportResultPage.tsx`
- `src/app/routes.ts`

## Verification

```text
npm run build
TypeScript: PASS
Vite production build: PASS
```
