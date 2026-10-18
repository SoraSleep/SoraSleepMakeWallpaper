# Cập nhật hiện hành — 17/10/2026

PLR-02/03 và PLR-04 đã qua acceptance thật. Các ghi chú pending/disabled phía dưới là lịch sử đã được thay thế bởi cập nhật này.

- Quote thật qua installed Image Dream 1.0.2 đạt; cấu hình khóa, mở lại run, không submit ở preflight.
- Dispatcher tuần tự đã bật: start/pause/resume/reconcile, token bền vững, phục hồi tiến trình, executor lease, credit reservation cap, tải file theo task và kiểm SHA/native dimensions/full decode.
- Pilot 2 prompt thật đạt, mỗi prompt một attempt, 2048×2048; quote/reservation tổng30. Chưa đối soát wallet delta. Chưa gen thật500 ảnh.
- Sửa profile nền còn giữ sau task: chỉ đóng profile thuộc attempt của run đã hoàn tất và queue đã idle; không đóng phiên không thuộc run.
- 207/207 Manager tests, typecheck/build Manager và build MakeWallpaper đạt. Fixture500 jobs đạt; không thay cho test500 generation thật.
- Evidence: real-test-output/plr-04/review.html và real-pilot/report.json; preflight real-test-output/plr-02-03/latest.json.
- Source vẫn needs_review, overlay nguồn chưa xử lý; worker tách nền/QA/đóng gói chưa hoàn tất. Bước tiếp PLR-05. Không có commercial-rights gate.
- Helper source17930 dùng data D:/SoraSleep Main/Data/Manager/PLRRuns. Không cài đè installed app.asar.

---

# PLR — tiến độ triển khai theo chặng

## 17/10/2026: PLR-02/03 — cấu hình và preflight (acceptance thật còn chờ)

Đã thêm plr-preflight.mjs trong Manager: kiểm app ID Image Dream, đọc free model capabilities, validate model/aspect/resolution, chặn busy/profile mở và dispatch chưa rõ kết quả trước quotation. Quote dùng đúng installed Profile Studio client, chỉ gọi endpoint preflight, không submit/archive.

Preflight lưu theo preset hash và run state revision, thời hạn 10 phút. Hiện per-task quote, số prompt queued, dự toán tổng và budgetCoversEstimate. Không quy đủ credits cho một task thành đủ cho toàn collection. Dispatcher chưa bật.

API thêm GET /image-dream/capabilities và POST /runs/:id/preflight. UI chọn model/cấu hình từ app thật, khóa cấu hình của run đã lưu, mở lại run và quote sau khi browser draft bị xóa; có thao tác tạo run mới, không sửa ngầm run cũ. Panel Manager nay truy cập được cả khi chưa nhập file.

Tests: 198/198 Manager; TypeScript/build Manager và MakeWallpaper build đạt. UI qua HTTP backend thật với provider fixture đạt: cấu hình, lưu, báo giá, reopen không cần local draft, khóa config và tạo draft mới không giữ quote cũ.

Test installed app thật đã thực hiện: Image Dream đang busy với profile mở; controller chặn đúng sau GET health/models, không gửi POST quotation/generation, queue không đổi và attempts=0. Evidence live-latest.json ghi realQuoteVerified=false, realBusyGateVerified=true. Không giả test fixture là quote thật.

Đã hỏi người dùng phiên hiện tại còn dùng không. Chưa đóng profile hoặc chạy test quote thành công khi câu hỏi này chưa được trả lời. Cần chạy lại scripts/plr-preflight-ui.mjs sau khi phiên rảnh, sửa lỗi nếu có rồi mới chốt PLR-02/03 và chuyển dispatcher.

Backend source17930 đã bật lại với code mới; installed app.asar không bị thay. Evidence: real-test-output/plr-02-03/mock-latest.json và live-latest.json. Lệnh test: node scripts/plr-preflight-ui.mjs --mock; node scripts/plr-preflight-live-check.mjs; node scripts/plr-preflight-ui.mjs (app rảnh).

## 17/10/2026: PLR-00 / PLR-01 và import API đầu tiên

Đã triển khai schema import/preset, parent manifest, item và attempt records trong source Manager. Prompt verbatim, ID từng dòng riêng, duplicate skip tùy chọn; 500 prompt dài không đi qua limit collection30KB cũ.

