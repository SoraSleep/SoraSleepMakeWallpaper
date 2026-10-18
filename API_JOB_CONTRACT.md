# Image generation and wallpaper render job APIs

Implemented on 2026-10-15. These are local HTTP APIs. Provider generation and product approval are separate gates.

## Correction — 2026-10-16: free Dreamina accounts only

The production image-job API now accepts only `provider:"dreamina"`, delegating to the existing browser engine and its free-account credit rotation. The paid Ark module and its tests were removed. Manager no longer offers paid-provider selection or asks for API keys. Older Ark batch requests are rejected instead of silently rerouted.

For A, include the existing free-catalog `model`, `aspectRatio`, `resolution` and optional initial `accountId` alongside the width/height fields. Engine readiness, free account availability, actual saved image and decoded dimensions remain mandatory. An invalid session/network preflight becomes `blocked` before submission. A submitted-but-unknown result stays `submission_uncertain`; explicit retry is possible only for work known not to have been submitted.

Live verification on 2026-10-16 found six eligible free-account records, but navigation to Dreamina timed out. The job was blocked with `submissionRecorded:false`, zero artifacts, and a request selecting the old paid provider was rejected with HTTP 400. Report: `real-test-output/free-account-correction-20261016/live-report.json`. This does not prove those six sessions are currently authenticated or able to generate.

B/reference editing is currently **not implemented in the Dreamina browser adapter**. The API advertises only `generate-a`; a B job blocks at the capability gate before any generation. Mask compositing is retained and tested as an image-processing primitive, not presented as a working Dreamina B-generation adapter.

## Common job fields

`schemaVersion`, `id`, `requestId`, `attemptId`, `operation`, `status`, `stage`, `progress` (0–100), timestamps, `artifacts`, `commercialReady:false`. Artifacts carry MIME type, byte count and SHA-256; downloads recheck the stored hash.

Submitting the same JSON with the same idempotency key returns the existing job. A changed payload with that key returns HTTP 409. Request IDs identify logical work; attempt IDs identify explicit processing attempts. A provider timeout after dispatch becomes `submission_uncertain` and cannot be automatically retried.

## Image Dream — port 3000 in the workspace profile

| Operation | Endpoint |
|---|---|
| Configuration/capabilities | `GET /api/v1/image-capabilities` |
| Submit generation/edit | `POST /api/v1/image-jobs` |
| List / inspect | `GET /api/v1/image-jobs`, `GET /api/v1/image-jobs/:id` |
| Download normalized PNG | `GET /api/v1/image-jobs/:id/artifacts/image` |
| Cancel waiting work | `POST /api/v1/image-jobs/:id/cancel` |
| Retry blocked/unsubmitted interrupted work | `POST /api/v1/image-jobs/:id/retry` |

Example A input:

```json
{
  "schemaVersion": 1,
  "contentScope": "sfw",
  "provider": "dreamina",
  "jobId": "client-generated-uuid",
  "idempotencyKey": "stable-request-uuid",
  "operation": "generate-a",
  "model": "high_aes_general_v50",
  "aspectRatio": "9:16",
  "resolution": "2k",
  "prompt": "Original SFW moonlit garden wallpaper, no text",
  "width": 1440,
  "height": 2560
}
```

B uses `operation:"edit-b"`, the intended edit prompt, and additional fields: `imageA` and `mask` (each containing PNG `base64`, `mimeType`, `sha256`), `maskApproved:true` and `maskEncoding:"luminance"` or `"alpha"`. Dimensions must match. The mask must have both editable and protected regions. Full decode/mask validation runs before a paid provider call. Server JSON input is limited to 50 MB.

Mask compositing decodes the output, verifies dimensions, and copies protected pixels from A before normalizing PNG. Its semantic edit and boundary quality still require review. The live Dreamina adapter does not yet support B/reference submission, so production B jobs currently block before generation. Successful A generation ends at `needs_review`, not sale-ready.

No paid model API key is required or used. Configure the free Dreamina accounts/session in Image Dream. The internal job API is orchestration between local SoraSleep applications.

