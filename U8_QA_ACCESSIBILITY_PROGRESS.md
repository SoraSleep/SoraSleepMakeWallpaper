# U8 — Responsive QA and accessibility

Status: **Complete for the current desktop scope**

## QA delivered

- Repeatable Chrome headless screenshot script at 1280×720, 1440×900 and 1920×1080.
- Baselines generated under `ui-audit/u8/`.
- Confirmed Projects page layout at 1280×720 has no horizontal overflow and preserves action hierarchy.
- Added 1280 px layout adjustments for hub pages, cards, presets and wizard sidebar.
- Kept editor's medium-desktop icon rail introduced in U5.

## Accessibility delivered

- Preset drawer closes with Escape.
- Preview mode controls expose `tablist`, `tab` and `aria-selected` semantics.
- Editor settings icon now has an accessible name.
- Existing visible focus ring remains on buttons, inputs and selects.
- Existing reduced-motion media query remains active across all new pages.

## Files

- `scripts/capture-ui-baselines.ps1`
- `ui-audit/u8/projects-1280x720.png`
- `ui-audit/u8/projects-1440x900.png`
- `ui-audit/u8/projects-1920x1080.png`

## Verification

```text
npm run build
TypeScript: PASS
Vite production build: PASS
```

## Remaining QA outside this local pass

- Real keyboard-only walkthrough in a production browser.
- Screen-reader testing with NVDA/VoiceOver.
- Hardware/video encode playback matrix on Android and iOS.