Store dùng atomic write và bounded retry Windows lock, global writer lock có phát hiện owner đã thoát, idempotency requestKey/fingerprint, staged create và revision guard. Bản staging chưa commit không hiện thành collection hoàn tất. Lượt dispatch bị ngắt chuyển uncertain khi recover; không tự gửi lại. Checkpoint attempt gắn task/batch identity và yêu cầu artifact hash/dimensions trước needs_review.

Đã có API loopback import/read, capability app ID và origin checks. Studio lưu collection vào backend, đọc danh sách sau reload. Cổng17930 được chọn sau khi phát hiện17898 có dịch vụ khác; không dừng dịch vụ đó. Manager main source khởi tạo API, lỗi port không làm hỏng startup app cũ.

Backend source hiện chạy bằng scripts/plr-manager-service.mjs trên17930, data D:/SoraSleep Main/Data/Manager/PLRRuns. Không cài đè installed app.asar. Khi chuyển sang Manager chạy source mới, dừng helper trước để Manager sở hữu port; không để hai orchestrator generation. Helper hiện chỉ import/read, generation disabled.

### Test đã đạt

- 193/193 Manager tests; Manager TypeScript/build đạt.
- 9/9 MakeWallpaper unit tests; production build đạt.
- Store500prompt trên đĩa thật, đọc lại bằng tiến trình Node mới, fault injection create/rename/disk, lock và prompt mutation.
- HTTP backend thật và Edge UI thật qua localhost5173; import500prompt dài, hai prompt giống nhau có ID khác, repeat save cùng request không nhân run; reload đọc lại. Dữ liệu test nằm trong thư mục evidence riêng.
- Regression nhập file/recipe/frontend đạt.

### Pilot Image Dream thật

Người dùng xác nhận đã dùng xong. Đã đọc route đóng profile trong app cài đặt và đóng phiên qua API được app hỗ trợ; không kill process hoặc xóa tài khoản. Health chuyển busy=false.

Một prompt botanical SFW gửi nguyên bản qua installed Profile Studio client, model high_aes_general_v50, aspect1:1, resolution2k, quote15freecredits. Checkpoint dispatch/token/remote task lưu trên parent store, poll bằng tiến trình script mới, không submit lại.

Ảnh tải2048×2048,372105bytes; SHA256641988856bad010fa1a15555c747b788ce8bcb339b6eb1111a0324d8d4a87200 khớp asset ID, ffprobe/FFmpeg decode đạt. Đã xem ảnh và nhận đúng cành hoa5bông trên nền ivory. Source overlay còn hiện; xử lý cuối chưa chạy. Trạng thái needs_review, chưa approve sản phẩm hoặc đóng ZIP.

Script scripts/plr-real-pilot.mjs chỉ --submit một lần; lượt sau --poll. Record đã có attempt thì chặn submit lặp.

### Phần chưa hoàn tất

PLR-02 chỉ mới import/read và UI wiring. Chưa start/pause/resume qua Studio, chưa preflight/config selector hoàn chỉnh, chưa dispatcher collection tự động. Pilot dùng script test adapter thật, không giả là500job đã gen.

Nguồn file hash/preset history và lựa chọn resume/new-run đầy đủ ở UI còn cần hoàn thiện. Chưa có worker tách nền, QA multi-batch, packaging/listing aggregator. Không thêm commercial-rights gate.

### Evidence

- real-test-output/plr-00-01/review.html
- real-test-output/plr-00-01/completion-report.json
- real-test-output/plr-00-01/ui-latest.json
- real-test-output/plr-00-01/real-pilot/pilot.json và image-original.jpeg
- Tests Manager: desktop/plr-store.test.mjs và plr-api.test.mjs

Bước tiếp: hoàn thiện PLR-02/03 (config/preflight + run selection), sau đó dispatcher PLR-04 và pilot thật trước khi sang xử lý nền. Chưa tuyên bố toàn bộ kế hoạch đã hoàn thành.

## PLR-05A — 17/10/2026

Đã thêm worker tạo native master giữ nguyên bytes, preview640px và processing.json riêng cho từng item. Kiểm SHA nguồn, full decode, native dimensions và aspect ratio; retry tái sử dụng output đã kiểm hash, không gen lại. Có API POST /runs/:id/process, GET /runs/:id/processing và nút xử lý trong Studio. Dùng executor lease chung, chặn chạy đồng thời preflight/generation/processing.

