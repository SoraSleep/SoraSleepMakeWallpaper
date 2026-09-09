# Five-preset delivery plan

Status: in progress. Build success is not visual or device certification.

## Execution order and gates

1. Foundation: resolve each layer's own asset, preserve transforms, define a shared deterministic frame renderer and preset-specific validators. Gate: reordered/hidden/custom layers retain their image identity.
2. Zoom Reveal: align B, magnify both images in the same coordinate system, apply approved difference mask and feather. Gate: no B outside the lens or approved region.
3. Portal Window: render aligned B through a soft portal without magnification. Gate: A remains intact outside the portal; pointer, hold and reduced motion work.
4. Depth Motion: layer transforms, safe camera excursion and axis restrictions; then depth-map displacement. Gate: preview, desktop and video match for the same camera. Depth-map mode must not silently export a flat layer stack.
5. Reveal Sweep: implement its own renderer, directional feathered mask, optional difference mask and A/B holds. Gate: exact A/B endpoints, seamless round trip.
6. Transform Loop: implement aligned masked crossfade and holds; do not claim geometric morphing. Gate: stable background and continuous loop.
7. Integration: preset-specific input forms, controls, save/reload, validation, cancel/error handling and offline packaging.
8. Delivery: generate named sample outputs per preset with desktop ZIP, portrait MP4 where supported, preview images and machine-readable test report. Unimplemented or failing exports remain blocked.

## Test matrix

- Aspect: 16:9, 21:9, 32:9, 9:16; cover and contain.
- Input: A/B same size, different size, transparent layers, reordered and hidden layers, missing or broken asset.
- State: defaults, min/max settings, zero motion, reduced motion, save/reload.
- Desktop: pointer center/edges/corners, pause/resume, resize, offline package asset resolution.
- Video: frame count, duration, dimensions, codec decoding, loop seam, cancellation, memory cleanup.
- Devices: real Android and iPhone installation are separate manual gates; browser playback alone is insufficient.

## Schedule

Execute sequentially through gates 1–8. Each gate ends with evidence and a defect list; do not advance a preset to production-ready on a source-string check. Calendar dates depend on the renderer fixes and available physical devices.

## Findings carried into execution

- Parallax export substitutes A/B by layer index instead of reading layer.asset.
- Depth map, axis, offsets and scaling differ between preview and export.
- Sweep/Transform have registry entries but no independent export renderer.
- Portal screenshot-size smoke checks do not establish pixel correctness.
- MP4 is not an iPhone Live Photo wallpaper deliverable.
