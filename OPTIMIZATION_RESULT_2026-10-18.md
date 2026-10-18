# Studio performance update

## Changes

- Lazy-load PLR, Landscape Batch, Wardrobe and Landscape studios with an accessible loading status. Studio code and styles no longer all load at startup.
- Replace interval polling with one request followed by a delayed next request. Abort pending work when leaving the batch; request timeout is 15 seconds.
- Completed landscape batches stop snapshot polling. Hidden tabs use 15-second delays instead of 2.5 seconds; visible tabs use 2.5 seconds.
- All three product presets now appear as equal home cards, including Landscape Batch.

## Verification

- Main JS: 529.21 KB to 396.04 KB, about 25% smaller. Gzip: 160.43 KB to 121.36 KB, about 24% smaller. Studio chunks load on demand; this reduces initial download rather than total code size.
- Initial shared CSS: 50.06 KB to 37.12 KB; studio CSS loads with each studio.
- Build and prompt contract 2/2 pass. Gallery real-source tests pass, including a new six-second idle assertion that a completed batch sends zero additional snapshot requests.
- Gallery 500-record fixture passes (24 cards/page, no full-source downloads during browsing).
- ZIP UI passes selected/all export, split limits, CRC/SHA, privacy, history, idempotency and oversize recovery.
- Bounded development-server UI samples: PLR desktop DOM ready 148 ms and Landscape Batch 163 ms; corresponding earlier samples were 196 ms and 201 ms. These are single local measurements subject to cache/noise, not production speed guarantees.
- Home/PLR/Landscape Batch have no page errors or horizontal overflow at 1440px and 390px.
- No new image generation was necessary for frontend optimizations. Tests reused verified real Image Dream images; no new credit expenditure in this update.

## Remaining limits

## Second verification and optimization pass

- Found background difference analysis running from App even on the projects and batch studios. Restrict it to hydrated editor/export routes, abort it on route change and prevent stale result/progress updates after cleanup.
- Changing workflow tabs no longer restarts analysis when image/settings inputs have not changed.
- Reject pre-aborted alignment/difference jobs before allocating a worker. Remove the abort listener on worker error.
- Wait for autosave restoration before presenting interactive project controls. Set a saving status when scheduling persistence, preventing an old saved message from being mistaken for completion of the latest save.
- Reveal test now expects three product cards, asserts zero difference-worker requests on home, asserts analysis starts in editor and verifies Reveal mode survives reload. Pass.
- Build, gallery real-source regression, completed-batch idle assertion, 500-record gallery, ZIP selected/all CRC/SHA/privacy and Portal runtime at four aspect ratios pass.
- New main bundle approximately 396.48 KB / 121.46 KB gzip. This pass reduces background computation rather than worker payload size; alignment worker stays 15.57 MB and is loaded on explicit alignment.
- No generation requests or credits spent during this performance pass. Headless development-server UI samples continue to show no overflow or page errors at 390px and 1440px; single timing samples are not production guarantees.

The alignment worker remains 15.57 MB; it needs a separate worker dependency audit. OpenCV still emits browser-externalized Node module warnings. Automatic derivative-to-ZIP selection, watermark cleanup quality and Windows standalone packaging remain separate release tasks. This update improves startup and queue idle load; it does not change generation quality or provider latency. Animation optimization skill guidance was used to bound claims; no long-session GPU or heap leak certification is made.
