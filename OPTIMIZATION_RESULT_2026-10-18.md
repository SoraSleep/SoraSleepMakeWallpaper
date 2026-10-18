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

The alignment worker remains 15.57 MB; it needs a separate worker dependency audit. OpenCV still emits browser-externalized Node module warnings. Automatic derivative-to-ZIP selection, watermark cleanup quality and Windows standalone packaging remain separate release tasks. This update improves startup and queue idle load; it does not change generation quality or provider latency. Animation optimization skill guidance was used to bound claims; no long-session GPU or heap leak certification is made.
