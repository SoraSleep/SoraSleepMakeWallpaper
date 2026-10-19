# Production pipeline update — 19 October 2026

## Implemented and verified

1. Reviewed PNG derivatives are attached per batch item with original hash, native dimensions, explicit review and revision. Import limit20MB. Original bytes remain intact. Gallery exposes both sources. ZIP supports original/reviewed/both; missing or changed reviewed files fail, with no silent fallback. Export compares its chosen sources to the exact hashes checked by QA before archive creation.
2. QA persists successful decode results by content hash and recipe. Every scan still hashes current source bytes. Scan progress/cancel are exposed through jobs; only one scan per service is active. Cancellation finishes/aborts at checkpoints, without changing source files. Sources edited after scanning invalidate the export gate.
3. Region editor integration accepts a native painted PNG mask and supports Telea/Navier–Stokes/radius controls. The compatible Image Dream build is now installed, after generation finished and the application had closed. Live API verification on an existing2560×1440 image confirms customMask=true, zero changed channels outside the mask and an unchanged source. This verifies locality, not aesthetic watermark cleanup. No generation credits were used for this preview test.
4. Manager backend now lives in this repository's integrations folder. Runtime config controls data, Python/models, local provider URL and Manager port. Frontend gets its API endpoint from launcher metadata. Existing machine-specific paths live only in ignored runtime.local.json. A portable built-web ZIP includes frontend/backend/launcher/checksums, excludes profiles/local config/test stores, and runs with externally installed runtimes.
5. A resumable live scale runner is provided with explicit count and credit budget. It never automatically resubmits uncertain/failed tasks. The50-prompt run stopped after25 downloads/125 reserved credits when saved profile balances were empty. A real Image Dream wallet scan later found460credits. The same run resumed from prompt26, preserving earlier task identities. Final result:50/50 downloaded, exactly one attempt each,250 reserved credits,50 technical QA passes, no exact duplicates, and four ZIPs verified by CRC and SHA-256. Generation plus download median31.608seconds and p9539.063seconds; active sessions total2373.959seconds, excluding the long credit wait.100/500live runs have not been performed.

## Reproduced tests

- Reviewed PNG UI import → gallery → both-version ZIP → exact SHA/native dimension checks: pass, using an actual Image Dream source and a PNG reencoding as a pipeline fixture. No watermark removal is claimed for that fixture.
- QA cache hit/restart, source changes, cancellation, lock release, selected-scope behavior: pass.
- Derivative wrong dimensions, stale revision, missing/changed files and immutable original: pass.
- Gallery selection/reload/search/retry,500metadata paging, ZIP split/CRC/SHA/privacy/recovery: pass.
- Painted-mask test: pass, zero changes outside the painted pixels; native original unchanged.
- Portable ZIP extraction/CRC/SHA → launcher → custom API port17931 →390px UI: pass on this machine. This is not clean-machine or signed-installer certification.
- Wallet refresh endpoint/UI added after the scale test exposed stale zero balances. Tests verify no generation request, omission of account identifiers and busy-provider rejection. Provider errors now retain a sanitized first-line explanation instead of only HTTP409.

## Use

- Run `npm run runtime:check`, `npm run studio:start`, open http://127.0.0.1:17880.
- Build web package: `npm run build:portable`; validate with `npm run test:portable`.
- Studio03: gallery image → reviewed PNG section → confirm review → import. Choose image version in ZIP panel. Both mode yields two files per included prompt.
- Existing production data remains at the path configured in runtime.local.json. Never launch two controllers against the same store.
- Scale50: `node scripts/landscape-scale-live.mjs`. It reuses its persisted run; do not delete its pilot/store or start a second copy. Override count/budget only when creating a separate intended test.

## Remaining release limits

- No automatically certified watermark-free output. Local inpainting may blur fine detail, and reviewed PNG import requires visual review.
- The compatible Image Dream directory candidate at `D:/SoraSleep Main/Builds/ImageDream-mask-20261019/win-unpacked` passed isolated preview/save tests and was deployed to the installed program. Installed ASAR SHA-256: `c1f5e1e6245f4359609c9803f32e4807854f5147e5e3bc87ab0a23b96101e583`. The old program is backed up at `D:/SoraSleep Main/Backups/ImageDream-program-20261019-mask`. User data remains at `D:/SoraSleep Main/Data/ImageDream`; it was not replaced. The restarted provider is idle with its completed queue preserved. The source modules were also updated in the Image Dream development project.
- The50-image contact sheet was visually inspected: coherent landscape compositions and varied lighting, with visible provider watermarks. Technical QA does not certify visual uniqueness, fine details, aesthetic cleanup or sale readiness. This batch still needs output review and appropriate finishing before publication.
- The portable web package requires installed Node, FFmpeg/FFprobe, Python/models as applicable, and Image Dream. The separate Windows desktop1.0.1 release bundles its processing runtimes; see DESKTOP_INSTALL.md and the desktop release report. Signing, automatic updater/rollback and a fresh Windows VM test remain outstanding.
- No500-live-run stability claim. Provider latency and wallet availability govern production throughput; one-image-per-prompt identity must stay durable across restarts.
- Existing alignment worker remains15.57MB and loads on demand. This update focuses on output correctness and cache efficiency without changing the generation model.