Test trên hai ảnh Image Dream thật của PLR-04 đạt2/2; master SHA bằng nguồn, retry đạt, attempts không đổi, không gọi generation. Pilot khoảng1.1giây trên hai ảnh này; không phải benchmark500ảnh. Ba test processor/API và sáu preflight đạt; MakeWallpaper build đạt. Xem real-test-output/plr-05/review.html.

Đã xác nhận bản Image Dream hiện hành có region-inpaint OpenCV, cần rect và so sánh/lưu; không phải clean-source API hàng loạt. Worker hiện giữ nguyên nguồn, không tự gán watermark clear, không tự approve bán. Tách nền chưa có worker được kiểm chứng, clipart bị chặn rõ. PLR-05B tiếp theo: worker segmentation + alpha/edge QA; bước xử lý vùng ảnh cần kiểm tra riêng. Không cài đè Image Dream hoặc app.asar.

## PLR-05B — 17/10/2026: worker tách nền clipart

Đã cài runtime Python3.12 riêng tại D:/SoraSleep Main/Runtime/Python/plr, dependencies khóa trong desktop/plr-segmentation-requirements.txt. Model BiRefNet General Lite224MB cục bộ tại Runtime/Models/PLR; setup script kiểm session CPU. Worker kiểm checksum model trước inference, runtime không tự tải model thiếu/hỏng. Không sửa installed Image Dream hoặc app.asar.

Worker JSON-lines giữ một session cho collection, xử lý tuần tự, giới hạn threads2, timeout180s/ảnh, giải phóng khi xong/dừng. Chỉ áp dụng alpha lên RGB gốc; giữ kích thước và alpha gốc, không upscale/crop. Kiểm PNG RGBA, mask không rỗng/không hoàn toàn opaque, tỷ lệ trong suốt, alpha mềm, foreground bbox và chủ thể chạm mép. Xuất alpha-review.jpg trên nền trắng/tối/caro. Không tự gán chất lượng bán, không tự gán watermark clear.

Nối API source/master/preview/alpha-preview có containment+hash checks. Cache theo source hash và recipe, kiểm hash preview/alpha preview, xử lý lại nếu output bị sửa. UI cho clipart thực thi khi worker sẵn sàng, nút tách nền và link Master/Kiểm tra viền sau xử lý. Cùng executor lease với generation; API đóng thì dừng worker. Ảnh nền vẫn giữ nền.

Pilot tái dùng2file thật từ PLR-04 trong test run có ghi rõ nguồn dẫn xuất; không gọi generation mới, không tiêu credits gen. 2PNG2048² đạt, khoảng54giây CPU tổng. Ảnh nhánh hoa có chạm mép từ nguồn, cảnh báo giữ nguyên. Ảnh tách trà giữ cup/saucer/flowers. Đã xem3nền; trạng thái needs_visual_review. Test HTTP tải master/preview/alpha-preview, retry không xử lý lại đạt. UI thật qua Edge đạt, chỉ POST process.

211/211 Manager tests, 9/9 PLR tests, MakeWallpaper build đạt. Evidence real-test-output/plr-05b/review.html, report.json, ui-report.json và studio.png. Script test: npm run test:plr-segmentation; npm run test:plr-segmentation-ui. Helper17930 đã khởi động lại, segmentation=true, executor idle và Image Dream idle.

Bước tiếp PLR-06: QA collection, phát hiện trùng/gần trùng và chọn ảnh đạt trước tạo ZIP/listing. Chưa có bước tự động xử lý overlay hoặc đóng gói sản phẩm hoàn chỉnh; chưa benchmark500 segmentation thật. Công cụ sửa vùng Image Dream vẫn riêng, cần rect và so sánh lưu.

## PLR-06 — 17/10/2026: QA collection và danh sách chọn

Thêm desktop/plr-quality.mjs: kiểm master/hash/nguồn processing, kích thước native tối thiểu512, aspect, RGBA clipart, chuyển tiếp cảnh báo alpha/chạm mép. Full-decode thất bại chỉ chặn row tương ứng, không làm mất báo cáo cả bộ. Phát hiện trùng SHA256 và gần giống bằng dHash64bit + mean RGB difference trên ảnh32² ghép alpha nền trắng. Gần giống là cảnh báo, không tự xóa. Feature cache theo masterSHA và recipe; chưa phải semantic/aesthetic detector hoặc watermark detector.

