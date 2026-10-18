# SoraSleep MakeWallpaper — kế hoạch cải tiến khả thi

Ngày cập nhật: 15/10/2026. Baseline: GitHub và local đã đồng bộ tại 4f4f76f.
Tài liệu này thay thế thứ tự triển khai trong FIVE_PRESET_DELIVERY_PLAN.md.
Trạng thái: kế hoạch chưa thực thi, trừ R0 đồng bộ source và kiểm tra build/test.

## Mục tiêu phát hành

Từ artwork được chuẩn bị và có quyền sử dụng, tạo được collection 20 sản phẩm với Hidden Reveal hoặc Portal Window; lưu/mở lại project; xuất Windows Web ZIP, video Android và ảnh tĩnh theo profile; tạo đủ preview, hướng dẫn và thông tin sản phẩm. Mọi nền tảng được quảng cáo phải có bằng chứng kiểm thử.

Không mở bán depth-map hoặc gọi MP4 là iPhone live wallpaper trước khi hoàn tất pipeline và kiểm tra tương ứng. Preset 03–05 tiếp tục có trạng thái thử nghiệm cho tới khi đạt gate riêng.

## Thứ tự và ước lượng

Ước lượng là ngày kỹ thuật tập trung, không phải cam kết ngày hoàn thành. Bao gồm triển khai và kiểm thử tự động; thời gian duyệt artwork, thiết bị thật và sửa lỗi phát sinh cần bổ sung. Mỗi giai đoạn chỉ bắt đầu khi dependency đạt gate.

| Giai đoạn | Ước lượng | Dependency | Kết quả |
|---|---:|---|---|
| R0 Baseline | 0,5–1 ngày | Không | Source đồng bộ, test baseline |
| R1 Renderer 01–02 | 4–6 ngày | R0 | Preview/desktop/video cùng logic |
| R2 Export và QA | 3–5 ngày | R1 | Output đúng, hủy/lỗi an toàn |
| R3 Project và Manager | 3–5 ngày | R0; export cần R2 | Nhiều project, revision, asset bền vững |
| R4 Batch production | 3–5 ngày | R2,R3 | Queue 20 sản phẩm, retry/resume |
| R5 Sales bundle | 2–4 ngày | R2,R3 | Đủ file giao khách và đăng bán |
| R6 Release pilot | 2–3 ngày | R4,R5 | Collection thử 20 sản phẩm có báo cáo |
| R7 Preset 03–05 | 6–10 ngày | R6 | Mở rộng sau khi pipeline ổn định |

MVP hai preset dự kiến 18–29 ngày kỹ thuật, cộng thời gian xác nhận trên thiết bị; không tính R7. Chạy tuần tự để giảm rủi ro thay đổi nhiều lớp cùng lúc.

## R0 — Baseline, rollback và kiểm tra hiện trạng

- R0.1 Fast-forward từ 0dce1c1 lên 4f4f76f, bảo toàn dữ liệu local. Đã thực hiện.
- R0.2 Chạy build, bridge tests, Portal smoke, Parallax wiring. Ghi rõ smoke/wiring không phải nghiệm thu hình ảnh.
- R0.3 Tạo fixture A/B cùng bố cục, A/B lệch, artwork 9:16 và 16:9, ảnh PNG alpha và mask chuẩn. Dùng artwork nội bộ hoặc được cấp phép; không suy ra quyền thương mại từ demo sẵn có.
- R0.4 Chụp fixture ở các mốc thời gian cố định; lưu metadata môi trường và commit. Không dùng kích thước PNG như bằng chứng hiệu ứng đúng.
- R0.5 Giữ bản project v2 trước migration; migration có version và test đọc project cũ.

Gate: source baseline rõ ràng; fixture có quyền sử dụng; lỗi hiện trạng được tái hiện bằng test.

## R1 — Hoàn thiện hai preset mặc định

### R1.1 Hợp đồng renderer chung

- Tách project state, camera/timeline và renderer khỏi App.tsx; bỏ Composer unreachable sau khi kiểm tra UI đang dùng.
- Định nghĩa frame state: thời điểm, camera UV, reveal progress, kích thước output, fit, reduced motion.
- Một quy tắc fit/crop/alignment cho A, B và mask; làm rõ UV gốc ảnh và UV output.
- Dùng chung shader/render kernel cho preview và frame export; runtime desktop đóng gói cùng mã bằng build, không duy trì chuỗi JS viết tay riêng.
- Khởi tạo texture một lần, resize buffer khi kích thước đổi, dispose rõ ràng. Adaptive preview không tác động profile xuất.

