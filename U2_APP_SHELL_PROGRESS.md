# U2 — Application shell and route states

Status: **Complete**

## Delivered

- Added route state for `Projects`, `Preset Library`, `Create Project`, and `Editor`.
- Added a Projects home with recent-project resume, open-project and new-wallpaper actions.
- Added Preset Library driven by `listPresets()`; only implemented presets are shown.
- Added Create Project target selection for desktop, mobile or both.
- Preserves the existing Difference Lens editor as the Editor route, including processing, autosave, preview and export.
- Project target is now persisted through the v2 project schema.
- Added a 1440×900 UI regression baseline at `ui-audit/u2/projects-1440x900.png`.

## Deliberate scope boundary

Create Project does not yet validate/upload assets. U4 owns the full input wizard and rights gate. The U2 page only creates a navigation and target-selection boundary.

## Verification

```text
npm run build
TypeScript: PASS
Vite production build: PASS
```
