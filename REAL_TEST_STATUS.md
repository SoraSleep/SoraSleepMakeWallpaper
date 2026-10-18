# Real export validation — 15 October 2026

Executed scripts/real-export-test.mjs against built production export modules in headless Edge. Source: existing demo artwork pair; no provider generation. Outputs under real-test-output/ (ignored in Git).

Both Hidden Reveal and Portal Window produced H.264 MP4 and VP9 WebM at 432×768/24 FPS. All four videos decoded through FFmpeg without decoder errors. Exported desktop ZIPs contained entry/runtime/metadata and opened in the browser; screenshots inspected. Mobile fallback has JPEG signature. Pre-aborted MP4 export returned AbortError for both presets.

Actual test uncovered and fixed ZIP timestamp 1970 rejection and file:// canvas readback taint. Masks now store opacity directly. Also fixed recorder timer ownership/error propagation, encoder finally cleanup, HTML/JSON escaping and restored desktop glow/ripple/properties.

Rerun after frame-duration fix: both MP4 files measure exactly 3.000000 seconds and decode successfully. WebM recordings measure 2.867123 and 2.858062 seconds; fallback duration accuracy remains unresolved. No pixel parity/loop certification, actual Wallpaper Engine installation, Android test, provider generation or 30-minute soak. A1 Manager render adapter, A2 real edit provider and A4 marketing UI are still incomplete. Full A1–A5 completion must not be claimed from this test.

Other gates: six backend tests pass; 20 synthetic pilot cases pass; application production build passes. Synthetic tests are distinct from real export tests.
