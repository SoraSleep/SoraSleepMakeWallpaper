# Preset 02 — kế hoạch thực thi chi tiết

Ngày lập: 17/10/2026.

## 0. Mục tiêu đã chốt

Người dùng có file TXT/CSV khoảng 500 prompt. Ứng dụng đọc danh sách, chạy qua Image Dream xoay tài khoản hiện có, tải ảnh đúng task, xử lý theo loại sản phẩm, kiểm chất lượng và đóng gói sẵn.

Không xây lại hệ thống tài khoản/generation Image Dream. Không thêm API gen trả phí. Không dùng commercial-rights review làm gate của luồng kỹ thuật PLR; phần quyền thương mại do người dùng quản lý. Tài liệu giấy phép người mua, nếu người dùng cung cấp, chỉ là một file đầu vào để đóng gói.

Định nghĩa hoàn thành: người dùng chỉ thay file prompt và chọn preset đã lưu, xem dự toán rồi chạy. Hệ thống tự làm các bước bình thường; ảnh lỗi hoặc trường hợp không chắc xuất hiện trong hàng chờ cần xem lại. Không hứa mọi prompt tạo ảnh tốt hoặc không bao giờ cần sửa tay.

## 1. Cái đã có, không làm lại

- MakeWallpaper: TXT/CSV import, giữ thứ tự và nội dung, duplicate warning/skip tùy chọn, pagination 50, lưu browser và JSON processing recipe, loại background/clipart.
- Manager: supervisor/IPC, adapter installed Profile Studio, preflight/quote, dispatch token/remote task identity, queue/resume nền tảng, final-asset selection, metadata, dHash/contact sheet, ZIP streaming/checksums.
- Image Dream: tài khoản/phiên đăng nhập/credits, cơ chế điều phối tài khoản hiện có, generation và gallery/derivatives.

Giới hạn đã tái hiện: queue 100 prompt, collection 30 KB, shortlist 100 master, planner tự thêm câu vào prompt. Chưa có backend PLR parent collection hoặc engine tách nền được nối trong luồng này. Chia 5 batch đơn thuần chưa giải quyết tất cả.

## 2. Kiến trúc được chọn

Manager là chủ sở hữu duy nhất của PLR run và trạng thái. PLR Studio gửi lệnh/đọc tiến độ; Image Dream adapter nhận generation; processing worker local xử lý ảnh; packer nhận danh sách output cuối.

Không ép PLR vào schema renderer wallpaper A/B. Tạo controller PLR riêng, dùng lại adapter Image Dream và các hàm pack/ZIP.

Studio riêng kết nối Manager bằng API loopback hẹp, bind 127.0.0.1 với port cấu hình và kiểm origin/session. Manager UI dùng IPC gọi cùng controller. Không tạo hai execution engines. Vite dev proxy /plr-api/ tới Manager; cấu hình production có base URL riêng được kiểm.

Tạm chọn store phù hợp stack hiện có: parent manifest nhỏ + từng item/attempt record trong data folder Manager, atomic write/rename và bounded retry cho lock. Không nhúng toàn 500 prompt+base 64 ảnh vào một JSON checkpoint. Dữ liệu lớn, ảnh và staging lưu trên data folder cục bộ đã cấu hình, ưu tiên ngoài OneDrive. Có export backup. Chỉ cân nhắc SQLite khi đã có nhu cầu truy vấn/concurrency đo được.

## 3. Hợp đồng dữ liệu

### Collection/run
- collectionId, runId, schemaVersion, revision, title, source filename/hash, createdAt/updatedAt.
- presetId/version và snapshot đầy đủ tại lúc start.
- totalRows, selectedRows, attempts, candidates, approvedFiles, rejectedFiles, failedRows, packagedFiles.
- status, pauseReason/error, credit ledger, outputRoot, latest package snapshot.

### Prompt item
- rowId riêng theo run, original ordinal, userId tùy chọn, group/title tùy chọn.
- rawPrompt + hash, submittedPrompt + hash, promptPolicy mặc định verbatim.
- product/background overrides nếu có, stage, attempts và selected artifact.
- Repeated prompt vẫn có rowId khác; hash prompt không được dùng làm job identity duy nhất.

