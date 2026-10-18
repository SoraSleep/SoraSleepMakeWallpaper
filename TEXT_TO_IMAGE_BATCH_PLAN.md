# Preset 03 — Landscape Batch

## Phạm vi đã chốt

Tạo ảnh phong cảnh tĩnh từ 1–500 prompt. Một ảnh mỗi prompt. Giữ nền, prompt nguyên văn và thứ tự; không tạo chuyển động, không tách nền. Preset 01 Reveal và 02 PLR vẫn độc lập. Tái sử dụng executor/checkpoint của Manager, không sao chép cơ chế submit Image Dream.

Free nghĩa là model nằm trong free_models của Image Dream; vẫn có thể tiêu credit miễn phí của tài khoản. Không suy ra free từ tên model hay chuyển sang paid model khi hết credit.

## B0 — contract và lối vào riêng

- Route `?studio=text-to-image`, card số03 trên trang Projects.
- Draft lưu riêng, không đè PLR; nhận TXT/CSV và dán prompt.
- Giới hạn cứng500, file5MB, prompt8000ký tự. Đọc CSV qua parser đã kiểm thử.
- Một output/prompt; giữ nguyên ảnh nền; mặc định đề xuất16:9, chưa ép model nào.
- Nghiệm thu:500 hợp lệ,501 bị từ chối, CSV multiline/duplicate giữ thứ tự; reload khôi phục draft; mở preset không gen.

## B1 — model free và cấu hình ảnh

- Đọc live `/api/models` thông qua capability Manager; chỉ lấy free_models.
- Cho chọn model, resolution, aspect từ danh sách của chính model; khi đổi model sửa lựa chọn không còn tương thích.
- Landscape gợi ý16:9, nhưng cho tỷ lệ dọc/vuông nếu model hỗ trợ. Không tự gắn nhãn4K cho ảnh2K hay cho nhập kích thước pixel provider không hỗ trợ.
- Backend kiểm lại model/config trước quote và trước mỗi task; không tin lựa chọn UI.
- Hiển thị dự toán credits, ảnh đích, số prompt; không mặc định có đủ credit cho500.
- Nghiệm thu: model paid không xuất hiện; cấu hình lỗi bị chặn; provider offline không cho chạy. Kiểm bằng live capability và fixture model list thay đổi.

## B2 — run riêng và hàng đợi bền vững

- Định danh run là text-to-image-landscape, lọc thư viện riêng với PLR, giới hạn500 cả client và server.
- Snapshot model/resolution/ratio, prompt hash, thứ tự, ngân sách và output policy bất biến khi chạy.
- Nút Lưu batch → Kiểm tra → Chạy; progress queued/submitted/downloading/completed/failed/uncertain.
- Dispatch tuần tự theo khả năng Image Dream; lưu token trước retry. Pause ngừng gửi mới; resume dùng task cũ. Không tự submit lại task uncertain.
- Thiếu credit: dừng rõ ràng, giữ kết quả, cho resume sau khi tài khoản sẵn sàng theo cơ chế của Image Dream.
- Nghiệm thu:500 fixture, mất mạng sau submit, app restart, pause/resume; không tăng attempt ngoài yêu cầu.

Triển khai: endpoint `/landscape-batches` dùng chung executor Manager, tag `preset.studio=text-to-image-landscape`, thư viện lọc riêng hai chiều với PLR. Kiểm cứng500 ở backend, preset giữ nền và0regeneration; capability free được kiểm khi nhập và trước submit. UI lưu batch idempotent, dự toán, ngân sách, run list,50dòng/trang, polling, pause/resume/reconcile; khôi phục batch riêng bằng localStorage.

