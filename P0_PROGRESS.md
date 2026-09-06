# P0 Progress — Difference Lens MVP

## Đã hoàn thành

- [x] Khóa Difference Lens là mode duy nhất của MVP.
- [x] Sửa công thức: ngoài lens là A bình thường, trong lens là A zoom, B chỉ hiện qua difference mask.
- [x] Thay CSS circular reveal bằng WebGL 2 renderer.
- [x] Dùng cùng `zoomUV` cho A, B và difference mask.
- [x] Tạo difference mask cục bộ từ pixel A/B cho logic proof.
- [x] Radius, magnification, feather, follow speed và reveal intensity hoạt động.
- [x] Pointer smoothing độc lập FPS và fade lens khi mouse leave.
- [x] Difference-mask debug view.
- [x] Loại Hybrid, Morph, flow và timeline khỏi workflow P0.
- [x] Khóa Export và bỏ trạng thái Ready to sell giả.
- [x] Production build TypeScript/Vite thành công.
- [x] Tạo ảnh B thật với áo hồng bằng image edit và đặt tại `public/demo/wallpaper-variant-pink.png`.
- [x] Kiểm tra mask với cặp A/B thật; ngưỡng loại drift nhỏ và giữ thay đổi màu áo.

## P0 tiếp theo

- [ ] T0.2: tạo corpus 20 cặp ảnh có quyền sử dụng và ground-truth masks.
- [ ] T1.2: project schema `.wallproj`, save/open và migration version.
- [ ] T2.1: image validation thật: dimensions, format, corruption, orientation, color profile.
- [ ] T3.2: auto alignment Affine + RANSAC + ECC.
- [ ] T3.3: overlay/blink/edge compare và manual alignment controls.
- [ ] T4.1: residual map đa tỉ lệ, bền với JPEG noise và đổi sáng nhẹ.
- [ ] T4.2: connected regions, adaptive threshold và mask proposal.
- [ ] T4.3: brush Reveal/Erase/Protect, undo/redo.
- [ ] T5.5: Wallpaper Engine FPS/property listener trong shared runtime.
- [ ] T7.1–T7.4: bake textures, runtime template, `project.json` và commercial ZIP.
- [ ] T8: offline/schema/visual/performance commercial validator.

## Giới hạn của logic proof hiện tại

- Mask hiện được tính trực tiếp từ pixel ở proxy 512 px; chưa có alignment hoặc noise model.
- Metric Pair Quality/Alignment trong UI vẫn là presentation data.
- File upload chưa kiểm tra quyền thương mại và metadata ảnh.
- Renderer đang nằm trong Studio; chưa tách thành package runtime dùng chung.
- Export chưa được phép cho đến khi runtime và validator P0 hoàn thành.
