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

