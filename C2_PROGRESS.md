# C2 — Landscape Studio / Spring Sakura MVP

Đã triển khai trong source MakeWallpaper và Manager ngày 16/10/2026. Chưa cài đè ứng dụng production.

## Chức năng đã có
- Workflow phong cảnh độc lập, một ảnh A, không tạo B giả hoặc mask khác biệt giả để dùng renderer cũ.
- Recipe Spring Sakura: cánh hoa xác định bằng seed, shimmer nước trong vùng chọn, ánh sáng nhẹ trong vùng chọn.
- Vẽ vùng chữ nhật bằng chuột/pointer: nước, ánh sáng, bảo vệ. Vùng bảo vệ chặn mọi hiệu ứng và giữ nguyên pixel vùng đó.
- Cạnh vùng nước/ánh sáng có alpha mềm; không dịch hoặc phóng cả ảnh để giả lập chuyển động.
- Chọn chu kỳ 4/8/12/16 giây, số lượng/kích thước cánh hoa, cường độ nước/ánh sáng, reduced motion và scrub preview.
- Preview, video và gói desktop dùng chung createLandscapeRenderer.
- Lưu/mở project phong cảnh JSON riêng; không đổi schema dự án A/B cũ.
- Xuất MP4 H.264 24/30 FPS và Web Wallpaper offline. UI hiện xuất 30 FPS; API giới hạn tối đa 1920×1080 pixel theo tổng diện tích, cho cả portrait 1080×1920.
- Renderer job API nhận workflowType=landscape, presetId=spring-sakura và một imageA; kiểm tra hash/kích thước decode/settings/regionReview.
- Manager đọc capability singleImageMotion của MakeWallpaper. Collection landscape có nút mở ảnh trong Landscape Studio khi phiên bản MakeWallpaper hỗ trợ.
- Handoff dùng asset ID, kiểm tra gallery local và SHA-256, không nhận URL/file path tùy ý. Nút mở không tạo thêm ảnh AI.
- Runtime offline có giới hạn FPS, giới hạn pixel/DPR, giảm FPS khi frame chậm, setPaused/applyGeneralProperties của Wallpaper Engine, visibility và offscreen pause.
- Preview hủy RAF/observer/listener khi rời trang, dừng khi ngoài viewport và tôn trọng reduced motion.

## Kiểm tra và output
- MakeWallpaper contract suite: 19/19 đạt, gồm 4 bài mới cho landscape/source handoff.
- Build/TypeScript MakeWallpaper và Manager đạt; 19 bài Manager queue/collection/budget liên quan đạt.
- Hai preset A/B cũ xuất MP4 và desktop qua job API vẫn đạt.
- UI Edge với ảnh thật từ installed Image Dream: handoff, pointer vùng, gate duyệt, save/reopen, download desktop, offscreen pause, reduced motion dừng/chạy lại, ba lần mở/đóng trang đạt. Không lỗi JS.
- MP4 ảnh thật: 720×1280, H.264, 30 FPS, 8 giây, 240 frame, giải mã FFmpeg đạt.
- Pixel QA: frame t=0 và t=8 giống hệt; frame giữa có chuyển động; vùng bảo vệ không đổi; nước không làm đổi pixel ngoài mask nước trong test tách hiệu ứng.
- Gói desktop khoảng 0,98 MB, nguồn JPEG một ảnh; offline runtime và manifest/checksum kiểm tra được.
- Smoke runtime Edge 60 giây có báo cáo riêng; đây không phải soak 30 phút trên host/thiết bị thật.
- Không tạo ảnh AI mới, không dùng credits. Dùng ảnh A đã có; bản gốc còn watermark, không được xử lý lại trong bước này.

## Bằng chứng
- real-test-output/c2/spring-sakura.mp4
- real-test-output/c2/spring-sakura.desktop.zip
- real-test-output/c2/acceptance-report.json
- real-test-output/c2/ui-report.json
- real-test-output/c2/runtime-soak.json
- real-test-output/c2/studio-ui.png

## Giới hạn còn lại
- MVP dùng vùng chữ nhật, chưa có mask cọ/polygon/segmentation hay depth parallax.
- Hiệu ứng nước là biến dạng 2D rất nhẹ, không phải mô phỏng vật lý hoặc AI video.
- Chưa test 30 phút trong Wallpaper Engine, Windows sleep/wake hoặc điện thoại thật. Những tiêu chí xác nhận thiết bị/độ ổn định dài hạn còn mở ở C5; không đánh dấu sản phẩm commercialReady.
- Chọn derivative đã chỉnh/duyệt từ Image Dream và đóng stock/collection bán hàng nằm trong C3.
- Không hứa gói web chạy trên Android hoặc MP4 là Live Photo iPhone.

## Cách mở
Local source: http://127.0.0.1:5173/?studio=landscape hoặc Projects → Landscape Studio · Spring Sakura. Nạp ảnh, vẽ vùng, duyệt và xuất. Có thể mở bằng link asset ID từ Manager sau khi nạp bản source mới.

## Lệnh kiểm tra
- npm run test:bridge
- npm run test:landscape
- npm run test:landscape-ui
- node scripts/c2-runtime-soak.mjs

Host API đối chiếu: https://docs.wallpaperengine.io/en/web/api/propertylistener.html
