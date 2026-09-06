# Desktop and mobile compatibility

## Confirmed architecture

- Windows: export an interactive Web Wallpaper (`index.html`, JavaScript, project.json and local assets).
- Android: export a portrait Scene or Video through Wallpaper Engine for Windows, then transfer it to the Android companion app or export an `.mpkg` from Wallpaper Engine.
- iOS: true third-party live wallpapers are not supported in the same way; this product should only promise a static/Live Photo fallback for iPhone.

Web wallpapers must not be advertised as Android-compatible. The Android target in Studio is therefore separated and remains locked until the video/scene encoder is implemented.

## Portrait input contract

- Accept paired 9:16 PNG/JPEG/WebP images.
- Default output: 1080 × 1920.
- Both images must share a close aspect ratio and pass alignment/mask validation.
- Mobile motion cannot depend on a desktop mouse. The mobile export must use an automatic lens path or a rendered animation loop.
- Mobile export should target 30 FPS by default and offer a lower quality option for battery and memory use.

## Current verification

- 9:16 is supported by project schema, parser, canvas presets and output metadata.
- Visual test matrix now includes 9:16 center/corner/edge cases.
- Desktop Web export remains enabled.
- Android export is explicitly marked as Video and locked until encoding is available.
