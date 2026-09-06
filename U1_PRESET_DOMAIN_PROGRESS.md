# U1 — Preset domain model and project migration

Status: **Complete**

## Delivered

- Added preset domain types: target, input slots, workflow phases, capabilities and descriptor metadata.
- Added `difference-lens@1` as the first registry entry, displayed internally as preset `01`.
- Upgraded the project schema from v1 to v2.
- Added a pure `migrateProject()` step that maps legacy v1 projects to:

```json
{
  "preset": { "id": "difference-lens", "version": 1 },
  "target": "both"
}
```

- Preserves existing `lens`, `mobileMotion`, `mobileRender`, alignment, difference mask data, assets and canvas data.
- New v2 projects store `presetSettings` and `exportSettings` while legacy fields remain in place during the staged UI migration.
- Autosave and imported `.wallproj` files both use `parseProject()`, so both paths receive the same migration.

## Boundaries intentionally not changed in U1

- The current editor UI remains Difference Lens-only.
- No existing renderer, processing worker, exporter, or validator behavior changed.
- Registry does not expose unimplemented presets yet.

## Verification

```text
npm run build
TypeScript: PASS
Vite production build: PASS
```

## U2 handoff

U2 can build page-level routing and the app shell around `listPresets()` / `getPreset()` without adding hard-coded preset branches to the editor.
