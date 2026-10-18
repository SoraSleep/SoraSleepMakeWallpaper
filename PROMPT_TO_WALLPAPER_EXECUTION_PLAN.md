# Prompt → Image Dream → MakeWallpaper: kế hoạch khôi phục và hoàn thiện

Ngày: 15/10/2026. SFW only. Tài liệu nghiên cứu/kế hoạch, chưa phải triển khai hoặc chứng nhận.

## Kết luận

Giữ Image Dream làm giao diện tạo artwork, thêm adapter provider có capabilities; Manager điều phối job. Khôi phục Dreamina browser để dùng thủ công/nhánh tương thích, đồng thời đánh giá API chính thức cho sản xuất. Không coi credits/session trên website là API credentials. Không khẳng định model cụ thể khả dụng cho tài khoản trước preflight.

## Bằng chứng code và lần chạy thật

- Kết nối Dreamina qua proxy timeout; loadAccount bắt lỗi nhưng không throw, nên engine tiếp tục tạo ảnh trên trang chưa sẵn sàng.
- processNextPrompt phát batch_completed/success dù task failed.
- captureImages đánh dấu URL trước khi download/kiểm tra xong; có nguy cơ coi ảnh phát hiện là ảnh hợp lệ.
- CDN listener có thể bắt ảnh tải từ trang, chưa có tương quan generationId đủ chắc chắn.
- task lưu model/ratio/imageCount; đường executeRealGeneration đã đọc chỉ nhập prompt và click Generate. Cần xác minh các lựa chọn được áp dụng thực trên UI.
- referenceImages nhận ở API chưa được thực thi trong nhánh thật; không có mask-edit contract được kiểm chứng.
- Metadata, revision, source hash, desktop/video exports và review bundles đã có nền tảng; real MP4 tests đã chạy với demo nhưng không chứng minh prompt generation thành công.

## Thiết kế đầu ra

Một job: prompt → plan → base A → edit proposal E → composite B → pair QA → render → artifact QA → product needs_review.
Không nhận hai lần text-to-image độc lập làm A/B. Provider edit phải nhận A thực tế. Nếu không có edit capability: dừng ở needs_edit_provider hoặc cho phép người dùng cung cấp B và mask, không âm thầm đổi phương pháp.

B = A × (1−M) + E × M, trong đó M là mask đã duyệt ở cùng hệ tọa độ A, feather chỉ ở vùng biên cho phép. Công thức bảo toàn chính xác pixel ngoài mask kể cả provider đã đổi toàn cảnh. Nó không sửa được lệch hình bên trong mask: cần kiểm alignment/biên và duyệt. Lưu cả E, B, mask, provenance và phép ghép; không chỉ ghi ảnh B cuối.

## Chặng P0 — Chẩn đoán kết nối, 0,5–1 ngày

1. Thêm preflight theo provider: DNS/TLS/HTTP, proxy auth/kết nối, login state và trang create-ready. Log đã loại credentials.
2. Không tự thay proxy, vùng mạng hoặc tài khoản khi chưa biết nguyên nhân. Kiểm tra đường proxy cấu hình riêng với reachability provider; direct connection chỉ thử khi cấu hình vận hành cho phép.
3. HTTP 200 không đủ; kiểm tra selector create form và login state. CAPTCHA hoặc yêu cầu đăng nhập → needs_user_action, không báo ready.
4. loadAccount phải trả lỗi có stage; không khởi chạy prompt khi navigation lỗi.
5. Browser/page timeout có giới hạn; lỗi trước submit có thể retry tối đa 2 lần; sau submit không retry mù.

Gate: preflight có báo cáo; một lần mở create page thành công và xác nhận ready. Khi không đạt, không tiêu thụ generation request.

## P1 — Sửa trạng thái và tương quan output, 1–2 ngày

