# PLR — file prompt → tạo ảnh → xử lý → đóng bộ

Cập nhật 17/10/2026. Đầu vào chính là file prompt có sẵn. Concept/group tùy chọn, không bắt buộc tự tạo prompt.

## Phần đã triển khai

- TXT/CSV lên đầu PLR Studio. Giữ nội dung và thứ tự; TXT mỗi dòng không trống một prompt, CSV có prompt và title/group tùy chọn, hỗ trợ ô nhiều dòng.
- Tối đa 5 MB/5.000 prompt, 8.000 ký tự/prompt; hiển thị 50 hàng/trang. Báo trùng nhưng chỉ bỏ qua khi người dùng chọn.
- Chuẩn bị batch <=100 để phù hợp queue Manager. 500 prompt = 5 batch metadata; chưa dispatch generation.
- Lưu/khôi phục danh sách trên browser; export JSON kèm processingRecipe. Concept/series chuyển vào phần tùy chọn.
- Recipe background-art giữ nền; transparent-clipart yêu cầu PNG RGBA tách nền. Engine tách nền hiện unverified, chưa xử lý ảnh.
- Recipe giao gói: ZIP 100 MB/phần hoặc Etsy tối đa 5 phần × 20 MB. Đây là cấu hình yêu cầu, chưa xuất ZIP sản phẩm.
- JSON có status awaiting-manager-integration; chưa phải định dạng Manager hiện import/chạy được.
- Build đạt; 4/4 tests parser/recipe. UI Edge nhập 500 prompt, skip đúng 1 bản trùng khi chọn, 499 mục / 5 batch [100,100,100,100,99], pagination, save/reload, recipe clipart/Etsy, invalid import giữ danh sách, viewport390 không overflow. Không có POST/gen/credit. Test brief R1.1 chạy lại đạt.
- Bằng chứng: real-test-output/plr-prompt-import/report.json, prompt-list.json, desktop.png/mobile.png; scripts/plr-prompt-ui.mjs; plr-prompt-file.test.mjs.

## Trải nghiệm mục tiêu

Nhập file → chọn preset sản phẩm đã lưu → xem quote/ngân sách → Thực thi → Image Dream tạo ảnh → tải đúng task → xử lý theo recipe → QA → master → đóng gói → review phát hành.

Lần thiết lập đầu cần model/size, ngân sách, loại sản phẩm và quyền PLR. Các lần sau tái sử dụng preset, người dùng chỉ thay file prompt. Không thể suy ra quyền, loại file và credit cap chỉ từ nội dung prompt.

Ảnh lỗi vào review; tải/xử lý/đóng gói lại không gen lại ảnh đã xong. Nếu chỉ480/500 ảnh đạt thì ghi thiếu20, không tự khai500 hoặc tự sinh bổ sung không giới hạn.

## Nghiên cứu tách nền

| Sản phẩm | Xử lý | Kiểm tra |
|---|---|---|
| Phong cảnh/background/full art | Giữ nền | Decode, kích thước thật, màu, chi tiết |
| Clipart/chủ thể cô lập | PNG RGBA từ segmentation | Alpha thật, silhouette, viền trên nền sáng/tối, chủ thể không mất |
| File nhiều loại | Quy tắc theo row hoặc review | Không đoán chắc từ vài từ khóa |

Rembg hỗ trợ CLI/Python và batch thư mục. License thư viện khác license weights; tài liệu hiện tại đặt BRIA làm default. BRIA RMBG-2.0 weights ghi non-commercial, commercial cần thỏa thuận. Vì vậy không dùng default vô điều kiện hoặc đổi sang cloud trả phí. Ứng viên benchmark local là U2Net và BiRefNet, pin engine/version/checksum và kiểm license weights cụ thể. U2Net repository có Apache-2.0; không suy ra mọi artifact weights đều cùng quyền với code.

