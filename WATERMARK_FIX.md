# Watermark cleanup 1.0.6

The shared cleanup worker used by Reveal, PLR and Landscape now reconstructs a
smaller mask at native image resolution. Originals remain immutable. This is
contextual reconstruction, not recovery of the exact scene behind an overlay.

## Changes

- Keep the generic glyph threshold at .40. For a faint upper-left badge, require
  a separately recognized bottom-right provider logo at .50, its expected native
  size/insets, and an upper-left border cue at .08. This low border threshold is
  conditional; it is never applied to arbitrary clean art by itself.
- If provider evidence exists but the upper-left cue is insufficient, retain an
  explicit region to inspect. Do not silently label that corner clean.
- Composite the actual dilated logo glyph mask. Fill the rounded AI badge's
  interior because its translucent backing also obscures the image. Include
  antialiasing outside template bounds without replacing the whole logo rectangle.
- Measure background texture outside the mask. Flat backgrounds use Telea;
  textured backgrounds use the existing pinned LaMa model.
- Use at least 512 pixels of real context where available. Run the fixed512
  model on overlapping native tiles for wider logos; do not shrink the crop and
  upscale its texture. If a small input requires reflected padding, reflect the
  mask too, so a duplicated watermark cannot appear as valid model context.
- Recheck both glyphs and, on the calibrated native layout, the independent AI
  border cue. Uncertain results open as reviewable candidates with warnings and
  region buttons rather than an exception with no editable image. Existing
  explicit inspection/approval gates still control final product exports.
- Propagate uncertainty from PLR processing into review. Importing a corrected
  PNG clears outdated warning flags, refreshes current warnings and resets approval.
- A changed worker hash changes the cleanup recipe, invalidating earlier cached
  outputs and recipe-bound approvals. Historical packages require rebuilding.

## Reproducible checks

```powershell
& $python integrations/manager-desktop/watermark-worker.test.py
npm run test:manager-integration
npm run build
node scripts/watermark-review-ui.mjs
& $python scripts/watermark-regression.py --batch $existingBatchReport --output real-test-output/watermark-fix/final-v3 --models $models
& $python scripts/watermark-format-regression.py --output real-test-output/watermark-fix/formats-v3 --models $models @existingImageFiles
node scripts/watermark-api-regression.mjs
& $python scripts/watermark-fix-report.py
```

The replay scripts only read existing provider images. They make no generation
requests and reserve no credits. The API test seeds verified real-worker results
in an isolated cache, then exercises the actual HTTP review gate and exact output
hashes. Its approvals are test fixtures, never production approvals. The UI test
uses a mock review response to exercise uncertain-corner warnings and inspection.

Five deterministic Python tests cover clean RGBA/source hashes, native tiling,
synthetic marks/unmasked pixel invariance, invisible alpha and reflected-mask
context. The Manager suite includes an uncertain-corner review/replacement case.

## Results on this machine

- 89 Manager tests and five Python regression tests passed; frontend build and
  desktop/mobile warning UI checks passed.
- Replayed 12 native2560×1440 landscapes (including all11 previously missed or
  ambiguous AI badges), two1440×2560 portraits and two2048-square stock images.
  All16 detected/processed both known marks and preserved native dimensions and
  every pixel outside the mask. Two clean controls had zero masked pixels; two
  cleaned outputs had zero masked pixels on a repeated cleanup.
- One landscape (#6) retains an uncertainty warning and visibly softer flowers
  inside the reconstructed badge. It requires inspection/correction before sale;
  passing technical invariants does not mean this image passes aesthetic review.
- Landscape masks use35,853 pixels instead of the former99,501 rectangular-mask
  pixels (about64% less area). Native replay startup took52.2 seconds; subsequent
  landscapes had a median25.8 seconds **within one Python process**. The regular
  cleanup API still starts a worker per uncached image and pays startup cost.
- Evidence: local `real-test-output/watermark-fix/review.html`, `final-v3`,
  `formats-v3`, `api` and `ui`. No new image generation or credit reservation.

## Practical limits

The border calibration comes from this provider corpus; it is not a universal
watermark detector. Fine foliage, thin branches and lines inside a repaired badge
can change. Warnings need visual inspection and possibly a corrected PNG. There
is no claim that every image is automatically ready to sell. The model remains
CPU based; uncached cleanup can take tens of seconds. A persistent worker and
independent OCR remain separate improvements, not features of this release.
