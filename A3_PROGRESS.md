# A3 execution status

Implemented this iteration:
- Desktop pair runtime moved to a separate raw JS module; Hidden Reveal uses hold zoom and masked B; Portal masks B on a separate reusable surface.
- Runtime reads grayscale mask into alpha once; canvas buffers resize only on viewport change; hidden tab cancels RAF.
- Desktop alignment bake now uses inverse output-to-source transform and rejects singular transforms.
- Mobile fallback is encoded as a real JPEG at target dimensions with cover/contain.
- Mobile metadata no longer asserts untested seamless loops; records renderer version and project revision.
- MP4 encoder closes in finally; MediaRecorder stop handler is registered before start and tracks stop in finally.

Verification: build and existing 5 bridge/planner tests passed before final recorder cleanup; final build required below. These tests do not certify pixels or video.

A3 is NOT complete: shared preview/export kernel parity, Portal glow/ripple/properties in new runtime, HTML escaping, all MediaRecorder error/timeout paths, real artifact encode/decode and loop tests, desktop installation and Android device tests remain. New runtime currently lacks the legacy host property listener. Do not ship as production replacement until these regressions are resolved and pixel tests pass. Legacy Portal smoke script still extracts the old embedded runtime; its result cannot validate the new runtime.
