# Phase 2 Progress — Import, Canvas và Asset Rights

## Hoàn thành

- [x] Import PNG/JPEG/WebP bằng Web Worker.
- [x] Decode có áp dụng orientation của ảnh nguồn qua `createImageBitmap`.
- [x] Metadata thật: MIME, kích thước pixel, dung lượng và aspect delta.
- [x] Chặn ảnh dưới 512 px, trên 8192 px hoặc trên 24 MB.
- [x] Asset upload được embed vào `.wallproj` và autosave.
- [x] Canvas presets: Native, 16:9, 21:9 và 32:9.
- [x] Fit modes: Cover và Contain.
- [x] Shader dùng cùng canvas/image UV policy cho A, B và mask.
- [x] Contain render nền an toàn ngoài image bounds thay vì kéo giãn edge pixels.
- [x] Preview frame và output label cập nhật theo preset.
- [x] Cảnh báo upscale khi source không đủ 1920 × 1080.
- [x] Rights ledger riêng cho A/B: Unknown, Verified, Rejected.
- [x] Rights state được lưu trong `.wallproj` và autosave.
- [x] UI không coi asset Unknown là sẵn sàng thương mại.
- [x] Production build thành công.
- [x] Ripple Portal chạy theo thời gian thực bằng shader clock.
- [x] Viền glow và ripple được giới hạn theo opacity portal, tránh phủ toàn khung hình.
- [x] Pointer input dùng chung cho mouse và touch trong Portal Reveal.
- [x] Touch drag giữ portal hiển thị sau khi rời canvas, phù hợp preview 9:16.
- [x] Chạm/giữ portal mở rộng bán kính theo easing và thu lại khi thả.
- [x] Mobile auto motion nhường quyền cho touch/mouse và tự tiếp tục sau 1.2 giây idle.
- [x] Lưu portal glow/ripple trong `presetSettings.portal` của project.
- [x] Khôi phục portal settings khi mở project/autosave.
- [x] Mở project đồng bộ lại preset Portal với editor selection.
- [x] Xác nhận production build sau luồng persistence.
- [x] Export `config.json` chứa preset ID và portal glow/ripple.
- [x] Wallpaper Engine `project.json` khai báo Portal Reveal và user properties tương ứng.
- [x] Gói ZIP Portal Reveal dùng runtime Canvas riêng thay vì runtime Difference Lens.
- [x] Runtime export hỗ trợ feather, glow, ripple, pointer/touch, hold-to-expand và portrait auto motion.

## P2.9 — Export runtime QA

- [x] Kiểm tra cú pháp runtime được trích trực tiếp từ exporter.
- [x] Render độc lập ngoài React editor ở 1280 × 720.
- [x] Render độc lập ngoài React editor ở 432 × 768.
- [x] Xác nhận ảnh A, ảnh B, portal mask, glow và portrait auto motion hiển thị.
- [x] Thêm lệnh lặp lại kiểm thử: `npm run test:portal-export`.

## P2.10 — Motion accessibility và runtime lifecycle

- [x] Thêm công tắc bật/tắt ripple trong editor và Wallpaper Engine properties.
- [x] Thêm Reduced Motion, tắt ripple, auto motion và hold-to-expand.
- [x] Lưu hai tùy chọn trong project/autosave/export metadata.
- [x] Dừng render khi document bị ẩn và tiếp tục an toàn khi hiện lại.
- [x] Production build và Portal export smoke test đều thành công.

## P2.11 — Mobile video export

- [x] MP4 WebCodecs renderer hiển thị ảnh B trực tiếp trong Portal.
- [x] WebM MediaRecorder fallback dùng cùng Portal, alignment, glow và ripple.
- [x] Guided motion dùng quỹ đạo tuần hoàn kín để tránh giật tại điểm loop.
- [x] Reduced Motion tạo video Portal tĩnh và vô hiệu ripple.
- [x] Mobile bundle metadata chứa preset, portal settings và `seamlessLoop`.
- [x] Production build và Portal runtime smoke test thành công.

## Giới hạn đã biết

- ICC profile hiện được browser decode về working color space; chưa trích tên profile gốc.
- Alpha-channel inspection chi tiết chưa có.
- Smart Crop và safe area cho multi-monitor chưa được triển khai.
- Pair Quality 92 và alignment metrics vẫn là presentation data cho tới Phase 3.
- Rights Verified là xác nhận của creator; chưa có proof-file attachment hoặc audit workflow.

## Bước tiếp theo — Phase 3

- Normalize proxy A/B.
- Feature matching ORB/AKAZE.
- Affine + RANSAC và ECC refinement.
- Overlay/Blink/Edges để kiểm tra.
- Manual control points và Good/Review/Rejected gate.

## P2 Portal Reveal — bước 1

- [x] Tích hợp renderer `portal-reveal` dùng chung WebGL canvas.
- [x] Portal hiển thị ảnh B trực tiếp trong vùng tương tác, không phụ thuộc difference heatmap.
- [x] Giữ nguyên Difference Lens như chế độ mặc định.
- [x] Chọn preset Portal Reveal từ registry/editor sẽ truyền đúng render mode.
- [x] Production build thành công.

### Bước kế tiếp

- Thêm cấu hình Portal riêng: bán kính, feather, glow và ripple.
- Tách nhóm điều khiển Portal trong inspector.
- Kiểm thử pointer/touch và export preview.
