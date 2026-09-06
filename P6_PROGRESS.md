# P6 — UI/UX hoàn thiện

Status: **implemented in Studio; build verified**

P6 đã hoàn thiện happy path cho creator: Import → Align → Difference → Lens → Export. Các trạng thái dữ liệu đều lấy từ asset/worker thật, không dùng metric giả trong workflow chính.

## Đã hoàn thành

- Import A/B: asset card, swap, metadata, format, kích thước, aspect delta, rights selector và replace bằng file picker.
- Import feedback: progress import, autosave notice, restore notice và lỗi đọc project/ảnh.
- Align: trạng thái pending/review/good/rejected, ORB + RANSAC metrics thật, overlay/edges và manual correction.
- Difference: progress worker, noise floor, coverage, region list, heatmap và Reveal/Erase/Protect brush.
- Lens: radius, magnification, feather, follow speed, reveal intensity, comparison mode và runtime budget.
- Runtime panel: target 15/30/60 FPS, measured FPS, frame interval và texture estimate.
- Điều hướng bước có thể dùng bằng keyboard; nút, input và select có focus ring nhìn thấy rõ.
- Tôn trọng `prefers-reduced-motion` để giảm transition/animation trên máy người dùng.
- Layout desktop giữ trong viewport 1280×720 với thanh cuộn riêng ở hai panel biên.

## Kiểm tra

- `npm run build` pass TypeScript và Vite production build.
- Dev server trả HTTP 200 tại `http://127.0.0.1:5173/`.
- Edge headless đã render được màn hình Studio và WebGL preview ở 1440×900.

## Chuyển sang P7

- Export ZIP runtime offline, manifest, LICENSE, CHANGELOG và hash.
- Buyer properties cho Wallpaper Engine.
- Bake texture/mask theo output resolution.
- Smoke test import package trên Wallpaper Engine thật.