API GET/POST /runs/:id/quality và POST /runs/:id/selection. Selection lưu riêng, revision guard và fingerprint dữ liệu/bytes hiện tại, chặn chọn hai bản trùng SHA, chặn master thiếu/hỏng; ảnh thay đổi phải phân tích lại. Dùng executor lease chung với gen/processing, không thêm rights gate. UI có gallery24ảnh/trang, checkbox, chọn đề xuất, lưu và mở lại. Không tự duyệt bán hoặc đóng gói.

Pilot thật dùng2master đã gen Image Dream +2control được ghi rõ (copybytes và RGB+2), không gen thêm. Phát hiện1bản trùng hệt và nhóm3ảnh gần giống; cảnh báo nhánh hoa chạm mép. Studio UI chặn chọn2trùng hệt, lưu1ảnh và reload còn lựa chọn. Báo cáo real-test-output/plr-06/review.html, report.json và studio.png. Lệnh npm run test:plr-quality.

Khi QA phát hiện previewJPEG bỏ alpha làm hiện RGB nền cũ, đã sửa ghép nền tối đúng alpha, migration cache chỉ tạo lại preview không inference/gen lại, master giữ nguyên. Test migration2master thật đạt. Đã chỉnh tương phản nút thao tác. Full Manager suite214/214 trước sửa preview; sau sửa15targeted backend tests (gồm4quality),9PLRfrontend tests, UI pilot và MakeWallpaper build đạt. Không chạy500gen/segmentation thật.

Bước tiếp PLR-07: đóng gói collection từ selection hiện hành, kiểm fingerprint và hash lại trước ZIP, manifest sản phẩm, preview/contact sheet và tên file theo bộ. Vẫn chưa tự xác nhận chất lượng thẩm mỹ/overlay; chưa công bố sản phẩm là ready-to-sell.

## PLR-07 — 17/10/2026: ZIP collection và contact sheet

Thêm packager dùng lại writeStoredZip/splitZipFiles dạng stream64KiB. Xuất từ selection đã lưu, kiểm fingerprint/revision và master hash trước khi xuất, ghi ZIP có xác nhận hash trong stream và kiểm snapshot lại trước commit. Master bytes giữ nguyên; tách phần theo giới hạn người dùng1–1000MB, tối đa100phần. Folder staging chỉ publish sau hoàn tất, lỗi quá cỡ/source mutation không để lại pack hoàn tất. Idempotent theo snapshot+revision+options; không tự gen lại.

Buyer ZIP gồm images/<collection>-NNNN.ext, manifest.json, README.txt, contact-sheet.jpg, LICENSE.txt nếu seller nhập. Manifest không có prompt/account/local paths. Mỗi phần lặp metadata/contact sheet để mở độc lập; README nói tải mọi phần để đủ collection. Contact sheet tối đa24ảnh đầu, có alpha caro, không crop/upscale master. Điều khoản seller được giữ nguyên, không tự đặt quyền PLR. Report nội bộ giữ reviewWarnings và readyForSale=false, không có rights gate.

API package/list/download có loopback+origin+header checks, containment và hash cho file tải; stream download. UI nhập tên bộ, giới hạn MB, điều khoản tùy chọn và tải từng ZIP/contact sheet/manifest, mở lại vẫn có lịch sử. Shared executor lease chặn xuất đồng thời gen/processing/QA. Chưa tự tạo marketplace listing.

Pilot thật dùng2PNG master Image Dream đã có (không gen mới), chọn branch+cup trong isolated QA teststore, giới hạn2MB tạo2ZIP1.17MB/0.97MB. Đã tải qua API và Python zipfile độc lập kiểm CRC, SHA256, đúng2ảnh và buyer metadata không lộ prompt/tài khoản/path. UI xuất lại không nhân pack, reload còn links. Contact sheet đã xem. Gói test có nhánh hoa chạm mép và LICENSE mẫu; chưa tự gán chất lượng bán.

