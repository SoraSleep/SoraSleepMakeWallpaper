# A2.1 — Prompt planning foundation

Implemented POST /artwork-plan (loopback + same-origin bridge header). JSON input: prompt, optional variantChange, presetId and aspectRatio. Returns versioned SFW planning template, A prompt, B masked-edit instruction, protected regions, review requirements and blockers. No provider call, no credits, no automatic rights or SFW approval.

The planner is deterministic template-based, not semantic analysis. It preserves the original prompt, defaults explicitly to Portal Window and leaves focal point/mask unresolved for review. It cannot classify unsafe content or locate objects. Missing variantChange returns null B prompt rather than inventing a change. generationAllowed remains false.

Remaining A2.1 integration: UI to review/change the plan, persistent plan revision, region selection from generated A, semantic planner adapter if desired, and Manager handoff. A2 generation is blocked until provider real reference/mask editing is verified; A1 end-to-end rendering is also still incomplete.

## Updated execution status

- Implemented planner UI, revision persistence and stale-revision rejection.
- Added local A/B/mask quality panel: dimensions, source SHA-256, pixel difference inside/outside approved-mask input, downloadable report. Results stay unreviewed; no automatic approval. Raster sampling at width <=512 is a heuristic; thresholds require calibration.
- Added bitmap cleanup and invalidation when input files change. Mask convention: white allows change, black protects; alpha multiplies allowance.
- Build and existing 5 backend tests pass. No browser visual test, provider generation or actual A/B integration test has been completed for the new panel.
- Still incomplete: durable A-generation request/result binding; verified provider masked editing; bounded generation retries/budget; mask editor integration; pair report persisted with plan revision; Manager handoff.
- Blocking evidence: Image Dream's real generation path inspected during A0 does not apply referenceImages/mask; simulateGeneration logging is not evidence of editing. A2 cannot honestly be certified end-to-end until a real editing adapter exists and is tested.
