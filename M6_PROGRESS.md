# M6 — Mobile commercial validator

Status: **Implemented; production build passes**

## Delivered

- Mobile-specific export gate separate from desktop Web Wallpaper validation.
- Enforces 9:16 portrait output and even H.264 dimensions.
- Requires approved difference mask, reviewed alignment, and verified commercial rights.
- Enforces 3–30 second loop duration.
- Estimates encoded size from quality bitrate and duration.
- Warns when Economy/Standard/Premium selection may create an oversized storefront file.
- Warns when 24 FPS is selected for high-refresh phones.
- Export button is blocked until mobile requirements pass.

## Verification

```text
npm run build
TypeScript: PASS
Vite production build: PASS
```

Next delivery: generate a complete mobile distribution bundle containing video, static fallback, thumbnail, metadata, SHA-256 manifest, license reminder, and Android installation instructions.
