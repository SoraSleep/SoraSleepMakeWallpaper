# Phase 1 Progress — Production Architecture

## Hoàn thành

- [x] Tách renderer, project persistence và image jobs thành module riêng.
- [x] Project schema `.wallproj` version 1.
- [x] Runtime validation cho identity, assets, canvas, alignment, difference và lens settings.
- [x] Save project thành file `.wallproj` có tên an toàn.
- [x] Open project với JSON/schema validation và giới hạn 80 MB.
- [x] Autosave bằng IndexedDB, debounce 500 ms.
- [x] Khôi phục autosave khi mở app; hydration gate tránh ghi đè project cũ lúc startup.
- [x] PNG/JPEG/WebP import Web Worker với progress và AbortController.
- [x] Validate MIME, 24 MB/file, decode, 512 px tối thiểu và 8192 px tối đa.
- [x] Asset upload được lưu bằng data URL nên còn hoạt động sau reload/save/open.
- [x] UI Open, Save, reset lens và save/import status.
- [x] Production build thành công.

## Còn lại trong Phase 1

- [ ] T1.1: chuyển repository thành workspace thực với `apps/studio` và `packages/renderer` sau khi API renderer ổn định.
- [ ] T1.2: migration sẽ được thêm khi schema version 2 xuất hiện; version 1 hiện từ chối schema lạ an toàn.
- [x] T1.3 foundation: image read/decode chạy trong module Web Worker, không khóa browser main context.
- [ ] Alignment/difference jobs sẽ dùng cùng worker contract ở Phase 3–4.
- [ ] UI Cancel/Retry cho job dài; cần khi alignment được triển khai ở Phase 3.
- [ ] Test round-trip `.wallproj` bằng asset upload thật trong browser automation khi runtime browser tool khả dụng.
