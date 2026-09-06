# Mobile product roadmap

## Product architecture

The product must have two independent output targets:

1. **Desktop Interactive Web** — pointer-driven WebGL wallpaper for Wallpaper Engine on Windows.
2. **Mobile Portrait Video** — 9:16 MP4 loop for Android Wallpaper Engine and other Android video-wallpaper apps.

Later, a third **Mobile Scene** target can add true touch interaction, but it requires a Wallpaper Engine Scene/OpenGL ES pipeline and real Android-device validation.

## M0 — Mobile input contract

### M0.1 Portrait presets

- 720 × 1280 Economy.
- 1080 × 1920 Standard.
- 1440 × 2560 Premium.
- Optional native 9:16.
- Warn when A/B aspect delta exceeds 0.5%.

### M0.2 Safe areas

- Preview Android status/navigation bars.
- Configurable top, bottom and side safe margins.
- Keep faces, text and the reveal region outside launcher icon zones.
- Add home-screen and lock-screen overlays to preview.

### M0.3 Input validation

- Decode A/B at full orientation using EXIF.
- Reject unsupported color profiles or normalize to sRGB.
- Limit decoded texture memory by device tier.
- Require alignment and difference-mask acceptance before render.

**Acceptance:** two 1080 × 1920 images can complete Import → Align → Difference without cropping or coordinate drift.

## M1 — Mobile motion authoring

### M1.1 Automatic lens path

- Replace mouse movement with a timeline path.
- Presets: slow orbit, figure-eight, guided reveal, breathe/idle and point-to-point.
- Adjustable duration, easing, dwell time and loop closure.
- Allow keyframes on normalized coordinates.

### M1.2 Difference reveal timeline

- Animate reveal intensity separately from lens position.
- Support hold-on-detail and fade-to-A transitions.
- Guarantee first and last frames match for seamless looping.
- Add optional reverse/ping-pong loop.

### M1.3 Motion comfort

- Limit lens velocity and acceleration.
- Avoid large zoom changes near screen edges.
- Add reduced-motion preset.
- Prevent flashing/high-frequency brightness changes.

**Acceptance:** a 6–12 second animation loop has no visible jump and never reveals B outside the approved mask.

## M2 — Mobile renderer

### M2.1 Portrait render surface

- Render at fixed output resolution independent of editor viewport.
- Preserve cover/contain policy.
- Use aligned B and baked PNG mask.
- Keep linear-RGB blending and sRGB output.

### M2.2 Device quality tiers

- Economy: 720p, 24/30 FPS, reduced mask resolution.
- Standard: 1080p, 30 FPS.
- Premium: 1440p, 30 FPS.
- Estimate decoded texture memory before export.

### M2.3 Mobile-safe effects

- Lens border on/off.
- Soft glow with capped blur radius.
- Ambient parallax from a depth map.
- Particles with fixed maximum count.
- No audio dependency for Android output.

**Acceptance:** Standard preset stays inside the chosen memory/frame budget and renders identically for all frames when repeated.

## M3 — Video encoder

### M3.1 Frame production

- Deterministic frame clock.
- Fixed 30 FPS default.
- Render exactly `duration × FPS` frames.
- Cancellation, progress and retry.

### M3.2 Encoding

- Primary: MP4 H.264, yuv420p, no audio.
- Optional: WebM for non-Wallpaper-Engine stores.
- GOP/keyframe settings optimized for short loops.
- Quality presets based on target resolution.
- Preserve frame dimensions divisible by 2.

### M3.3 Loop verification

- Compare first/last frame perceptual difference.
- Detect dropped/duplicate frames.
- Validate duration, codec, resolution and pixel format.
- Generate a lightweight store preview.

**Acceptance:** exported MP4 imports as a Video wallpaper, loops cleanly and plays without audio on Android.

## M4 — Android delivery

### M4.1 Distribution bundle

- `wallpaper-1080x1920.mp4`.
- Static fallback JPG.
- Cover/thumbnail JPG.
- Android install instructions.
- License and commercial-use terms.
- SHA-256 manifest.

### M4.2 Wallpaper Engine transfer

- Test Windows → paired Android device.
- Test Wallpaper Engine `Export .mpkg` route.
- Test manual `.mpkg` import from Downloads.
- Document that Workshop cannot be accessed directly from Android.

### M4.3 Device matrix

- Android 10 minimum.
- 60 Hz and 120 Hz phones.
- 1080p and 1440p screens.
- Samsung, Pixel and Xiaomi/HyperOS test devices.
- Home screen, lock screen and combined mode where supported.
- Battery saver, screen rotate, sleep/wake and launcher restart.

**Acceptance:** no crash, black frame, stretching or loop jump on the supported device matrix.

## M5 — Mobile commercial validator

- Require portrait output for Mobile target.
- Validate H.264/yuv420p/MP4 metadata.
- Reject audio tracks.
- Enforce duration, bitrate and package-size limits.
- Check safe-area violations.
- Check first/last-frame loop score.
- Verify preview and static fallback.
- Verify rights ledger and license.

## Market effect catalog

### Best fit for two-image input

1. **Difference Lens** — desktop pointer or mobile auto-path reveals changed details.
2. **Transformation Loop** — A slowly transitions into B and returns seamlessly.
3. **Portal Reveal** — moving circle, glow or shape exposes B.
4. **Before/After Sweep** — vertical/horizontal split travels across the frame.
5. **Blink/Pulse Reveal** — B appears on a slow timed pulse.
6. **Parallax Portrait** — subject/background depth movement; optional B reveal at motion peak.
7. **Cinematic Camera** — slow pan/zoom with localized B changes.

### Popular categories requiring additional assets or analysis

- Rain, snow, dust, petals, sparks and firefly particles.
- Anime/lofi ambient loops: hair, clothing, eyes, smoke and lighting.
- Day/night and weather transitions.
- Clock, calendar and system-information overlays.
- Audio-responsive visualizers and lighting.
- 2.5D depth/parallax scenes.
- Video loops and static/live bundles.
- Customizable color/theme wallpapers.
- Touch-reactive ripples or particles for supported scene targets.

## Recommended release order

1. Mobile Difference Lens Auto-Path.
2. Portal Reveal.
3. Before/After Sweep.
4. Transformation Loop.
5. Parallax Portrait.
6. Particle overlays.
7. Clock/day-night features.
8. Audio responsive desktop edition.

The first five modes reuse the existing alignment and difference-mask pipeline, so they offer the best development-to-product value.
