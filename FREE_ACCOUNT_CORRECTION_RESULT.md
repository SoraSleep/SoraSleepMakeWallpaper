# Free-account correction — 2026-10-16

The intended workflow uses Image Dream's existing Dreamina browser engine and free account credits. API means local SoraSleep orchestration, not a paid image-model provider.

Implemented:

- Removed the paid-provider choice and API-key guidance from Manager's Wallpaper screen.
- Removed the unused Ark transport and its tests from Image Dream. Production image-job requests only accept `provider:dreamina`; selecting the old paid provider is rejected before a network request to any image provider.
- Added DreaminaJobProvider to adapt the existing engine into the normalized job API. It uses the existing free-model catalog, validates model/ratio/resolution, preserves account-credit rotation, forces real engine mode, and reads only verified saved task output.
- Submission events distinguish a failed login/network preflight from a potentially submitted generation. Unsubmitted blocked work can explicitly retry with a new engine attempt key; submitted unknown outcomes cannot automatically retry.
- Manager retains account preflight, uses the local image-job API when available and keeps the old Dreamina bridge as compatibility fallback. Old paid batch configurations are blocked rather than silently converted.
- B/reference editing remains explicitly capability-blocked in the Dreamina browser adapter. The local mask compositor and render API remain tested, but they do not substitute for a real B-generation implementation.

Verification:

- Image Dream: **33/33** tests passed, including the free engine adapter, free-account rotation, login failure handling and paid-provider rejection.
- Manager: **137/137** tests passed; TypeScript/build passed.
- MakeWallpaper: **12/12** integration tests passed; browser UI check passed; actual render API exported MP4/desktop ZIP for both presets using regression image fixtures.
- UI regression now checks no Ark selection is offered.
- Live normalized free-account job: six account records were eligible by saved cookie/status/credit data; navigation to Dreamina timed out before submission. Result: `blocked`, `submissionRecorded:false`, zero images. Old paid-provider request returned HTTP 400. This does not establish that those sessions are authenticated.

Live evidence: `real-test-output/free-account-correction-20261016/live-report.json`.

Remaining acceptance: working Dreamina connection/authenticated session; verified current UI model/size/submit control and provider task-ID mapping; real reference editing for B; real generated A/B through render and visual/device QA. No end-to-end production success is claimed from unit tests or fixture renders.
