# Phase 3 Progress — Global Alignment

## Hoàn thành

- [x] OpenCV.js 5 được bundle local; không dùng CDN/runtime network.
- [x] Alignment chạy trong module Web Worker để không khóa UI.
- [x] Proxy giới hạn cạnh dài 640 px.
- [x] Grayscale preprocessing.
- [x] ORB tối đa 1600 features.
- [x] Hamming cross-check feature matching.
- [x] Similarity affine gồm uniform scale, rotation và translation.
- [x] Deterministic RANSAC 700 iterations.
- [x] Least-squares refinement trên tập inlier.
- [x] Transform được chuẩn hóa theo UV và lưu A→B trong `.wallproj`.
- [x] Metrics thật: feature matches, RANSAC inliers, median reprojection error và valid coverage.
- [x] Quality gate Good/Review/Rejected.
- [x] Manual Scale, Rotation, Offset X/Y và Reset.
- [x] Transform alignment được áp dụng cho B trong Difference Lens shader.
- [x] Difference mask được tính sau alignment.
- [x] Comparison views: Composite, 50/50 Overlay, Edges và Difference.
- [x] Phase 3 progress/cancel dùng chung job pattern.
- [x] Production build thành công.

## Quality gate hiện tại

- Good: ít nhất 40 match, inlier ≥ 50%, median error ≤ 3 px, valid coverage ≥ 80%.
- Review: ít nhất 12 match, inlier ≥ 25%, error ≤ 8 px, coverage ≥ 60%.
- Rejected: thấp hơn một trong các điều kiện Review.
- Pending/Rejected không thể bấm `Build difference mask`.
- Manual correction chuyển trạng thái sang Review.

## Giới hạn và bước bổ sung

- ECC photometric refinement chưa bật; RANSAC least-squares đang là refinement an toàn của bản đầu.
- Homography chưa có vì Difference Lens ưu tiên ảnh cùng camera và tránh làm cong chủ thể.
- Control points 3–8 điểm chưa có; manual controls hiện dùng scale/rotation/offset.
- OpenCV worker khoảng 15.6 MB và chỉ tải khi bấm Auto Align.
- Browser runtime interaction cần được kiểm tra thêm trên compatibility matrix; TypeScript/Vite build đã pass.
# P3.0 — Preset domain foundation

- [x] Đăng ký `03 — Layered Parallax 2D/3D` trong preset registry.
- [x] Chốt input contract: base artwork, optional subject, foreground và depth map.
- [x] Chốt default contract cho layers mode, camera, overscan và mobile input.
- [x] Đổi `Before / After Sweep` thành preset 04 và `Transformation Loop` thành preset 05.
- [x] Mở rộng project schema để nhận `layered-parallax` an toàn.
- [x] Production build thành công.

## Bước tiếp theo — P3.4

- Tính overscan tự động theo depth/camera strength.
- Cảnh báo layer có nguy cơ lộ viền và thêm Auto Fix Overscan.

## P3.1 — Parallax project schema

- [x] Thêm layer model: asset, depth, scale, offsets và visibility.
- [x] Thêm camera strength, smoothing, overscan và depth perspective.
- [x] Thêm optional depth map và mobile input settings.
- [x] Thêm default settings cho project mới và project cũ thiếu parallax data.
- [x] Nối parallax settings vào App project snapshot, autosave và open project.
- [x] Validate chặt layer, depth map, ranges và mobile settings khi mở file.
- [x] Production build và Portal export QA matrix thành công.

## P3.2 — Layer Composer

- [x] Thêm Base layer và Subject layer từ asset A/B hiện có.
- [x] Sắp thứ tự layer, ẩn/hiện và xóa layer.
- [x] Chỉnh depth, scale, offset X/Y cho mỗi layer.
- [x] Chỉnh camera strength, smoothing và overscan của project.
- [x] Mọi thay đổi được lưu qua parallax project schema/autosave.
- [x] Production build và Portal export QA matrix thành công.

## P3.3 — 2D Parallax renderer

- [x] Thêm Canvas renderer riêng cho Layered Parallax.
- [x] Render theo layer order, depth, scale, offsets và visibility.
- [x] Camera follow mượt theo pointer/touch và camera strength.
- [x] Tôn trọng Cover/Contain, FPS target và pause khi document ẩn.
- [x] Tạo Base layer mặc định khi bắt đầu Parallax project mới.
- [x] Production build và Portal export QA matrix thành công.
