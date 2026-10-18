# Integration completion audit — 15/10/2026

## Delivered and verified this iteration

- Product Center UI: seller/support/SKU/version/license/description/AI disclosure, artifact upload, generated cover/layout sheet/mockup and review bundle download.
- Durable product ZIPs and history in Data/Wallpaper/Products, revision per SKU. Browser test verified save/download/reload with actual rendered MP4.
- Image Dream A adapter: revision-bound submission, durable request status, deduplication, uncertain-submit protection, matching result metadata by request ID. UI requires explicit submit. Live provider generation NOT tested.
- Real output tests: both default presets export MP4 H.264 432×768/24fps, exactly 3 seconds; VP9 WebM decoded (duration short by about 0.14 sec). Desktop packages open in browser. JPEG fallback validated. Pre-abort test passes.
- Pixel isolation tests pass on shipped desktop runtime: Portal preserves A outside portal; Hidden Reveal only changes masked region on hold.
- Marketing pipeline generated cover, contact sheet, mockup and watermarked teaser from actual rendered clips; review ZIPs saved under real-test-output/.
- Eight unit/integration tests, prior 20-case plumbing pilot and production build passed. Product UI end-to-end passed.

## Blockers to full automatic prompt-to-product completion

1. Image Dream is not listening on configured default 3000 during checks. Its real code inspected does not implement reference/mask upload into provider generation. Automatic B requires a verified editing provider/adapter; text-to-image twice cannot replace it.
2. No Android test connection was established; Wallpaper Engine app installation and foreground/long-session device performance have not been verified.
3. Full renderer parity across GPU preview, Canvas video and desktop remains unverified (pixel isolation does not prove parity). WebM duration still needs normalization/encoder refinement.
4. Durable product approvals are not implemented; generated products remain needs_review. The Manager UI itself has not been modified to index Products, though bridge status exposes product records in shared storage.
5. Headless Manager job -> render -> product orchestration is not yet installed; test harness directly invokes production export functions.

No claim that A1–A5 or commercial readiness is complete. Do not publish technical demo assets. Review ZIPs include explicit internal-use license.

## Test commands

- npm run test:bridge
- npm run test:a5-pilot
- npm run build
- node scripts/real-export-test.mjs
- node scripts/review-product-from-real.mjs
- node scripts/product-ui-test.mjs

Real browser test scripts currently use installed Edge and Playwright from sibling Image Dream. Move to a declared test dependency before portable CI use. FFmpeg/ffprobe must be available on PATH.
