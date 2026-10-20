# MakeWallpaper 1.0.2 — output cleanup verification

Source build: `96ec9f3`. Tested on the current Windows machine, 20 October 2026.

## Scope and results

- 109 automated regressions passed: Manager backend 76, prompt/contract 11, bridge 20, runtime 2. The 500-row tests use fixtures; this is not a 500-generation live test.
- 32 image/output groups passed with two images in each group: 13 backend,15 browser export,4 package/listing checks. Eight distinct source images were reused across these groups.
- Two new1440×2560 SFW images were generated through the existing Image Dream application. Each completed in one attempt; the persisted reservation is10 credits in total. This is a reservation record, not an independently measured wallet delta. Other export checks generated no new images.
- Native landscape2560×1440, portrait1440×2560 and square2048×2048 samples were checked. Clean negative images remain byte-identical. Original sources and pixels outside reconstructed regions remain unchanged.
- Real PLR background removal, alpha previews, QA, selection, contact sheets, native/trimmed PNG packaging, ZIP payload hashes and listing covers passed on two actual provider images.
- Difference Lens and Portal Reveal desktop packages, H.264720p/1080p/1440p, WebM and mobile fallback bundles passed. Exported native A/B pixels were compared against processed files. Three legacy desktop export modes and the legacy landscape export also passed their two-image checks.
- FFmpeg decoded all14 generated MP4 files without errors; some are duplicate download filenames for the same render. Browser checks reported no page errors.

## Fixes found during testing

The detector now refines multiple scale candidates, supports low-contrast corner badges, excludes invisible alpha RGB and rejects mathematically undefined correlation on flat windows. Detailed backgrounds use a pinned local LaMa model; flat regions use local inpainting. Whole mark bounds include shadows and antialiasing. Ambiguous detections and residual known marks block export.

Mobile H.264 now chooses an appropriate requested level for720p,1080p and1440p. The old fixed level3.1 was rejected at1080p and1440p. Hardware encoders may emit a higher valid level; the tests inspect the actual stream and decode it.

## Evidence and limits

Local generated evidence is intentionally excluded from Git: `real-test-output/watermark-all/review.html`, the backend/browser/listing JSON reports, original/processed comparisons and downloadable ZIP/MP4/WebM files. The desktop smoke report is under `real-test-output/landscape-upgrade/desktop-report.json` after running the installed-app test.

The algorithm recognizes the two tested Dreamina marks; it does not certify arbitrary logos or text. Inpainting reconstructs details and can soften textured regions. Inspect full-size results before publishing. Actual Android/iPhone hardware and a fresh Windows VM have not been tested here. Editing backups and explicit source comparisons retain originals.

The setup bundles Python, ONNX Runtime, image libraries, BiRefNet and the checksum-pinned LaMa model. Image Dream remains a separate application using the user's existing profiles. No account data is packaged.