### Attempt/artifact
- attemptId, dispatch checkpoint, Image Dream batch/task/remote ID.
- generation config, quote/reserved/observed credits, thời gian từng stage, error/recovery.
- source asset ID/path/hash/size/native dimensions.
- derived asset ID, source hash, processing recipe hash, native dimensions/format/alpha, QA.

### Preset sản xuất lưu một lần
- Tên sản phẩm; background-art hoặc transparent-clipart.
- Model/resolution/aspect/imageCount thật từ capability Image Dream.
- Min native pixel size, output format/color profile, processing/crop/padding.
- Credit cap/run, max regeneration attempts, duplicate policy.
- Delivery/max ZIP bytes, file naming, group folders, seller document paths.
- Không thay prompt ngầm, không upscale ngầm, không tự thêm tài liệu người dùng chưa cung cấp.

## 4. PLR-00 — Chốt schema và tách dữ liệu runtime

Task:
1. Thêm schema/validator collection, item, attempt, preset và package snapshot.
2. Phân biệt danh sách gốc, danh sách được chọn và output; không ghi đè danh sách khi skip duplicate.
3. Migrate import JSON hiện tại sang trạng thái draft backend; giữ local draft cũ đến khi đã nhập thành công.
4. Áp giới hạn cả bytes/rows, không chỉ max 100. Các child groups <=100 là đơn vị điều phối, không phải 500 request cùng lúc.
5. Tách technicalReady khỏi nội dung tài liệu license do người dùng quản lý.

Đầu ra: schema có version, fixture 500 prompt, migration và API contract.
Test: CSV Unicode/multiline, cùngprompt khácrow, cùngfile resume/newrun, unsupportedversion, prompt 8000 ký tự, tổng dữ liệu vượt 30 KB.
Xong khi: import và reopen 500 rows giữ đúng thứ tự/hash/settings, chưa gọi generation.
Phụ thuộc: không.

## 5. PLR-01 — Parent store và cơ chế phục hồi

Task:
1. Parent index + item/attempt records, atomic checkpoint, retry lock và error có mã.
2. Stable identity trước/sau dispatch; source file/config hash gắn run.
3. Single-writer run lock, lease/heartbeat và xử lý restart.
4. Reimport nhận diện file cũ nhưng chỉ resume khi config/run đúng; tạo run mới là thao tác riêng.
5. Backup/export manifest; kiểm free disk; không xóa originals để giải phóng tự động.

Đầu ra: create/read/list/update collection, store transaction boundaries và recovery scanner.
Test: kill process ở mỗi checkpoint, locked file, disk full fixture, malformed record, double-start.
Xong khi: restart không mất item hoặc nhân đôi attempt và không bị kẹt lock vĩnh viễn.
Phụ thuộc: PLR-00.

## 6. PLR-02 — API/IPC nối PLR Studio với Manager

Task:
1. Capability endpoint trả đúng app/version/provider và trạng thái kết nối.
2. Import/preview/get/list/settings endpoints; requestKey idempotent.
3. Preflight/start/pause/resume/reconcile endpoints gọi cùng controller của IPC.
4. Poll trạng thái tăng khoảng chờ khi không đổi; progress/error nhỏ, không truyền ảnhbase 64 trong mỗiresponse.
5. Studio hiện trạng thái backend offline, staleconfig hoặc run đang bận và không làm mất danh sách.
6. Giữ local draft làm bản nháp, chuyển trạng thái execution sang backend sau import thành công.

Đầu ra: nhậpfile từ Studio tạo collection thực trong Manager và đọc lại.
Test: origin không hợp lệ, reconnect, request lặp, refreshtrang, hai tab, API/IPC cùngrun.
Xong khi: bấmstart chỉ tạo đúng một run, state Manager và Studio khớp.
Phụ thuộc: PLR-01.

## 7. PLR-03 — Preflight và preset sản xuất