Nghiệm thu B2 hoàn tất:2prompt landscape mới bằng Seedream4.7/free, output2×2560×1440, reservation10credits, mỗi prompt1attempt. Tạm dừng sau khi task thật submitted, đóng controller, mở controller mới rồi tiếp tục đúng task/token; reload UI khôi phục batch. Tải hai nguồn HTTP200, SHA256 khớp. Screenshot desktop/mobile, không page errors.19backend tests gồm2test mới cho500/501, model paid bị chặn, snapshot/giữ nền và thư viện tách biệt; có500job fixture dispatch/hash/resume. Build đạt. Hai ảnh đã xem: bố cục phù hợp, source còn watermark theo provider; hậu kỳ region editor riêng. Chưa tự retouch batch/chưa ZIP preset03. Evidence `real-test-output/text-to-image-b2/review.html`, `report.json`, `desktop.png`, `mobile.png`. Các bướcB3–B5 đã hoàn tất như ghi bên dưới;500gen thật chưa test.

## B3 — gallery và ảnh gốc

- Thumbnail phân trang/lazyload, không decode500 ảnh2K cùng lúc. Hiển thị prompt, trạng thái và kích thước thực đo.
- Xem ảnh lớn, tải ảnh nguồn nguyên bytes, retry riêng lỗi tải dùng task cũ.
- Chọn/bỏ ảnh, lọc lỗi/chưa xong, tìm prompt. Không tự loại ảnh thành công vì tương tự phong cách.
- Nghiệm thu:hash tải khớp, thumbnail không thay master; bàn phím/mobile; danh sách500 không tải toàn bộ ảnh lớn.

Đã hoàn tất B3:gallery24ảnh/trang, tìm prompt/title/group, lọc đã tải/đang chờ/lỗi/đã chọn, xem lớn bằng native dialog và Escape/focus trở lại, tải nguồn nguyên bytes bằng attachment. Thumbnail480px được cache theo source SHA, tạo tuần tự để giới hạn decode; ảnh gốc chỉ tải khi mở xem/tải. Retry thumbnail không tạo lại ảnh. Lựa chọn lưu riêng theo revision, chặn stale update và ID chưa có nguồn; mặc định chọn các ảnh đã tải nếu chưa lưu lựa chọn. Thay lựa chọn không sửa prompt/source hay trạng thái gen. Bộ lọc Đã chọn dùng lựa chọn đã lưu; chọn trang chỉ tác động24ảnh đang hiện.

Test thật dùng lại2ảnh Image Dream từ B2, không thêm credit:thumbnail-only trước mở dialog, full source chỉ1request khi mở, Escape, search/filter, save/reload selection, retry503thumbnail, download SHA/attachment đều đạt, không page errors. Test500 metadata fixture:24card/trang, phân trang tháo card cũ,0full-source request, không tuyên bố500gen thật. Backend3gallery tests gồm500metadata/selection revision/source tamper và2batch admission+1API regression đều đạt. Build đạt. Evidence `real-test-output/text-to-image-b3/review.html`, `report.json`, `scale-report.json`, `gallery-desktop.png`, `gallery-mobile.png`. B4ZIP và B5chốt đầu cuối đã hoàn tất ở các phần tương ứng.

## B4 — tải batch

- Tải từng ảnh hoặc ZIP chia phần; tên ordinal ổn định và manifest checksum, kích thước thật, model/config.
- Prompt manifest chỉ trong bản creator tùy chọn; bản giao người mua không kèm prompt mặc định.
- Xuất toàn bộ ảnh thành công hoặc ảnh được chọn; ghi rõ số thiếu và không coi batch thiếu là500ảnh hoàn tất.
- Nghiệm thu:CRC/SHA toàn ZIP, file lớn/split, hủy/tạo lại export không gen lại.

