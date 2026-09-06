# Phase 4 Progress — Difference Extraction và Mask Correction

## Hoàn thành

- [x] Difference analysis chạy trong Web Worker riêng.
- [x] Warp/sample B bằng transform A→B trước khi so sánh.
- [x] Residual RGB lớn nhất trên proxy 512 px.
- [x] Multi-scale residual với bán kính 1, 4 và 12 px.
- [x] Noise floor thích ứng từ percentile 70 của từng cặp.
- [x] Low/high threshold có safe relation và chỉnh được trong UI.
- [x] Smoothstep tạo mask liên tục thay cho binary threshold.
- [x] Connected-component extraction và bỏ component dưới 18 px.
- [x] Region metrics: area, bounds và average strength.
- [x] Region list và thao tác Exclude nhanh.
- [x] Brush Reveal, Erase và Protect trên preview.
- [x] Brush size và hardness.
- [x] Undo stroke và Clear edits.
- [x] Stroke lưu normalized UV trong `.wallproj` và autosave.
- [x] Worker replay stroke để tạo texture mask cuối.
- [x] Difference Lens sử dụng texture mask từ worker.
- [x] Mask coverage, noise floor, effective threshold và progress thật.
- [x] Production build thành công; difference worker được tách riêng.

## Cách kiểm tra

1. Chạy Auto Align trong màn Align hoặc chỉnh transform tay.
2. Mở Difference; mask heatmap tự bật.
3. Dùng Reveal để thêm vùng áo hồng bị thiếu.
4. Dùng Erase/Protect để xóa thay đổi nền ngoài ý muốn.
5. Dùng Exclude cạnh một detected region để loại nhanh cả vùng.
6. Chuyển sang Lens và rê chuột qua áo.
7. Save `.wallproj`, reload/open và xác nhận stroke còn nguyên.

## Giới hạn đã biết

- Proxy hiện cố định 512 × 512; bản sau giữ aspect ratio để measurement chính xác hơn.
- Region Exclude dùng brush bao quanh bounds, chưa phải polygon chính xác.
- Protect và Erase cùng làm mask về 0; semantic lock riêng sẽ cần ở Morph sau MVP.
- Chưa có lasso/flood-fill và redo stack.
- Threshold/region quality cần benchmark bằng corpus có ground-truth mask.

