# Release audit — 18 October 2026

## Outcome

The app is usable for a supervised production pilot. It is not yet a verified unattended prompt-to-sale product or a standalone Windows release. Earlier messages overstated QA UI completion and scope-based ZIP blocking; this audit corrects those claims.

## Fresh generation evidence

- Installed Image Dream, free-listed Seedream 4.7 (`high_aes_general_v43`), one new spring valley prompt.
- One submission, one downloaded image, 2560×1440, reservation 5 credits. Wallet balance delta was not independently measured.
- 56.619 seconds from run creation through generation, download, decode, QA, and ZIP.
- Local report: `real-test-output/release-2026-10-18/report.json`; image: `original.jpg`; delivery ZIP in the same directory.
- Technical QA passed. Visual inspection: appealing river/cherry/mountain composition; a building appeared despite the emphasis on landscape. AI/Dreamina marks are clearly visible. The ZIP preserves those original image bytes.
- This round generated one new landscape. Reveal and PLR were regression-tested; no claim that every model, preset, phone, or 500 live generations was tested with fresh credits.

## Regression verification

- Image Dream: 79/79 tests pass.
- Manager PLR/Landscape: 58/58 pass before the additional selected-scope test; subsequent QA-specific tests 2/2 pass.
- Bridge/production contracts: 20/20 pass.
- PLR prompts: 4/4; PLR plan: 5/5 pass.
- Reveal Studio UI: pass. Portal runtime: 16:9, 21:9, 32:9 and 9:16 pass in browser.
- Landscape gallery: real-source browsing, retry thumbnail, native source only on opening, modal Escape, saved selection/reload, search/filter pass.
- 500-row gallery fixture: 24 cards/page, zero automatic native-source loads, pass. This is not a live 500-image run.
- ZIP UI: selected one image; all two images split across independent ZIPs; CRC, SHA, privacy, history, idempotency and oversize recovery pass.
- Build and diff whitespace checks pass. The build still warns about chunk size and OpenCV's browser-externalized Node modules.

## Fixes during this audit

1. QA export scope now respects saved selection. An unrelated missing/duplicate image no longer blocks a valid selected subset. All mode still checks the whole batch.
2. QA can be invoked explicitly in gallery, displaying flagged image ordinals and reasons. Backend rechecks at export. There is no automatic aesthetic/watermark certification.
3. Gallery test establishes selection preconditions so reruns after interruption remain valid.
4. UI tests support an isolated studio URL; proxy origins are normalized only in the test harness. This avoids conflicts with tests that own port 5173.
5. Home had global 1180px minimum width at a 390px viewport. Hub screens now reflow; the project card and topbar stack on small screens.

## Speed and interface evidence

Bounded headless Edge samples on Vite development server, not a production benchmark:

| Screen | Desktop DOM ready | Mobile DOM ready | Horizontal overflow after fix |
| --- | ---: | ---: | --- |
| Home | 509 ms | 458 ms | none |
| PLR | 196 ms | 226 ms | none |
| Landscape Batch | 201 ms | 210 ms | none |

No page errors or active CSS animations on these static screens. Heap samples were approximately 26–34 MB, but no long-session memory or GPU leak conclusion is justified. Animation source audit found visibility/intersection gating and cleanup in reveal/landscape renderers. No new live GPU/offscreen profiling was performed. The skill optimize-web-animations guided these limits and the bounded screen audit.

Frontend build: main JS about 529 KB (160 KB gzip), alignment worker 15.57 MB. Preset 03 still appears as a callout while 01/02 are cards. Mixed-language labels and extra experimental entry points make onboarding uneven. Queue polling continues every 2.5 seconds even after completion. These remain optimization work.

## Release plan and acceptance criteria

### R1 — production correctness, 1–2 working days

- Put QA badges on individual cards and link each warning to its image; keep an explicit refresh and progress/cancel for long scans.
- Unify source identity for original and reviewed derivative. Persist hash, original ancestry, edit method/radius, dimensions and review record per batch item.
- Allow original/reviewed/copies export choice. Include source choice in ZIP key and manifest. Reject stale edits and missing derivatives; never silently fall back to original.
- Resolve remaining watermark quality with narrow masks and before/after review. Compare output on sky, water and textured foliage. Broad Telea/NS rectangles are not sufficient for reliable automatic cleanup.
- Acceptance: corrupted/duplicate rows block their chosen scope, deselecting them recovers export, derivative changes invalidate cached ZIP, originals remain immutable. Test these through HTTP and UI.

### R2 — speed and workspace, 1–2 working days

- Give all three default presets equal cards: Reveal, PLR Collection, Landscape Batch. Move experiments behind an expandable section.
- Lazy-load studios/export dependencies; keep OpenCV in workers. Baseline cold production load before setting bundle budgets.
- Stop polling completed batches; poll active ones with cancellation, no overlapping requests and slower polling while hidden.
- Cache successful QA by source hash and recipe; invalidate on changed bytes; bound decoding concurrency and expose progress.
- Acceptance: all three routes work at 390px/1440px, no overflow, no page errors; gallery retains 24/page; completed queue produces no repeated polling; visible effects resume and offscreen effects stop.

### R3 — Windows packaging, 2–3 working days

- Resolve Manager/Image Dream runtime paths from configuration, remove developer-specific D: dependencies, and define a supported backend version handshake.
- Choose Manager-managed installation first. Include frontend build and integration backend with pinned Node/Python/FFmpeg requirements. Keep browser profiles/account data outside program files and outside Git.
- Add one-click launch, port ownership checks, service readiness, graceful close, diagnosis export with redaction, update staging and rollback.
- Create checksummed versioned portable build first, then installer only after a clean-machine smoke test. Code signing requires a separately configured certificate.
- Acceptance: a clean Windows user can launch, import prompts, generate one image, restart/resume, export ZIP and update/rollback without a developer checkout. Installation never replaces account/profile data.

### R4 — scale and release, 1–3 days plus provider wait time

- Run 10, then 50, then 100 and only then 500 live prompts, each with an explicit per-run credit budget and durable continuation.
- Measure per-image median/p95 duration, failed downloads, ambiguous submissions, duplicate rate, memory growth, disk space and ZIP part sizes.
- Exercise reconnect, profile exhaustion and application restart during download. Reconcile exact task identities before submitting another generation.
- Acceptance: all outputs accounted for, no unexplained extra submissions, retry resumes the same task, archives verify, and no secrets in diagnostics or release artifacts.

## Git handoff

Application source and test scripts are committed to SoraSleepMakeWallpaper. `integrations/` contains source snapshots of the external Manager PLR/Landscape backend and Image Dream region-edit modules. These are recovery/integration sources, not a packaged standalone runtime. Generated images, accounts, credits, raw logs, reports containing private paths, and test stores remain local and ignored.
