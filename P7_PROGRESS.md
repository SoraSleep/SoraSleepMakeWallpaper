# P7 — Wallpaper runtime và export

Status: **runtime package MVP implemented; host validation pending**

## Đã hoàn thành

- Export một ZIP offline bằng `fflate`, không CDN/API/network dependency trong runtime.
- Package gồm `index.html`, `runtime.js`, `config.json`, `assets/image-a.*`, `assets/image-b.*`, `INSTALL.txt` và `LICENSE.txt`.
- Runtime canvas giữ đúng logic: base A, magnified A trong lens, B chỉ xuất hiện theo difference mask.
- Bake ảnh B về kích thước A và ghi bản `assets/image-b-aligned.png` trong package theo alignment transform.
- Sinh `preview.jpg` và `thumbnail.jpg` bằng JPEG encoder thật, có resize theo kích thước mục tiêu.
- Lens pointer smoothing dùng delta time; canvas tự resize theo viewport và hỗ trợ local assets.
- Config export giữ canvas policy, alignment transform và buyer lens settings.
- Commercial rights gate: chỉ cho tải ZIP khi cả A và B được đánh dấu `verified`.
- Validator trước export chặn rights thiếu, alignment chưa đạt, mask thiếu, network URL, file không phải ảnh và dữ liệu vượt giới hạn an toàn.
- Tên ZIP được sanitize để dùng an toàn trên Windows.
- Sinh `manifest.json` và `sha256.json` cho từng file trong package bằng Web Crypto.
- ZIP dùng thứ tự file ổn định và mốc thời gian cố định để kết quả export có tính lặp lại.
- Export UI báo lỗi fetch/package và kích thước gói sau khi hoàn tất.

## Verification

- `npm install fflate` pass, không có vulnerability mới.
- `npm run build` pass TypeScript và Vite production build.
- Runtime source được sinh hoàn toàn offline trong bundle; không có URL CDN.

## Cần hoàn thiện ở P7 tiếp theo / P8

- Loại bỏ hoàn toàn JSON mask fallback sau khi runtime host test xác nhận PNG path ổn định.
- Sinh manifest/schema đúng phiên bản Wallpaper Engine mục tiêu.
- Thêm buyer properties vào schema host thật.
- Manifest không chứa timestamp thay đổi theo lần export để giữ reproducibility.
- Thay LICENSE placeholder bằng license/rights document thực tế.
- Test import và chạy package trên Wallpaper Engine cài thật ở Windows sạch.