- Durable requestId/taskId/attemptId và trạng thái queued/preflight/submitting/submitted/awaiting_asset/verifying/succeeded/failed/needs_user_action/submission_uncertain.
- Batch status tổng hợp từ task: completed chỉ khi tất cả thành công; partial/failed/skipped được đếm riêng.
- Thành công chỉ khi bytes được tải, decode thành công, hash/dimensions đúng và metadata gắn đúng request.
- Không dùng capturedImages.size làm tiêu chí thành công; phân biệt candidate/downloaded/validated. Bỏ avatar, thumbnail và asset cũ bằng generation mapping.
- Retry cùng idempotency key không gửi generation lần nữa. Timeout sau submit phải reconcile kết quả trước.
- Unit/integration tests cho timeout trước submit, timeout sau submit, ảnh cũ xuất hiện, response HTML, download lỗi và sai tỷ lệ.

Gate: mọi lỗi thực được phản ánh đúng; không còn batch success với 0 ảnh.

## P2 — Adapter provider, 2–4 ngày sau khi có quyền truy cập

Interface: capabilities(), preflight(), generateBase(), editFromImage(), getRequest(), cancelIfSupported().
Capabilities gồm textToImage, imageInput, maskInput, supportedSizes, usageReporting, asyncStatus. Không suy từ tên model.

Nhánh Dreamina browser: giữ compatibility; phải triển khai/chứng minh upload A, chọn model/size, đọc lại lựa chọn, nhận output đúng task. UI thay đổi là lỗi adapter có thể sửa, không báo completed.

Nhánh API chính thức: ưu tiên benchmark Seedream qua nền tảng API chính thức nếu muốn giữ hệ sinh thái; Gemini có tài liệu image-input editing là ứng viên đối chứng. Kiểm tra region/account/giá/model thực tế trước chốt. Không tự thay website credits bằng API billing.

Secret ở backend/local secret store; không trả key/cookie qua status/gallery/manifest. Provider SDK/API version được pin; giới hạn bytes/time/concurrency.

Gate: 1 prompt SFW tạo A thật; edit(A,prompt) trả E thật; có asset/provenance/usage. Không gọi support mask nếu chỉ hỗ trợ edit bằng prompt.

## P3 — Prompt plan và mask, 1–3 ngày

- Chuẩn hóa prompt thành scene/base state/change/protected subjects/aspect/safe areas. Giữ bản gốc và bản chuẩn hóa.
- Trước tiên dùng template cố định cho cảnh SFW: café lights, flowers glow, moonlight. Không hứa mọi ý tưởng đều tạo A/B đẹp.
- Xác định mask sau khi có A: người dùng vẽ trước; segmentation chỉ bổ sung khi có benchmark. Prompt planner không tự được coi là mask detector.
- Mask convention nội bộ trắng=cho phép, đen=bảo vệ; adapter chuyển sang định dạng provider riêng.
- Chỉ duyệt ảnh A một lần trước edit B trong MVP; sau khi đạt tỷ lệ thành công mới mở fully automatic templates.
- Với ý tưởng chỉ đổi màu/độ sáng, có thể bổ sung local deterministic edit, gắn nhãn rõ; không dùng nó thay cho sinh đối tượng mới.

Gate: mask đúng vật thể và đã duyệt; không chạm face/text/geometry ngoài ý muốn.

## P4 — Pair QA và retry có ngân sách, 2–3 ngày

- Decode, kích thước, tỷ lệ, sRGB/orientation trước phân tích.
- Alignment E theo A nếu cần, sau đó ghép mask tại độ phân giải gốc. Không dùng stretch để che sai tỷ lệ.
- Đo khác biệt trong vùng, ngoài vùng và vùng biên; đánh giá mask coverage. Sau composite, pixel ngoài mask phải bằng A khi không có bước color transform khác.
- Ngưỡng hiện tại 1% spill chỉ là heuristic; hiệu chỉnh bằng fixture và artwork thật, không gắn nhãn universal pass.
- Artwork quality cần duyệt hình ảnh; pixel metrics không phát hiện đúng tay/mặt hoặc đảm bảo SFW/quyền sử dụng.
- Max 2 edit attempts ngoài lần đầu, max 1 base regeneration trong pilot; cap tiền/request và tổng tiền/job theo provider usage, dừng nếu unknown cost khi budget bắt buộc.
- Lưu mọi attempt/hash/cost/reason; chỉ retry bước hỏng, không tự gen lại cả chuỗi.