## MakeWallpaper — port 5173 in the workspace profile

| Operation | Endpoint |
|---|---|
| Capabilities | `GET /capabilities` |
| Submit render | `POST /render-jobs` |
| List / inspect | `GET /render-jobs`, `GET /render-jobs/:id` |
| Download MP4 / desktop ZIP | `GET /render-jobs/:id/artifacts/mp4`, `.../artifacts/desktop` |
| Cancel / retry interrupted local render | `POST /render-jobs/:id/cancel`, `.../retry` |

The render input uses the existing intake contract: `schemaVersion:1`, `contentScope:"sfw"`, `jobId`, `productId`, `idempotencyKey`, `presetId`, and `assets.imageA/imageB/differenceMask`. Each PNG asset contains `relativePath` under `assets/`, `width`, `height`, `mimeType`, `bytes`, `sha256` and `base64`. Add:

```json
{
  "targets": ["mp4", "desktop"],
  "maskEncoding": "luminance",
  "render": {"width": 1080, "height": 1920, "fps": 24, "duration": 6, "quality": "balanced"}
}
```

Write requests require `Origin` matching the target server and `X-SoraSleep-Bridge: 1`. Only loopback clients/hosts are accepted. Inputs are capped at 100 MB. Images must decode and match dimensions; nonmatching aspect ratios are rejected rather than stretched. Render dimensions are even, at most 3840 per axis and at most 3840×2160 pixels, 24/30/60 FPS, 1–30 seconds and at most 900 frames. Browser codec support can impose additional limits.

The worker builds and caches the existing export modules, then runs them in an isolated headless Edge process on a temporary loopback page. It uses the same preset/export implementation as the UI. It produces real H.264 MP4 and Wallpaper Engine web-project ZIP. One local render runs at a time. Cancellation closes the worker browser; interrupted renders require explicit retry. Build dependencies, source files, Playwright and Edge must be present; this is not yet a standalone packaged worker distribution.

`/jobs` continues to mean validated source intake. It is not relabeled as rendering. `/capabilities` now separately advertises real render targets.

## Manager

The Wallpaper screen uses free Dreamina accounts only. Manager retains session preflight and submits through the normalized local image-job API when that contract is available, with the legacy browser bridge as compatibility fallback. Portrait 2K expects 1440×2560, landscape 2K 2560×1440; 4K expects 2160×3840 or 3840×2160. Actual model UI selection and output dimensions still require live acceptance; mismatched output must fail validation.

Manager shows image/render job progress and artifact download links through narrow IPC. The batch still stops for B/mask/pair review. The B API and render API are callable and tested, but selecting/approving a mask and submitting those stages from the Manager batch UI remains a subsequent integration task. No automatic sale approval is added.

## Verification

- `npm run test:job-api`: fixture provider → actual A/B decode and mask compositing → real HTTP render API → actual MP4/desktop ZIP for both presets.
- Test source images are solid-color regression fixtures, **not provider-generated artwork**.
- PNG pixel assertion verified protected red pixels remain red and editable pixels become blue.
- Both H.264 files were probed and fully decoded by FFmpeg; each desktop ZIP contains index.html, runtime.js and project.json. Download hashes matched job metadata.
- Separate HTTP Image Dream smoke verified capabilities, submit/dedupe, configuration blocking and foreign-origin denial with API credentials intentionally empty.
- API key/model are not configured for a live paid generation acceptance test in this pass. Windows/phone installation and full-resolution quality review remain separate checks.

Evidence: [API acceptance report](real-test-output/job-api/report.json). Reproducible test: `scripts/job-api-acceptance.mjs`.

Latest checks: Manager 136/136, Image Dream 31/31 (including recovery after provider response), MakeWallpaper 12/12. Manager TypeScript/build and MakeWallpaper production build passed. An additional real HTTP job on the running workspace Vite service completed successfully; its metadata is in `real-test-output/job-api/live-vite-render-report.json`. Existing OpenCV browser externalization warnings remain. No paid image-provider acceptance or target-device installation was performed.
