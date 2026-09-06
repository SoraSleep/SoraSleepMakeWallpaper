# P5 — WebGL production renderer

Status: **implemented and production build passes**

## Goal

Turn the Difference Lens prototype into a predictable wallpaper renderer. The renderer keeps image A as the stable base, magnifies A inside the lens, and reveals image B only where the approved difference mask has a value.

## Completed tasks

### P5.1 Color-correct composite

- Decode sampled sRGB colors to linear RGB before blending.
- Blend the base, magnified source, variant, comparison views, heat map, and lens border in linear space.
- Encode the final fragment back to sRGB.
- Reject pixels outside the valid image and aligned-variant bounds.

### P5.2 Runtime controls

- Target frame-rate presets: 15, 30, and 60 FPS.
- Wallpaper Engine `applyGeneralProperties` FPS integration.
- Frame scheduling gate on top of `requestAnimationFrame`.
- Real measured FPS and frame interval in the UI.
- Approximate GPU texture memory shown in the Lens inspector.

### P5.3 Lifecycle and recovery

- Pause rendering while the document is hidden.
- Resume without a large animation time step.
- Handle `webglcontextlost` and rebuild GPU resources after `webglcontextrestored`.
- Show explicit states for unsupported WebGL 2, lost context, image-load failure, and shader/program failure.
- Restore any pre-existing Wallpaper Engine property listener during cleanup.

### P5.4 Interaction contract

- Pointer movement is smoothed using delta-time-independent exponential response.
- Lens fades when the pointer leaves the wallpaper.
- Canvas resolution follows its displayed size and caps device pixel ratio at 2.
- Difference-mask paint mode continues to use pointer capture and normalized image coordinates.

### P5.5 Integrated rendering modes

- Final Difference Lens composite.
- 50/50 aligned overlay for inspection.
- False-color edge comparison for alignment review.
- Full difference-mask heat view for mask review.

## Verification

- `npm run build` passes TypeScript compilation and Vite's production build.
- Production bundles include the WebGL app, image import worker, difference worker, and OpenCV alignment worker.
- The local development server responds successfully at `http://127.0.0.1:5173/`.

## Known limits carried into later phases

- P6 still needs the offline commercial ZIP packager and manifest validation.
- P7 still needs the complete Wallpaper Engine user-property schema and a real host smoke test.
- Multi-monitor behavior and GPU measurements must be validated inside the Wallpaper Engine host on representative low, mid, and high-tier hardware.

## P5 acceptance result

The renderer now follows the required logic:

`base = A`  
`lens source = magnified A`  
`lens result = mix(magnified A, aligned B, approved difference mask)`

Moving the pointer only changes the lens position. The pink clothing from image B appears inside the lens where the difference mask permits it; unrelated pixels remain from magnified image A.
