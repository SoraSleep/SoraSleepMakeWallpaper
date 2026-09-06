# U7 — Multi-preset foundation

Status: **Foundation complete**

## Added presets

| Preset | Id | State | Target |
|---|---|---|---|
| 02 — Portal Reveal | `portal-reveal` | Ready | Desktop, mobile, both |
| 03 — Before / After Sweep | `before-after-sweep` | Beta | Desktop, mobile, both |
| 04 — Transformation Loop | `transformation-loop` | Beta | Mobile video |

## Delivered

- Expanded preset ids and project schema validation.
- Added separate descriptor/default settings/workflow/capability contracts for all three presets.
- Projects now persist the selected preset instead of always reverting to Difference Lens.
- Create Project applies supported-target restrictions. Transformation Loop defaults to mobile video and disables unsupported delivery targets.
- Editor status and Lens-phase header reflect the selected preset.
- Workflow rail changes by preset: Sweep and Transformation omit mask work; Portal uses the shared difference-mask path.
- Preset Library shows Ready/Beta state.
- Commercial validator blocks Beta presets, preventing a misleading sale-ready export.

## Renderer status

Portal Reveal is implemented through the shared masked reveal renderer: the portal moves over the aligned pair and reveals approved differences. Before / After Sweep and Transformation Loop are registered as beta contracts but require their own sweep/transition renderer and matching video exporter before commercial release.

## Verification

```text
npm run build
TypeScript: PASS
Vite production build: PASS
```