Task:
1. Đọc model/size/aspect/credits/available profile từ đúng Image Dream app; không đoán từ tênmodel.
2. Chọn và lưu preset đầy đủ. Propagate các tỷ lệ được support qua mọi tầng; không cho UI chọn tỷ lệ backend từ chối.
3. Kiểm recipe trước khi gửi: clipart cầnengine sẵn sàng; background không cầnsegmentation.
4. Dự toán bằng quote thật, hiển thị selectedrows/imageCount/credit cap. Ghi version/config snapshot.
5. Ledger tách quoted/reserved/observed/released. Request đã gửi chưa rõ kết quả vẫn giữ reservation.
6. Thay config/prompt selection làm stale preflight. Không yêu cầu quote mọi 500 ảnh nếu provider xác minh được quote dùng chung; kiểm lại theo quy tắc phù hợp.

Đầu ra: preset dùng lại, báo giá và readiness có lý do rõ.
Test: model không còn hỗ trợ, đổi aspect, quote hết hạn, không đủcredit, app đóng, segmentation chưa có.
Xong khi: cùngpreset chạy lại chỉ cần nhậpfile và xemdựtoán; không hỏi lại thiết lập cố định.
Phụ thuộc: PLR-02; clipart cần PLR-05 capability.

## 8. PLR-04 — Dispatcher qua Image Dream hiện có

Task:
1. Tái sử dụng installed Profile Studio client; PLR gửi verbatim prompt, không đi qua planner thêm câu.
2. Tái sử dụng cơ chế tài khoản của app. Manager không xây thêm một bộ xoay tài khoản song song.
3. Mặc định một generation đang dispatch; giữ độc quyền điều phối để không chồngqueue khác của người dùng.
4. Lưu checkpoint trướcstart, sau đó task ID/remote ID ngay khi có.
5. Poll đúng task, tải đúngartifact; kiểm bytes/hash/native decode; không chọn gallery file mới nhất.
6. Timeout sau submit → uncertain/reconcile. Retrydownload không gen lại. Nếu app đang cóqueue khác, đợi hoặc báo bận.
7. Pause chỉ ngừng gửi mới; resume đi từstage cuối. Cancel không xóa gallery hoặc đóng ứng dụng tùy tiện.
8. Thiết lập số attempt bổ sung tối đa và creditcap. Không tự tăngngân sách.
9. Đo overhead preflight/archive từng prompt; chỉ chuyển micro-batch nếu đã xác minh task correlation và khả năng phục hồi.

Đầu ra: collection 500 item được controller xử lý qua adapter hiện có.
Test fake: 500 jobs, duplicateprompts, 20 download failures, restart, submit response timeout, budget exhausted, session expired.
Test thật: 2–3 prompt mới qua app Image Dream với cấu hình đã preflight.
Xong khi: jobđã sent không gửi lại khi resume; file đúng task, budget không vượtcap được xác định.
Phụ thuộc: PLR-03.

## 9. PLR-05 — Worker xử lý ảnh và tách nền

Task:
1. Worker riêng, runtime/model version cố định, kiểmdependencies và warmup.
2. Benchmark BiRefNet/U 2 Net trên 30 ảnh đại diện trước chọn default chất lượng/tốc độ. Không coi modelbenchmark của nhàpháttriển là tốcđộ máyngười dùng.
3. Session tái sử dụng; concurrency 1; đoRAM/VRAM, timeout, cancellation.
4. background-art: giữ nguồn, encode derivative nếuformat yêu cầu. transparent-clipart: segmentation → alpha → edge/refinement → PNG RGBA.
5. Giữ native canvas, tùy chọn trim/padding cópreview. Không xóa component nhỏ vôđiều kiện vì có thể là lá/cánhhoa.
6. Bất biến source, derivative có source hash/recipe hash. Processing fail → retry stage, không generation.
7. Tạo thumbnail/checkerboard/white/black preview cho QC, output khônglẫnpreview.
8. Không upscale mặc định; nếu cần thêm bước explicit có provenance và QA riêng.