Gate: 5/5 cảnh đơn giản có A/B/mask được duyệt; thất bại giữ artifact để sửa.

## P5 — Nối tự động với MakeWallpaper, 2–3 ngày

- Tạo MotionPairProject đúng schema từ asset hash/path, preset và mask. Quyền mặc định unreviewed; technical test xuất review riêng, không giả verified.
- Snapshot job trước render, profile rõ (portrait/landscape riêng), output provenance trỏ plan revision và generation IDs.
- Headless runner dùng production renderer; nhận progress/cancel, timeout, finally cleanup; Manager theo dõi jobs thật.
- MP4 chuẩn dùng WebCodecs/hardware khi hỗ trợ. WebM fallback phải báo duration thực; normalization là bước riêng có report.
- Quay về needs_review sau xuất; chưa tự đăng bán.

Gate: một request ID truy được từ prompt đến ZIP/video và product revision; restart/retry không trùng output.

## P6 — Kiểm thử end-to-end thật, 1–2 ngày + thiết bị

1. Tạo một prompt café mới; kiểm actual A ratio, B từ A, mask và cặp ảnh.
2. Xuất 01/02, MP4 1080×1920 3/8 giây và Windows ZIP; không dừng ở clip 432×768.
3. ffprobe dimensions/codec/duration/frame count; FFmpeg decode; check loop trên frame gốc và video. Không chỉ dùng kích thước screenshot.
4. Pixel isolation; parity cùng trạng thái giữa preview/runtime/video; gamma/color/feather khác biệt phải có tolerance định nghĩa.
5. Cài Wallpaper Engine Windows; Android thật; README usability; 30 phút foreground/idle và batch soak.
6. Pilot 10 prompt SFW/2 presets ghi tỷ lệ thành công, retry, latency, chi phí, lỗi. Chỉ xác định mục tiêu năng suất sau khi có số đo.

## Lịch trình và quyết định

Mốc đầu: P0+P1 để sửa engine lỗi thật trước. P2 bắt đầu sau chọn/quyền truy cập provider. Sau đó P3→P4→P5→P6. Khoảng 10–18 ngày kỹ thuật cộng thời gian cấu hình provider và thiết bị; cần điều chỉnh sau P0/P2. Không cam kết API/edit hoạt động chỉ dựa tài liệu.

Definition of Done: một prompt mới đi xuyên hệ thống bằng ảnh thật; output đạt QA và cài thiết bị; retry không mất/trùng tài sản; trạng thái/chi phí đúng; sản phẩm cuối chờ duyệt với thông tin nguồn đầy đủ.

## Nguồn nghiên cứu

- Dreamina help: https://dreamina.capcut.com/help — tài liệu website; chưa xác minh public Dreamina consumer API phù hợp integration.
- Seedream official API documentation: https://docs.volcengine.com/docs/ark/image-generation-api?lang=en — cần kiểm chứng capabilities/account thực tế, trang dùng JS nên thông tin chi tiết chưa xác minh đầy đủ trong đợt này.
- Gemini image generation/editing: https://ai.google.dev/gemini-api/docs/image-generation — hỗ trợ đưa ảnh + chỉ dẫn để edit; không đồng nghĩa giữ nguyên pixel ngoài vùng, cần composite/QA.
- DiffEdit: https://arxiv.org/abs/2210.11427 — semantic image editing và mask guidance; tham khảo hướng tự động mask, không phải component đã tích hợp.