Nguồn: [rembg](https://github.com/danielgatis/rembg), [U2Net license](https://github.com/xuebinqin/U-2-Net/blob/master/LICENSE), [BRIA model card](https://huggingface.co/briaai/RMBG-2.0).

Không dùng threshold xóa nền trắng làm engine chung: hoa trắng/highlight có thể bị mất. Nền trắng không phải alpha. Không ghi DPI/4K như bằng chứng chất lượng nếu pixel thực chưa đạt.

Runtime Python mặc định được kiểm tra trong lượt này chưa import được rembg/onnxruntime/PIL. Chưa kiểm mọi runtime đóng gói khác, chưa cài hoặc benchmark model.

## P02.2 — Nối Manager và queue bền vững

- Manager chịu job và ngân sách, Image Dream chịu generation free, worker local xử lý ảnh, module C3 chịu pack/ZIP. PLR Studio là frontend quản lý ảnh tĩnh.
- Manager hiện dùng Electron IPC, chưa có PLR HTTP API cho trang Studio riêng. Reuse IPC khi chạy trong Manager; nếu giữ Studio riêng, cần inbox/status API loopback giới hạn rõ và kiểm origin/capability. Không thêm nút chạy khi backend chưa có.
- Parent store: listId, hash file/prompt, thứ tự, group, recipe/version, credit cap tổng. Child batches <=100; từng job có dispatch token và remote task ID.
- Reuse Profile Studio client/quote. Giữ prompt gốc riêng vì queue hiện trim prompt khi submit. Checkpoint trước dispatch; requestKey idempotent.
- States: queued → quoted → submitting → submitted → downloaded → processing → technical_pass/needs_review → approved/rejected → packed.
- submission_uncertain chỉ reconcile. Retry tải cùng task; xử lý lại từ nguồn đã hash; regenerate là attempt mới có ngân sách riêng.
- Pause ngừng gửi mới, không làm mất job đang chạy. Không tự tăng ngân sách hoặc dùng tài khoản để vượt hạn chế provider.
- Test provider giả500prompt: restart tại checkpoint, không duplicate submit. Sau đó pilot thật2–3prompt, không debug bằng cả500.

## P02.3 — Worker local

- Runtime/model riêng trong data folder, explicit model allowlist và checksum, không sửa môi trường app khác.
- Một inference session tái sử dụng, concurrency1 ban đầu; kiểm RAM, timeout, cancel, checkpoint. Nguồn immutable; output staging đổi tên khi xong.
- Giữ nền: không gọi segmentation. Clipart: PNG RGBA, giữ canvas native; trim/padding chỉ theo setting.
- Alpha area/bbox chạm biên, mất foreground hoặc còn nguyên nền là cảnh báo. Xem checkerboard/nền trắng/nền tối; chỉ số không chứng nhận viền đẹp.
- Test ảnh thật: hoa trắng, lá có khoảng rỗng, tóc/lông, bóng mềm; crash/resume không gen lại.

## P02.4 — Chọn master và QA

- Reuse final asset picker C3, đúng quan hệ source/derivative và hash; không lấy file mới nhất theo timestamp.
- Reuse công cụ chỉnh vùng Image Dream khi phù hợp, nhưng metadata sửa một vùng không chứng minh toàn ảnh đã đạt. Giữ provenance và mọi attribution bắt buộc.
- Decode, kích thước, near-duplicate, ảnh hỏng, chủ thể bị cắt và viền segmentation → review/reject có lý do.
- Quyền nguồn PLR lưu theo preset/provider và revision; giấy phép người mua không rộng hơn nguồn cho phép. Đổi nguồn/hash làm stale review.

## P02.5 — Đóng gói sau gate

- Tái sử dụng C3 streaming ZIP, thêm parent aggregator qua mọi batch. Chọn đúng masters approved, không đưa ảnh reject hoặc thông tin nội bộ vào buyer payload.
- Buyer pack: Images/ hoặc PNG_Transparent/, group folders tùy chọn, README, license đã duyệt, contact sheet, listing previews, manifest/checksums.
- Seller report riêng: prompt gốc, task IDs, model/config, credits, source/derivative hash và QA. Không đưa cookie/account secrets vào gói.
- Số ảnh kê khai lấy từ output thực. DRAFT có thể đóng tự động nhưng không giả license đã duyệt.
- Unzip CRC/hash, decode mọi ảnh, verify alpha và dung lượng ZIP; staging lỗi không hiện complete. Không recompress mù để ép giới hạn kênh.

## P02.6 — Listing và giao gói

- Listing kit theo file thật: số ảnh/kích thước pixel/format/alpha, preview không cao hơn chất lượng hàng giao.
- Etsy tối đa5file×20MB và yêu cầu disclosure AI trong listing. Bộ500PNG có thể không vừa; cần báo vượt giới hạn, không âm thầm giảm chất lượng. Giao link/tài liệu tải cần hạ tầng và chính sách được chọn/kiểm riêng.
- PLR không tự bảo đảm người mua được resell nguyên bộ trên mọi marketplace. Etsy có tiêu chuẩn sáng tạo riêng và không chấp nhận AI prompt bundles; JSON prompt nội bộ không vào buyer pack mặc định.
- Nguồn: [Etsy files](https://help.etsy.com/hc/en-in/articles/115015628347-How-to-Manage-Your-Digital-Listings), [Creativity Standards](https://www.etsy.com/legal/creativity/).

## P02.7 — Acceptance toàn chuỗi

- Hai pilot:3background giữ nền +3clipart tách nền. Provider thật, xử lý thật, ZIP thật; ghi task/config/credit/hash và xem native.
- Sau đạt mới soak50rồi500prompt với credit cap. Unit/UI fixture không phải500lượt gen thật.
- Test restart khi submit/download/segmentation/ZIP, hết credit, đổi hash. Resume từ đúng stage và không submit trùng.
- Kết quả: buyer ZIP, listing previews, seller report, blockers. Người dùng xử lý ngoại lệ và duyệt cuối trước đăng; tool không tự đăng bán.

Phạm vi hiện tại: import500prompt + batch preview + processing recipe đã hoạt động; generation/segmentation/pack chưa nối end-to-end trong PLR. Ưu tiên tiếp theo là P02.2.