Đầu ra: master/derivative đúng format, capability worker và benchmarkreport.
Test: hoa trắng, cành mảnh, watercolor, chủ thể tối, nhiều đối tượng rời, chi tiết mềm; ảnh alpha cósẵn, file hỏng, outofmemory.
Xong khi: alpha thực, native canvas đúng, lỗi rõ và người duyệt thấy được viền trên nền đối lập.
Phụ thuộc: làm song song về lịch với PLR-02/03 nếu có nguồn ảnh test; nối controller sauPLR-04.

## 10. PLR-06 — QA và chỉ duyệt ngoại lệ

Task:
1. Hardchecks: missing/decode/format/size/hash/exactduplicate/alpharỗng khi yêu cầutransparent.
2. Warnings: dHash và similarity, blur, bboxchạmbiên, matte/halo bất thường.
3. Recipe-specific checks: không dùng ngưỡng stockmarketplace làm tiêu chuẩn mọiPLR; pixel/tỷ lệ theo mụcđích.
4. Reviewqueue có lọc, contact sheet phân trang, native zoom và so ảnh trước/sau.
5. Giữ/loại/xử lý lại/gen lại theo ảnh hoặc nhóm; gen lại làattempt mới cócost.
6. Bulkapprove các ảnh cùngpreset đãduyệt khi điều kiện đủ; chỉ ngoại lệ cần xemlại.
7. Đổi master/config/recipe làm stale phầnreview liênquan.

Đầu ra: technical_pass/needs_review/approved/rejected và reasons từng ảnh.
Test: exactduplicate khác filename, cùngconceptkhácảnh, cành nhỏkhông bị xóa nhầm, falsepositives, đổi source hash.
Xong khi: biết chínhxác bao nhiêuảnh đạt; preview đẹp không che giấu file lỗi hoặc alpha sai.
Phụ thuộc: PLR-04/05.

## 11. PLR-07 — Gom cảbộ và đóng gói tự động

Task:
1. Aggregate selectedmasters qua mọi childbatch vào parentpack snapshot.
2. Bỏ giới hạnshortlist 100 bằng paging/segmentedreview và parentselection, không nạp tất cảbitmaps vàoRAM.
3. File naming ổn định từordinal/group/shortID; tên tránhkýtựlỗi, dài, trùng, pathtraversal.
4. Buyerpack: Images hoặc PNG_Transparent, groups tùy chọn, README, tài liệu người dùng cung cấp, contact sheets và manifest.
5. Sellerarchive riêng: prompts/config/task IDs/credits/QA; không đưa vào buyer pack mặc định.
6. Reuse ZIP streaming C 3. ZIP độc lập theo max bytes, kiểm overhead, CRC/checksum/source hash.
7. Ghi staging và publish atomically. Packagefail chỉ chạy lạiđónggói.
8. Gói chưa đủảnh báo số thực, không tựghi 500. Khi chọn autofill chỉ bù trong ngân sách đã đặt.
9. Xuất nhiều phần khi cần; giữquality, không recompress để épgiới hạn mà không thông báo.

Đầu ra: productfolder/ZIPparts, deliverymanifest và report tổng.
Test: 500 mastersfixture, file lớn/Unicodefilename, disk full/locked ZIP/source changed, CRC/unzip/decodeall, partlimits.
Xong khi: mở gói bằng côngcụ độc lập và đối chiếu đủfile/hash; ảnh giao đúng số và đúng format.
Phụ thuộc: PLR-06.

## 12. PLR-08 — Listing kit và giao diện hoàn chỉnh

Task:
1. Listingtitle/description từoutput thật: số ảnh, pixelrange, format, alpha và grouping.
2. Cover/contactsheet/samplegrid từmasters đãduyệt; preview bán hàng không thay ảnh giao.
3. Listing assets và buyerpayload tách thư mục. Có hướng dẫn sử dụng/tải, tài liệu người dùng đặt trong preset.
4. Nút mở output/copy description/tải manifest, biết ZIP nào cần giao.
5. Dashboard chỉcó nhậpfile, preset, preflight, run/pause/resume, reviewngoại lệ và output.
6. Hiện progress riêng: generated/downloaded/processed/approved/packed. Không dùng mộtprogressbar nói hoàn thành khi mớigen.
7. ETA từjob thực, hiểnthị credits ước tính/đã quan sát và diskđang dùng.