Đã hoàn tất B4:exporter riêng cho preset03, chọn all-downloaded hoặc saved-selection theo revision. ZIPstream64KiB giữ bytes gốc và ordinal, manifest ghi model/config/kích thước/hash và số thiếu/bỏ chọn;checksums.sha256 và README chung ở mỗi ZIP độc lập. Mặc định không prompt; tùy chọn creator copy thêm creator-prompts.json. Giới hạn1–1000MB/phần,max100parts; file quá lớn dừng rõ để tăng giới hạn. Hủy dừng ở checkpoint rồi dọn staging; không gen lại. Gói bất biến keyed theo snapshot, xuất lại dùng cache đã kiểmhash, tải artifact kiểmhash. Thêm bounded retry cho rename bị OneDrive khóa tạm và sửa route download README chữ hoa.

Test trên2nguồn Image Dream B2:all2ảnh→2ZIP≤2MB;selected1ảnh→1ZIP. Python zipfile kiểmCRC/SHA toànảnh và documents; không prompt/account/localpath trong gói mặc định. UI chặn exportselected khi chưa lưu gallery, lỗi1MB phục hồi khi tăng2MB, idempotency và reload lịch sử đạt. Backend test stale/empty selection, missing/omitted counts, source/archive tamper, creator opt-in, hủy rồi xuất lại; fixture500nguồn kiểm manifest đủ500ordinal. Không gen thêm/không thêmcredit. Build và UI desktop/mobile đạt. Evidence `real-test-output/text-to-image-b4/review.html`, `report.json`, `downloads/all/*.zip`, `downloads/selected/*.zip`. Gói là source gốc; chưa tự chọn retouch để export. B5kiểm thử đầu cuối và bàn giao đã hoàn tất ở phần tiếp theo.

## B5 — kiểm thử thật và bàn giao

- Chạy3prompt phong cảnh khác nhau qua Image Dream free; thử hai cấu hình được capability hỗ trợ nếu đủ credit.
- Xem output thật: bố cục phong cảnh, chi tiết, decode, tỷ lệ/kích thước; không chỉ dựa trạng thái task.
- Test restart và tải lại, ghi thời gian từng stage/attempt/credit reservation.
- Chạy10–20prompt khi pilot nhỏ ổn; chỉ thử500 thật trong đợt riêng đủ tài nguyên.500 fixture không thay thế500gen thật.
- Bàn giao review HTML, ZIP, báo cáo test và hướng dẫn vận hành.

Hoàn tất B5 ngày18/10/2026:13prompt mới qua Image Dream thật bằng Seedream4.7/free, gồm2ảnh16:9,1ảnh3:2 và lô10ảnh16:9.12ảnh2560×1440,1ảnh2496×1664; mỗi prompt1attempt, tổngreservation65credits, không khẳng định wallet delta đã đo. Lô10mất8.55phút từ attemptđầu đến downloadcuối, bao gồm chờprovider/quote/download; có một lượt tải chậm rồi thành công cùngtask, không genlại.13ảnh vào3ZIP, CRC/SHAđủ13, không thiếuảnh.

Đã test lại import→free config→quote→run→pause/restart/resume→gallery→ZIP→reload/download. Sửa thêm lỗi debounce tìm kiếm có thể resettrang khi chuyển nhanh, retry bounded khi OneDrive khóa commitrun mới, và banner mất kết nối polling để khóa start/resume khi trạng thái cũ. Backendregression56test đạt; saufixcommit bổ sung và chạy11storetests đạt. Frontendcontract2test, các UIimport/freeconfig/gallery/500fixture/export và fixture mất/kết nốilại đạt. Buildđạt. Visualreview3ảnhlônhỏ và gallery10ảnh đã xem; nguồn vẫn có providerwatermark, không tự nhận là ảnh sạch để bán.

Bàn giao `LANDSCAPE_BATCH_USER_GUIDE.md`, `real-test-output/text-to-image-b5/review.html`, `report.json`, `acceptance.md`; ZIP trong wide/photo/soak. Lệnh `npm run test:t2i-final` dùng pilotdurable, batch đã xong không genlại. Giới hạn còn lại:500gen thật chưa benchmark; xử lý watermarkTelea cầnduyệt riêng và bảnretouch chưa tự thay sourceZIP. B0–B5 hoàn tất trong phạm vi đã kiểm chứng này.