### R1.2 Hidden Reveal

- Duy trì ID difference-lens để đọc project cũ; thêm version hành vi để project cũ không đổi âm thầm.
- Giữ chuột/touch: tiến độ 0→1; thả/cancel/blur: trở về 0. Mask brush không đồng thời kích hoạt reveal.
- Zoom có giới hạn rõ trong UI, mặc định khoảng 1,15×; UI không hiển thị 145% khi renderer thực tế chặn 118%.
- A, B và mask cùng transform; B chỉ hiện trong vùng mask được duyệt; reveal bắt đầu sau ngưỡng 0,3.
- Video tự động dùng tiến độ có chu kỳ; reduced motion trả ảnh tĩnh hợp lệ. Đồng nhất cách trộn màu giữa GPU và video.
- Ẩn Radius/Edge feather nếu không còn tác dụng với preset; thay bằng Zoom, Reveal threshold, Transition duration và Return duration.

### R1.3 Portal Window

- B được mask vào surface riêng rồi ghép lên A; A ngoài portal không bị destination-in xóa.
- Đồng nhất radius theo cạnh ngắn ở mọi aspect; feather/glow/ripple có miền giá trị và đơn vị duy nhất.
- Hold mở rộng portal, pointer/touch di chuyển, cancel khôi phục, reduced motion tắt ripple/auto motion.
- Portal không bắt buộc difference mask; cần alignment khi A/B là cùng bố cục.

### R1.4 Test nghiệm thu

- Fixture màu đơn kiểm tra ngoài portal giữ nguyên A; vùng B không vượt mask; tâm zoom giữ điểm neo.
- So sánh frame cùng trạng thái giữa preview/runtime/export, với tolerance có ghi rõ cho color space và codec.
- Aspect 16:9,21:9,32:9,9:16; cover/contain; pointer tâm/góc/mép; thông số min/default/max.
- Test không có tương tác, touch cancel, thay asset, context lost, tab hide/resume và rời editor.

Gate: đúng hình ở các trạng thái cố định; không còn runtime cũ kính tròn trong export Hidden Reveal; hai preset không có lỗi blocker.

## R2 — Xuất file đáng tin cậy

- R2.1 Tách render/encode/đóng gói/download. Một export job trả artifact; không tự tải video rồi lại tải ZIP ngoài ý muốn.
- R2.2 WebCodecs: kiểm tra config, queue bounded, try/finally đóng encoder/frame; abort trong lúc chờ; tiến độ 100% sau mux/package thành công.
- R2.3 MediaRecorder: gắn onstop/onerror trước start, xử lý draw exception, stop tracks và clear timer trên mọi nhánh; không treo khi stop xảy ra sớm.
- R2.4 Encode thật static-fallback JPEG theo đúng crop/profile; loại bỏ trường hợp PNG đổi đuôi JPG.
- R2.5 Metadata seamlessLoop chỉ true sau test; ghi codec, dimensions, fps, duration, renderer version, project revision và checksum.
- R2.6 Validate theo capabilities của preset/target; chỉ kiểm asset được dùng. Kiểm source tồn tại, mime, giới hạn dimensions, rights và thông số hữu hạn.
- R2.7 Windows package: load offline, không asset thiếu; escape title và JSON nhúng HTML; không cho tên project phá script tag.
- R2.8 Profile mặc định: desktop interactive responsive; video Android 1080×1920/30fps và economy 720×1280; ảnh tĩnh desktop 4K và portrait. Profile 19.5:9/20:9 có crop riêng, không kéo giãn 9:16.
- R2.9 License bắt buộc seller name, support và version; lưu bằng chứng quyền artwork bên project, không chỉ checkbox.

Gate: xuất/giải mã clip 3,8,30 giây; hủy và lỗi không giữ stream/encoder; kiểm endpoint/loop seam trên frame chưa nén rồi đối chiếu video; Windows package chạy offline.

## R3 — Quản lý project, asset và Manager

- R3.1 Project Library có create/open/rename/duplicate/archive, search/filter, thumbnail; mỗi project có ID riêng.
- R3.2 Tách asset Blob khỏi JSON lớn, dùng asset ID/content hash; project bundle portable chứa asset và manifest. Không lưu blob URL như đường dẫn lâu dài.
- R3.3 Autosave theo project ID, hiển thị saving/saved/error; đóng database ở finally; phục hồi sau reload và hết quota.
- R3.4 Manager sync có revision/hash, status per project, retry giới hạn; hủy hoặc bỏ qua response cũ. Phân biệt lưu local thành công và Manager chưa sẵn sàng.
- R3.5 Manager dùng schema validation chung, khả năng list/read/restore để khôi phục từ app; hiện bridge mới tập trung ghi và status.
- R3.6 Backup/restore collection; migration v2 có test và hướng dẫn rollback. Không ghi đè file mới hơn khi sync xung đột.