Đầu ra: listing kit + giao diện luồngcơbản không bắt cấu hình lặp.
Test: mô tả khớp 482 ảnhthực thayvì 500, mixedsizes, PNGkhôngalpha, missingzip, responsiveUI vàreconnect.
Xong khi: người dùng nhận gói và thông tin đăng bán khớp file thực.
Phụ thuộc: PLR-07.

## 13. PLR-09 — Test chấp nhận toàn chuỗi

Các vòng tăng dần:
1. Schema/store tests, không provider.
2. 500 fake jobs/fake provider đểtestresume và tài nguyên. Không gọiđây là 500 lượtgenảnh thật.
3. Worker benchmark 30 ảnhcó sẵn, đo viền/timing/memory.
4. Pilot thật 3 background +3 clipart qua Image Dream, xử lý thật và gói thật.
5. Batchthật 20 prompt gồmbackground/clipart trongrunriêng, kiểm toàn bộ output.
6. Batch 50 để soak vàđo khả năng giải quyết lỗi.
7. Batch 500 theo ngân sách/cấu hình đã chốt, theo dõi đến khi gói xong hoặc blockers cụ thể.

Fault injection: crash sau dispatch, mạng đứt lúc download, hết credit, app restart, worker crash, disk full, mất model, file đổi hash, lock OneDrive, ZIP write fail. Resume đúng stage và không gen lại jobđã xong.

Báo cáocuối: source prompt/config → job/attempt → source hash → derivative/QA → selectedmaster → packageentry. Ghi số ảnh đạt, lỗi, thời gian từng stage, credit observed và dung lượng.

Xong khi:
- Không có duplicate remote submit do resume trong các ca test.
- Không bỏ hoặc tráo prompt/artifact.
- Các output được kê khai đều decode được, đúng format/size và hash.
- Clipartđạt review viền/alpha; background giữ nền.
- ZIP unzip/CRC/checksum đúng, số ảnh thật khớp listing.
- Lỗi có thể phục hồi đúng stage hoặc cólý do blocked rõ ràng.

## 14. Lịch trình dự kiến và điểm dừng kiểm tra

Ước lượng ngày làm việc tập trung, không cam kết theo thời gian gen hoặc đủfree credits:

| Chặng | Nội dung | Ước lượng | Mốc kiểm tra |
|---|---|---|---|
| A | PLR-00/01 | 2 ngày | Collection 500 rows bềnvững |
| B | PLR-02/03 | 2 ngày | Studio↔Manager +preset/quote |
| C | PLR-04 | 2–3 ngày | Resume 500 fake jobs +pilotgeneration |
| D | PLR-05/06 | 3–4 ngày | Worker/QC trênảnh thật |
| E | PLR-07/08 | 2–3 ngày | Bộ 500 fixture +listing kit |
| F | PLR-09 | 2–3 ngày kỹ thuật +thời gian gen | Realend-to-end vàsoak |

Khoảng 13–17 ngày làm việc kỹ thuật nếu dependencies thuậnlợi. Sau chặngC đo lại ước lượng. Mỗi chặng kết thúc bằng build/test/evidence, không chỉ ảnh chụp UI. Không chạy 500 thật đểdebug trước khi các vòng nhỏ đạt.

## 15. Bước thực hiện ngay tiếp theo

PLR-00 và PLR-01 trước: schema sản xuất đầy đủ +parent store. Đây là nềncho run 500, verbatim prompts và resume. Sauđó mới nối nút start quaManager. Chưa thêm model mới hoặc hiệuứng, chưa làmauto-upload.

Kế hoạch này thay các phần yêu cầu tự sáng tác 500 prompt hoặc bắt buộc duyệt quyền thương mại trong các kế hoạch cũ. Quyềnthươngmại do người dùng quản lý; chất lượng và khả nănghoạtđộng là tiêu chí triểnkhai.