## Trạng thái

B0–B5 đã hoàn tất trong phạm vi test ghi ở từng phần. B0:route và lối vào số03, TXT/CSV/dán prompt, draft riêng, giới hạn500 và bảng50dòng/trang. Hai contract test và UI test500/501, CSV multiline, draft reload, desktop/mobile, không generation request đều đạt. Evidence `real-test-output/text-to-image-b0/report.json`, `desktop.png`, `mobile.png`.500gen thật và tự độngretouchđểbán chưa được xác nhận.

### B1 — đã hoàn tất và test thật

UI đọc capability free_models qua Manager, chọn model/resolution/ratio tương thích, tự điều chỉnh khi đổi model, lưu config riêng và khôi phục sau khi xác minh live capability. Refresh thất bại xóa capability cũ; không dùng model chưa xác minh. Ba model hiện Image Dream cung cấp: Seedream5.0Lite (2K/4K), Seedream4.7 (2K/4K), GPT2.0 (1K), tỷ lệ theo từng model. Không hardcode danh sách này vào UI.

Live pilot một prompt phong cảnh hồ núi bình minh bằng Seedream5.0Lite/free-model qua installed Image Dream:2K16:9, output2560×1440, một attempt, reservation15credits. Master giữ nguyên hash nguồn, giữ nền. Đây là gen thật;15 là quote/reservation, chưa đo wallet delta. Bộ test quote/backend7/7, contract2/2, UI desktop/mobile live capabilities/model switch/restore/offline/no-generation và build đạt. Sửa nút mobile để tương phản rõ.

Evidence: `real-test-output/text-to-image-b1/review.html`, `report.json`, `ui-report.json`, `landscape-original.jpg`, `desktop.png`, `mobile.png`. Live pilot dùng store thử nghiệm riêng và backend executor đã kiểm thử; tại thời điểmB1 chưa có nút chạy batch preset03; B2–B5 sau đó đã được hoàn tất.

Visual QA B1: ảnh hồ núi có bố cục16:9 và nền đầy đủ, nhưng nguồn provider có DreaminaAI watermark góc dưới phải. Image Dream đang dùng nhánh tải chính thức; tính năng chỉnh ảnh/watermark trong app là bước preview/save riêng (`/api/image-edits/preview`), không tự chạy theo batch. Vì thế output test kỹ thuật đạt nhưng chưa phải ảnh sạch sẵn đăng bán. Giữ ảnh nguồn nguyên vẹn và thêm xử lý hậu kỳ có preview/ghi nhận bản dẫn xuất vào B3 trước khi chốt chất lượng đầu cuối.

### Tích hợp region editor Image Dream

Preset03 có mục Remove watermark sử dụng chính API image-edits của Image Dream qua adapter Manager. Chọn ảnh từ gallery theo asset hash, vùng góc dưới phải/trên trái hoặc tọa độ pixel, xem ảnh gốc và preview, xác nhận đã xem rồi lưu PNG riêng vào kho Image Dream và tải về. Giới hạn5% diện tích, preview10phút theo engine hiện có. GET download không tự save; sửa mask làm mất hiệu lực preview/checkbox cũ. Không generation/không thêm credit.

Test thật hai vùng trên ảnh B1: API preview/save/download đạt, hash nguồn giữ nguyên, PNG2560×1440, pixel ngoài hai vùng giữ nguyên. UI real preview, review gate, thay tọa độ mất preview và build đạt. Tuy nhiên visual QA thấy mảng nhòe/vệt hình học trong vùng inpaint Telea, nhất là mask rộng và sát mép. Đây là tích hợp tính năng hiện có thành công, không phải xác nhận chất lượng retouch đạt bán. Chưa bật tự động xóa watermark500ảnh hoặc tự đưa bản retouch vào ZIP. Evidence `real-test-output/text-to-image-watermark/review.html`, `report.json`, `ui-report.json`.