Gate: tạo 20 project, reload không mất asset, duplicate không sửa bản gốc, Manager ngắt/kết nối lại không gây báo saved sai.

## R4 — Hàng đợi sản xuất

- R4.1 Job snapshot bất biến: project revision + profile + renderer version. Chỉnh project không đổi job đang chạy.
- R4.2 Queue mặc định concurrency=1, trạng thái queued/rendering/encoding/packaging/validating/done/failed/cancelled.
- R4.3 Pause giữa job, cancel job hiện tại, retry lỗi, resume job chưa chạy sau mở lại; không hứa resume giữa encoder.
- R4.4 Bộ profile và biến thể: desktop/mobile/static/economy, title/SKU/version duy nhất; trùng tên không ghi đè.
- R4.5 Lưu output/log/test report vào Manager; báo job nào thiếu artifact. /jobs cần triển khai thay vì 501.

Gate: batch 20 project với ít nhất 2 profile; lỗi một job không mất cả batch; retry không trùng artifact; RAM không tăng đều qua các job đã hoàn tất.

## R5 — Đóng gói sản phẩm bán

- R5.1 Product form: collection, SKU, title, description, tags, seller, support, personal/commercial license, AI disclosure và platform compatibility.
- R5.2 Tạo thumbnail, contact sheet, teaser có watermark và device mockup từ output thật, không từ ảnh không khớp hiệu ứng.
- R5.3 ZIP giao khách chứa folders theo platform, video/ảnh tĩnh/runtime, README theo nền tảng, license, version và checksum.
- R5.4 Listing kit tách khỏi customer bundle: cover, teaser, description/tags TXT, file list và giới hạn đã biết.
- R5.5 Storefront-neutral export trước; không tự đăng sản phẩm hoặc tích hợp thanh toán trong MVP.
- R5.6 iPhone chỉ ghi static supported; Live Photo là milestone riêng có tạo định dạng và kiểm tra trên iPhone thật.

Gate: một người dùng thử có thể cài bằng README mà không hỏi người làm; không placeholder; listing mô tả đúng file nhận được.

## R6 — Pilot và quyết định phát hành

- Bộ pilot 20 artwork gốc, gồm Signature Reveal và cozy/static collections; ít nhất 5 artwork portrait thực, không chỉ crop từ ngang.
- Cài desktop ZIP trong Wallpaper Engine Windows; kiểm tra resize, pause, properties và nhiều màn hình.
- Cài MP4 trên Android thật, xác nhận launcher/lock-screen giới hạn; kiểm tra bản economy.
- Chạy 30 phút mỗi preset và batch soak test; ghi GPU/CPU/RAM trên máy và điều kiện cụ thể. Không dùng FPS trình duyệt nền làm benchmark GPU.
- Kiểm tra 15/30/60 FPS bằng đồng hồ scheduler; adaptation có cooldown, reset thống kê khi resume, không liên tục giảm nét vì tab nền.
- Ship khi không còn lỗi sai hình, mất dữ liệu, file hỏng hoặc mô tả tương thích sai; lỗi cosmetic được ghi release notes.

## R7 — Cải tiến preset hiện có sau MVP

- Depth Motion: ưu tiên layer mode; dùng đúng asset từng lớp, offset, scale, axis; nền sạch phía sau chủ thể; cảnh báo single-layer chỉ là pan. Depth-map cần shader liên tục và test viền, không dịch ô tạo khe. Living Artwork là nghiên cứu tiếp theo, không ngầm đưa vào MVP.
- Reveal Sweep: renderer preview/desktop/video chung; hướng ngang/dọc, feather, endpoint hold và optional difference mask; bật trong UI sau gate endpoint/loop.
- Transform Loop: đổi tên hiển thị Morph Loop thành Transform Loop; masked crossfade, A/B hold; cảnh báo ảnh khác tư thế. Morph hình học/optical flow là tính năng riêng.

## Quy tắc báo cáo tiến độ

Mỗi task đánh dấu planned/in progress/verified/blocked, kèm commit, artifact và test report. Build pass chỉ chứng minh biên dịch; wiring test chỉ chứng minh cấu trúc. Chỉ gọi device-tested khi có thiết bị và kết quả. Không đánh dấu hoàn thành trước khi gate đạt.
