# U5 — Preset-aware editor shell

Status: **Complete**

## Delivered

- Extracted `EditorShell` as the shared desktop editor layout boundary.
- Extracted `EditorWorkflowRail` from `App.tsx`.
- Added `getEditorWorkflow(presetId)` so rail phases are chosen by preset instead of a global hard-coded list.
- Added `EditorStatusBar` showing preset identity, output resolution, target FPS and blocking validation count.
- Difference Lens is identified in the editor as `01 · Difference Lens`.
- Added the medium-desktop layout: at 1280–1599 px the workflow rail becomes icon-first, preserving more preview width while inspector remains available.

## Preserved behavior

- Image import/swap, alignment, difference mask editing, WebGL preview, autosave, mobile controls and exporters use their existing state and handlers.
- The Difference Lens workflow labels and phase order are unchanged.

## Files

- `src/editor/EditorShell.tsx`
- `src/editor/EditorWorkflowRail.tsx`
- `src/editor/editorWorkflow.ts`

## Verification

```text
npm run build
TypeScript: PASS
Vite production build: PASS
```