218/218 Manager tests,9/9PLRfrontend tests và MakeWallpaper build đạt. Tests gồm multi-part, idempotency, archive tamper, source mutation, stale snapshot và oversized image cleanup. Evidence real-test-output/plr-07/review.html, downloads/*.zip, report.json và studio.png. Chạy npm run test:plr-package. Source helper17930 cập nhật; không cài đè app.asar.

Bước tiếp: hoàn thiện điều phối đầu-cuối và vận hành collection lớn (tự nối gen→processing→QA→package theo cấu hình, pause/restart, xử lý lỗi từng dòng, test nhiều prompt thật tăng dần trước500). ZIP sản phẩm đã có, nhưng chưa được coi là toàn bộ workflow một click hoàn tất.

## PLR-08 — 17/10/2026: điều phối prompt→ZIP

Thêm workflow controller lưu workflow.json: config bất biến, checkpoint stage, pause/resume, startup recovery chỉ chuyển paused (không tự submit khi mở lại), resume sử dụng row/task đã có. Workflow lease giữ toàn luồng và executor lease mỗi stage; controller/process khác không chen vào khoảng chuyển stage. API chặn manual write trong khi workflow active. Pause gen không hủy provider task; pause processing kết thúc bước hiện tại rồi dừng. Runtime active flag giúp UI chờ giải phóng trước resume.

Luồng: chuẩn bị provider/quote còn hạn và budget đã lưu → dispatcher tuần tự → processor cache → quality → select suggested-v1 → packager. Không có candidate thì needs_review, người dùng chọn rồi resume; generation/processing lỗi thì blocked để kiểm tra. Không tự gửi lại task không rõ kết quả, không tự tiếp tục bỏ lỗi gen, không tự gán sản phẩm đạt thương mại. Config ZIP/điều khoản giữ snapshot, số ảnh xuất/excluded hiển thị rõ.

UI thêm Chạy toàn bộ đến ZIP, pause/resume, stage progress và link ZIP/contact sheet ngay khi xong. API GET /runs/:id/workflow và POST /workflow/start|pause|resume. Đã mở installed Image Dream khi API chưa chạy; dùng profile/account sẵn có, model free, không dùng paid API, không thay app.asar.

Pilot mới2prompt (bình hoa xanh và bình tưới xanh), 2K1:1, cap30credits. Pause/resume thật sau task đầu gửi; cả2row chỉ1attempt. 2ảnh nguồn tải SHA/native decode, xử lý PNG2048² và QA/pack tự động. Lần QA đầu phát hiện false positive do nền trắng chiếm đa số. Đã sửa feature recipe v2: foreground IoU + mean màu vùng chủ thể, không pha loãng bởi nền trắng. Tiếp tục trên2ảnh cũ (không gen thêm) → tự chọn2/2 → 1ZIP1.87MB. Regression2real+2duplicatecontrols của PLR-06 vẫn phát hiện đúng trùng/gầntrùng.

ZIP tải quaAPI và Python zipfile CRC/hash đạt. Đã xem alpha3nền và contact sheet; kích thước chủ thể trong canvas vẫn khác nhau, chưa tự chuẩn hóa. Mở lại UI có completed và linkZIP, GET-only. Resume completed bằng controller mới sử dụng cache, cùngpackkey và không tăngattempt. Forced provider crash chỉ unit test, chưa kill app thật trong pilot.

223/223 Manager tests (gồm workflow fail/resume, lease giữa stages, persisted recovery, no candidates và QA foreground regression),9/9PLRfrontend tests, MakeWallpaper build đạt. Reservation/quote tổng30, không coi là wallet delta đã đo. Source Image Dream hiệnidle sau cleanup.

Evidence real-test-output/plr-08/review.html, report.json, reopen-ui.json, studio.png và downloads/*.zip. Lệnh npm run test:plr-workflow-live có durable pilot guard, chạy lại completed không gen thêm. review-required.json lưu lần false-positive lịch sử. Chưa test500gen/segmentation thật. Bước tiếp PLR-09 pilot10prompt, theo dõi thời gian dài và lỗi từng dòng; không tuyên bố toàn bộ vận hành500 đã hoàn tất.

## PLR-09 — 17/10/2026: pilot 10 prompt thật và xử lý sự cố từng dòng

UI workflow hiển thị số ảnh nguồn, master, dòng chờ/lỗi/đã loại và credits giữ chỗ; xem trạng thái từng dòng. Operator có thể loại riêng dòng lỗi rồi tiếp tục; lịch sử attempt, prompt gốc và reservation được giữ. Không cho loại task đang ở trạng thái chưa chắc chắn. Processor ghi lỗi đúng dòng vào processing-error.json cùng audit append-only; retry bỏ lỗi hiện hành sau khi thành công. Pause xử lý dừng sau ảnh đang chạy và resume dùng cache. Quote mới trừ mọi reservation trước đó, kể cả attempt lỗi/đã loại; hard cap vẫn nằm ở store.

Pilot Image Dream đã cài: 10 prompt mới chủ đề Spring Garden, 2K 1:1, clipart tách nền CPU, cap150. Đã tạm dừng, đóng controller và mở tiến trình mới, khớp số attempt và tiếp tục task cũ. Một lần đứt kết nối read-only của script quan sát được khôi phục từ checkpoint mà không submit lại. Kết quả 10/10 ảnh nguồn, 10/10 PNG RGBA2048², 10/10 QA đề xuất, 0 trùng/gần trùng/chạm mép, mỗi dòng đúng1attempt và tổng reservation150. Đây là reservation đã ghi, không phải số credits ví đã đo. Contact sheet nhìn đồng bộ watercolor nhưng chủ thể còn khác kích thước tương đối; mỗi ảnh vẫn cần visual review.

Giới hạn ZIP pilot2MB quá nhỏ cho một PNG1.86MB cộng metadata/contact sheet. Bước package dừng rõ `zip-single-file-exceeds-limit`, không tạo lại ảnh. Đã thêm sửa giới hạn ZIP chỉ khi blocked ở package do kích thước, chỉ cho tăng trong1–1000MB, lưu lịch sử thay đổi và cập nhật config hash. UI nâng lên10MB rồi resume dùng master/QA cũ; xuất2 ZIP9.14MB và4.41MB. Python zipfile kiểm CRC và SHA256 đủ10ảnh. Gói vẫn `readyForSale=false` chờ nhìn từng ảnh, không tự xác nhận bán.

Test lỗi riêng dùng1master Image Dream đã có và2 lỗi **tiêm vào fixture**, không phải2lỗi provider xảy ra thật: một nguồn hỏng và một task provider failure giả lập. UI loại lần lượt, giữ reservation45, không có generation mới, hoàn tất gói1ảnh. Unit test xác nhận không thể loại task unresolved và sửa ZIP limit không sinh thêm attempt. Thời gian: phiên generation sau restart7.16phút, processing đầu2.26phút, QA3.9giây, package cuối1.6giây. Đây là từng đoạn checkpoint, chưa phải benchmark tổng10ảnh liên tục hay500ảnh.

Evidence: `real-test-output/plr-09/review.html`, `report.json`, `studio.png`, `downloads/*.zip`, `fault-test/report.json`. Lệnh tái mở pilot `npm run test:plr-ten-live` có guard completed; `npm run test:plr-fault-ui` cho fixture riêng. Manager full suite và frontend/build được kiểm ở cuối giai đoạn. Bước sau nên chuẩn hóa tỷ lệ chủ thể cho clipart và chạy pilot20–50prompt trước khi thử500; chưa tuyên bố500ảnh đã vận hành ổn định.

## PLR-10 — 18/10/2026: cắt lề trong suốt cho bộ clipart

Thêm tùy chọn `trimTransparent` cho gói PLR thủ công và workflow một click. Chỉ cho preset đã tách nền; ảnh nền phong cảnh bị chặn rõ. Worker PIL xác minh hash nguồn, PNG RGBA và alpha bbox; tạo canvas vuông mới với 10% padding quanh chiều lớn hơn của chủ thể, copy pixel trực tiếp, không resample/upscale. Master nguồn giữ nguyên. ZIP/manifest/README ghi rõ layout `alpha-square-trim-v1`, kích thước nguồn và đầu ra, `pixelResampled:false`. Key gói native cũ được giữ để export native idempotent; gói trim có key riêng. Thêm retry có giới hạn cho Windows/OneDrive tạm khóa rename folder khi publish.

Pilot dùng lại đúng10master Image Dream từ PLR-09, không generation mới và số attempt/source hash không đổi. Trước: chủ thể phủ khoảng39–67% theo cạnh dài canvas; sau:83.3% cho cả10ảnh. PNG đầu ra có cạnh962–1634px tùy chủ thể; không upscale. Đối chiếu độc lập vùng pixel RGBA của từng chủ thể trước/sau cho cả10ảnh đều bằng nhau. Hai ZIP mới có CRC/hash đủ10ảnh, UI chọn cắt lề và xuất lại idempotent đạt, không lỗi trang. Contact sheet đã xem; tỷ lệ trông đều hơn nhưng vẫn cần duyệt chất lượng từng hình. Xem `real-test-output/plr-10/review.html`, `downloads/*.zip`, `report.json`, `ui-report.json`.

Test mới kiểm preservation pixel và chặn trim cho background art. Bước sau: đo vận hành20–50prompt thật với budget riêng, theo dõi tốc độ, lỗi và khả năng khôi phục, sau đó mới thử500prompt. Không suy diễn từ10ảnh thành cam kết500ảnh ổn định.


## PLR-11 — 18/10/2026: 15 prompt thật Autumn Harvest

Đã chạy installed Image Dream với 15 prompt mới, cap225, mỗi prompt1attempt. 15 nguồn →15master RGBA →15QA đề xuất →1ZIP19.96MB có cắt lề. Generation16.31phút, processing3.66phút, QA6.9giây, packaging7.2giây. Tổng khoảng20.2phút. CRC/SHA độc lập đủ15ảnh. Không có lỗi provider/processing, không trùng/gầntrùng. Số credits API tài khoản vẫn hiển thị235 trước/sau; chỉ xác nhận reservation225, chưa xác nhận wallet delta. Evidence real-test-output/plr-11/review.html và report.json. Chưa suy diễn thành benchmark500ảnh.

## PLR-12 — 18/10/2026: màn hình vận hành

ManagerRunPanel chia3mục Chạy tự động / Duyệt & xuất gói / Công cụ nâng cao; giữ component khi ẩn để checkbox chưa lưu không bị mất. Tự kết nối backend và khôi phục collection mở gần nhất bằng localStorage; ID cũ không tồn tại được bỏ. Thêm tìm collection theo tên và sửa nội dung giới thiệu đã lỗi thời. Không tự khởi chạy workflow khi mở lại trang. Công cụ thủ công nằm trong mục nâng cao, luồng một click nằm ở mục chính.

UI test qua Edge và backend thật trên store15ảnh: reload khôi phục run, đổi mục giữ checkbox, tìm bộ ảnh và tải ZIP200 đều đạt; không POST mutation/generation. Desktop/mobile screenshot đã xem, sửa tương phản nút. Build đạt. Evidence real-test-output/plr-12/review.html, ui-report.json, desktop.png và mobile.png. Lệnh npm run test:plr-workspace-ui. Bước sau PLR-13 hoàn thiện gói giới thiệu và dữ liệu đăng bán.

## PLR-13 — 18/10/2026: bộ asset trang đăng bán

## Kiểm thử cuối — 18/10/2026

Đã chạy prompt mới qua installed Image Dream, 1 nguồn 2048² / 1 master / 1 ZIP / listing tạo bằng UI. Reservation15, 1attempt. Generation78.3giây, processing25.6giây, QA0.6giây, package1.1giây. Restart controller và resume completed không tăngattempt. Desktop/mobile UI, reload listing, downloads/hash, CRC/SHA đạt. Backend46/46 và frontend9/9, build/workspace UI đạt. Sửa listing suy ra format/alpha từ manifest, kiểm hash package và file listing; test JPG native và tamper rejection đạt. Evidence real-test-output/plr-final/review.html, report.json, PLR_FINAL_HANDOVER.md. Chưa gen thật500prompt; test500 là fixture.

Mỗi ZIP collection có thể tạo bộ thông tin độc lập, idempotent theo package key và tiêu đề: `listing-cover.jpg`, `listing.md`, `listing.json`. Nội dung chỉ lấy số ảnh, định dạng, nền trong suốt, layout và tên ZIP từ manifest/package đã có; không đưa prompt, đường dẫn máy hay thông tin tài khoản vào output. Cover tạo từ contact sheet đã đóng gói, có nền blur, tiêu đề và số PNG. Mô tả Markdown liệt kê đúng file người mua nhận; JSON chứa title, mô tả ngắn, tags suy ra cục bộ và inventory để giao diện/automation dùng lại. Cả UI và output nhắc người vận hành duyệt ảnh, giá, giấy phép và chính sách trước khi đăng; không tự gắn nhãn marketplace-ready.

Đã chạy endpoint mới trên store PLR-11 thật, không tạo ảnh/không tiêu credit: Autumn Harvest 15 Clipart → cover 1600×1200, description 696 bytes, JSON 884 bytes, 5 tags. GET cả ba artifact trả 200; test kiểm không có prompt riêng trong Markdown. Xem `real-test-output/plr-13/listing-cover.jpg`, `listing.md`, `listing.json`, `report.json`. Build MakeWallpaper và 4 regression package test đều đạt. Backend service đang chạy từ phiên cũ cần restart một lần để giao diện localhost nhận endpoint listing mới.
