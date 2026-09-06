# P8 — Commercial validator

Status: **first UI slice implemented**

- Export tab now shows a checklist for schema, rights, alignment, difference mask, offline assets and 8K safety limits.
- Export is disabled while any blocking condition remains.
- Warnings and actionable issue count are shown before package generation.
- Existing validator remains the single source of truth for the export gate.
- File-level scan rejects unsafe paths, files outside whitelist, source maps, network URLs and likely secrets before ZIP creation.
- Added `scripts/visual-matrix.mjs` and verified real headless renders at 16:9, 21:9 and 32:9.
- Pointer matrix now covers center, corner and edge for each aspect ratio (9 screenshots total).

Remaining P8 work: ZIP traversal scan, source-map/secret scan, manifest schema validation, visual matrix and host runtime checks.
