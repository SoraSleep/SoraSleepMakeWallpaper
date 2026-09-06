# M2 — Mobile renderer quality tiers

Status: **quality contract implemented**

- Added persisted mobile render settings to the project schema.
- Economy: 720 × 1280, 24 FPS.
- Standard: 1080 × 1920, 30 FPS.
- Premium: 1440 × 2560, 30 FPS.
- Export UI exposes the target and quality selection only for Android Portrait Video.
- Runtime export config now carries mobile motion and render settings for the upcoming encoder.
- Legacy projects migrate to Standard automatically.

Next M2 task: add mobile home/lock-screen preview overlays and enforce quality-specific memory/texture budgets during export.
