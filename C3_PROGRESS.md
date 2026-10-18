# C3 — stock, bản ảnh cuối và gói bán

Ngày cập nhật: 16/10/2026.

## C3.1 đã hoàn thành trong source Manager

- Collection gallery có bước “Chọn bản ảnh đầu ra”. Không thay thế danh sách file gốc của generation task.
- Chỉ liệt kê bản gốc có asset ID trùng đúng task và các derivative có sourceAssetId dẫn về nó, gồm chuỗi chỉnh nhiều lần. Bản không liên quan bị loại.
- Original đã thay hash hoặc không còn trong gallery bị chặn. Không chọn file mới nhất một cách suy đoán.
- Lấy watermarkStatus từ gallery nhưng không tự quy đổi user-reviewed-visible-region thành sạch toàn ảnh.
- Chọn asset mới reset các xác nhận của người dùng. Watermark mặc định unknown, chất lượng/quyền/AI/sRGB mặc định chưa duyệt.
- Khi lưu: tải bytes từ provider loopback, kiểm tra SHA-256, lưu master snapshot theo hash, ffprobe xác minh kích thước/codec và ffmpeg giải mã frame ảnh. Lỗi decode hoặc MIME/codec không phù hợp bị chặn.
- Lưu audit riêng gắn file, hash, nguồn, kích thước, profile và các xác nhận của người dùng. File ảnh gốc Image Dream không bị thay đổi.
- Profile wallpaper/art pack: kích thước cạnh ngắn >=720 và các bước duyệt tương ứng.
- Profile Adobe Stock minh họa: kiểm tra 4–100 MP, JPEG, dung lượng và sRGB được người dùng kiểm tra; các điều kiện nền tảng phải rà lại trước phát hành.
- “Đủ bước để duyệt theo kênh” không phải giấy phép thương mại hoặc bảo đảm được nền tảng chấp nhận; commercialReady luôn false ở bước này.
- Nút mở Landscape Studio dùng đúng asset ID đã chọn. Link yêu cầu file tương ứng còn tồn tại trong Image Dream; nếu đã thay/xóa thì từ chối thay vì lấy nhầm ảnh khác. Snapshot local vẫn được giữ cho bước đóng gói tiếp theo.

## Kiểm tra

- Manager full test suite: 155/155 đạt.
- TypeScript/build đạt; sau chỉnh UI cuối đã build lại.
- Test thật với installed Image Dream trên port 17897: hash bytes, native decode, kích thước 1440×2560, 3.6864 MP, stock resolution blocker và watermark-present blocker đạt. Queue và snapshot test đặt trong thư mục tạm, không sửa task hoặc gallery thật.
- Test quan hệ derivative, invalid hash và mutation: đạt qua fixture unit tests.
- UI dùng derivative fixture (không phải ảnh vừa xử lý watermark thật): đổi candidate reset review, không auto sạch từ metadata vùng, native decode, lưu/reopen lựa chọn và mở đúng hash đều đạt.
- Collection UI C1 kiểm tra lại đạt.
- Không gen mới, không xóa watermark, không dùng credits.

## Bằng chứng

- real-test-output/c3/real-final-asset-check.json
- real-test-output/c3/ui-report.json
- real-test-output/c3/final-asset-ui.png
- Backup source: D:/SoraSleep Main/Data/Manager/DevelopmentBackups/C3-1-20261016

## C3 còn lại

C3.2: đã hoàn thành phần metadata chung và xuất master; chi tiết bên dưới. CSV và metadata đặc thù từng kênh thực hiện ở C3.4.

C3.3: đã hoàn thành cảnh báo trùng / gần trùng, chọn bộ master cuối và contact sheet để duyệt; xem chi tiết bên dưới.

C3.4: đã hoàn thành xuất thư mục art pack / Adobe JPEG+CSV, manifest/checksum và điều khoản; chi tiết bên dưới.

C3.5: đã hoàn thành ZIP theo luồng và chia gói; chi tiết bên dưới.

Chưa cài đè bản production; chưa tuyên bố toàn bộ C3 hoặc luồng bán hàng hoàn tất.


## C3.2 — metadata và xuất đúng master (đã hoàn thành trong source)

- Thêm Metadata editor ngay dưới bản ảnh đầu ra: tiêu đề, mô tả, từ khóa theo thứ tự ưu tiên, chủ đề/danh mục, khai báo AI và xác nhận duyệt metadata.
- Metadata gắn với itemId + SHA-256 ảnh. Revision được lưu riêng, không ghi đè lịch sử; xung đột revision bị từ chối. Ảnh khác không kế thừa metadata của master cũ.
- Chỉnh nội dung bỏ xác nhận metadata; nội dung chưa lưu khóa nút xuất. Mở lại đọc đúng revision đã lưu.
- Giới hạn nội dung, lọc từ khóa trùng và giữ thứ tự; tối đa 49 là giới hạn tương thích bảo thủ của ứng dụng, không phải tuyên bố giới hạn mọi nền tảng.
- Xuất vào thư mục Exports riêng gồm master native và metadata.json: hash, kích thước, revision, QA, các mục còn thiếu. Không tải lại từ provider, phóng lớn hay recompress.
- Đường dẫn master phải nằm trực tiếp trong kho snapshot sau khi giải realpath; đọc lại bytes và so SHA-256 trước khi xuất. File thay đổi hoặc trỏ ra ngoài bị từ chối.
- Xuất bản nháp giữ rõ blockers. Xuất để duyệt kênh bị chặn nếu còn thiếu QA, xác nhận metadata hoặc khai báo AI. Cả hai đều commercialReady=false.
- IPC Manager nối read/save/export; bấm xuất mở Explorer tới manifest đã xuất. Chưa cài đè ứng dụng production.

### Kiểm tra C3.2

- Manager: 160/160 tests đạt, gồm 5 test mới về revision, binding, byte-exact export, QA blockers, mutation/path và validation metadata.
- TypeScript và production build đạt.
- Edge headless UI thực thi lưu metadata, loại từ khóa trùng, mở lại, khóa xuất khi sửa chưa lưu, chặn review-ready khi QA thiếu và xuất draft giữ nguyên bytes.
- Dùng bytes ảnh B đã tạo thật trước đó; tên/quan hệ derivative trong UI là fixture, không phải một lần xử lý watermark mới. Native ffprobe/ffmpeg thực thi thật. Không chỉnh gallery/task production.
- Bằng chứng: real-test-output/c3/metadata/metadata-report.json và metadata-ui.png; report chứa đường dẫn master + manifest output cụ thể. Nguồn test và snapshot là thư mục tạm.
- Không gen mới, không dùng credits. Test này chưa chứng minh app đã được deploy hoặc sản phẩm được phép bán.

### Ranh giới với C3.4

metadata.json là metadata chung, chưa phải CSV upload marketplace. Adobe CSV cần header/filename/category theo schema của họ; khai báo AI còn phải thực hiện trong portal. Tham khảo chính thức: https://helpx.adobe.com/stock/contributor/manage-your-portfolio/csv-requirements-content.html . Không thêm cột AI tự nghĩ vào CSV chuẩn. Các giới hạn và danh mục của kênh sẽ được xác minh lại khi triển khai C3.4.

Bước tiếp theo: C3.3 — phát hiện ảnh gần trùng, shortlist và contact sheet để kiểm duyệt cả bộ trước khi đóng gói.


## C3.3 — chọn bộ master cuối và contact sheet (đã hoàn thành trong source)

- Trong Manager → Collection studio, thêm khu vực “Duyệt bộ master cuối”. Chỉ lấy selectedFinalAsset của các lượt tạo thuộc đúng collection, gồm các revision; không suy đoán từ file mới nhất và không thay shortlist ảnh nguồn C1.
- Quét tối đa 100 master mỗi lượt. Đọc và kiểm tra SHA-256 của snapshot kể cả khi thumbnail đã cache. Preview xử lý tuần tự bằng ffmpeg, thu nhỏ tối đa 240 px, cache giới hạn 100 hash; không gửi full ảnh native vào renderer.
- SHA-256 giống nhau: trùng nguyên file. dHash 9×8 mức xám, Hamming ≤6/64 và tỷ lệ khung sai lệch ≤2%: cảnh báo có thể gần trùng. Chỉ cảnh báo, không tự loại hoặc tự chọn ảnh.
- Không có lựa chọn mặc định ở lượt quét đầu; có chọn tất cả / bỏ chọn / chọn từng ảnh. Mỗi card có preview, title từ metadata nếu có, hash rút gọn và số mục QA còn thiếu.
- Lưu shortlist dạng revision riêng; gắn itemId, batchId, SHA-256 và fingerprint bộ master. Revision xung đột bị chặn. Đổi master hoặc thêm/bớt master yêu cầu quét và lưu lại trước khi xuất.
- Khi quét lại sau đổi master, chỉ khôi phục những lựa chọn vẫn trùng cả itemId lẫn hash. Không tự chuyển lựa chọn cũ sang bản khác.
- Xuất contact-sheet.html tự chứa thumbnail, không cần mạng hoặc JavaScript; có bố cục in, tên ảnh, kích thước, full hash và QA còn thiếu. shortlist.json lưu bộ đã chọn, revision và toàn bộ cảnh báo. Escape nội dung title và chặn script bằng CSP.
- Contact sheet là bản duyệt, không phải listing thương mại hoặc gói bán. Không sửa master; commercialReady=false. Các ảnh trong bằng chứng còn QA/watermark blockers đã được ghi rõ.
- IPC read/save/export được nối vào preload và UI. Xuất mở Explorer đến file kết quả. Bản source/dist đã cập nhật; chưa cài đè ứng dụng production.

### Kiểm tra C3.3

- 165/165 tests Manager đạt (thêm 5 tests mới): dHash/Hamming/ngưỡng/tỷ lệ khung, cache vẫn verify master, revision/foreign selection/stale fingerprint, escape/offline manifest và shortlist rỗng.
- TypeScript và production build đạt.
- Test Edge dùng bytes JPEG A/B đã gen thật trước đó, native ffprobe/ffmpeg thật và queue tạm có thêm bản sao A có chủ đích. Không thay đổi task/gallery/queue production, không gen mới hoặc dùng credits.
- UI kiểm tra: phát hiện bản sao A, không tự chọn, chọn A/B rồi lưu và export 2 ảnh, sửa chưa lưu khóa export, reload khôi phục đúng shortlist, đổi master khiến export cũ bị chặn và bỏ lựa chọn stale khi quét lại.
- Mở HTML export trong browser context offline và tắt JavaScript: đủ 2 ảnh decode thành công, không có lỗi trang.
- Bằng chứng: real-test-output/c3/shortlist/report.json, shortlist-ui.png, contact-sheet.html, contact-sheet.png và shortlist.json.
- Script tái kiểm tra: node scripts/c3-shortlist-ui.mjs trong workspace Make Wallpaper. Backup source trước thay đổi: D:/SoraSleep Main/Data/Manager/DevelopmentBackups/C3-3-20261016.

### Giới hạn đã biết

DHash là heuristic bố cục, không phải semantic similarity hay tiêu chí chấp nhận của stock. Cặp A/B thật có thay đổi cành hoa lớn không bị đánh dấu gần trùng ở ngưỡng hiện tại; bộ test chỉ khẳng định exact duplicate của A và ngưỡng gần trùng trên fixture kiểm soát. Thay đổi màu, crop, xoay hoặc bố cục có thể bị bỏ sót; phải duyệt contact sheet. Quét hơn 100 master báo lỗi rõ ràng, chưa tự chia trang. Tối ưu collection lớn và streaming ở C3.5.

Bước tiếp theo: C3.4 — dùng shortlist này để đóng art pack / profile JPEG / CSV theo kênh, manifest/checksum và nội dung quyền; chỉ đưa ảnh đủ điều kiện vào nhóm để duyệt kênh.


## C3.4 — art pack / Adobe JPEG + CSV (đã hoàn thành trong source)

- Manager → Collection studio → Duyệt bộ master cuối: sau khi lưu shortlist, có khu vực “Đóng gói bộ đã chọn”.
- Hai profile: Art pack (wallpaper tĩnh, giữ định dạng native JPEG/PNG/WebP) và Adobe Stock JPEG minh họa + CSV. Bước này chỉ đóng ảnh tĩnh, không thay thế exporter runtime/video đã có trong MakeWallpaper.
- Hai chế độ: draft chứa ảnh chưa đạt trong review/; review-ready yêu cầu mọi ảnh đã chọn đạt profile. Không âm thầm bỏ ảnh hoặc tự chuyển định dạng/phóng lớn để đạt điều kiện.
- Kiểm tra QA lại theo profile đích bằng dữ liệu master + review; không dùng kết luận của profile wallpaper để tự duyệt stock. Metadata được lấy theo đúng item/hash và revision hiện tại.
- Preview token gắn shortlist, master, metadata revision, QA và cấu hình điều khoản. Nếu thay đổi sau preview thì yêu cầu kiểm tra lại; sửa cấu hình trên UI bỏ preview cũ.
- Art pack để duyệt yêu cầu tên người bán, điều khoản người dùng nhập và xác nhận đã kiểm tra quyền cấp. Không tự sinh quyền sở hữu hoặc cấp giấy phép thay người bán. Draft thiếu điều khoản có LICENSE ghi rõ chưa cấp quyền.
- Profile Adobe bảo thủ theo tài liệu chính thức kiểm tra ngày 16/10/2026: JPEG native, 4–100 MP, <=45,000,000 bytes trong profile đóng gói, sRGB do người dùng duyệt; title <=70 ký tự chữ/số/khoảng trắng (bảo thủ hơn nền tảng), keywords giữ thứ tự và giới hạn ứng dụng 49, Category để trống hoặc mã 1–21. Từ khóa mở đầu giống công thức bảng tính bị chặn trong CSV.
- CSV UTF-8, CRLF, exact header Filename,Title,Keywords,Category,Releases; tên ảnh ASCII ngắn, duy nhất theo index+hash và trùng file trong thư mục gói. Escape dấu nháy đúng CSV. Giới hạn CSV 1,000,000 bytes.
- Chỉ ảnh đạt profile vào CSV. Vì draft có thể còn QA nên metadata-review-only.csv có thể chỉ có header; UI hiển thị số ảnh đủ điều kiện. Không viết cột AI tự nghĩ. AI disclosure lưu trong manifest và nhắc thao tác portal; release documents chưa được đóng kèm, Releases trống và phải xử lý trong portal.
- Gói gồm images/ hoặc review/, README.txt, LICENSE.txt, manifest.json và checksums.sha256; profile stock có thêm CSV. Manifest gắn selection ID, item/batch/hash, metadata revision, review, shortlist revision/fingerprint và nguồn quy tắc. Checksum bao phủ tất cả payload, kể cả manifest, trừ chính file checksums.sha256.
- Mỗi ảnh được đọc từ snapshot đã xác minh SHA, copy nguyên bytes, đọc lại file đích và so hash. Ghi vào staging .part rồi đổi tên sau khi hoàn tất; lỗi xóa staging trong đúng thư mục export, không để lại gói đã công bố dở dang.
- commercialReady=false luôn được giữ; “để duyệt kênh” là đã qua các gate ứng dụng, không có nghĩa nền tảng chấp nhận hoặc tự cấp quyền bán. Không upload/publish.

### Kiểm tra C3.4

- Manager 172/172 tests đạt, thêm 7 tests mới: QA theo kênh, license/metadata/watermark blocker, nguyên bytes và mọi checksum, header/filename/escape CSV, title/category/formula guard, token stale, failure cleanup.
- TypeScript và production build đạt sau chỉnh UI cuối.
- Edge thực thi qua queue backend thật với snapshot từ ảnh A/B thật đã có. Queue test biệt lập, không sửa gallery/task production. Xuất art-pack-draft và stock-draft, xác minh hash từng ảnh và toàn bộ checksum.
- Hai ảnh thật 1440×2560 = 3.6864 MP, còn QA/watermark và chưa có metadata được duyệt: review-ready art/stock đều bị chặn. Draft stock CSV chỉ có header, không giả định ảnh đạt Adobe. Nhánh CSV đủ điều kiện kiểm tra bằng unit fixture, chưa upload thử Adobe thật.
- Chỉnh profile/mode buộc preview lại, UI hiển thị nguyên nhân bằng tiếng Việt. Bộ test C3.3 cũng đi qua selection restore, stale master và contact sheet offline trong cùng lần chạy.
- Bằng chứng: real-test-output/c3/pack/pack-report.json; art-pack-draft/manifest.json; stock-draft/metadata-review-only.csv; pack-ui.png. Script: node scripts/c3-pack-ui.mjs.
- Không gen mới, không dùng credits. Backup: D:/SoraSleep Main/Data/Manager/DevelopmentBackups/C3-4-20261016. Source và dist được cập nhật; chưa cài đè production.

### Nguồn quy tắc kênh

- https://helpx.adobe.com/stock/contributor/manage-your-portfolio/csv-requirements-content.html
- https://helpx.adobe.com/stock/contributor/submit-your-content/submit-illustrations/technical-legal-requirements-illustration-submission.html
- https://helpx.adobe.com/stock/contributor/content-policies-guidelines/metadata/choose-right-category-content.html

### Phần còn lại

C3.5: ZIP streaming, chia gói theo giới hạn kênh và xử lý collection lớn. Hiện C3.4 xuất thư mục hoàn chỉnh, không tuyên bố đã có ZIP tự chia hoặc gói motion desktop/mobile. Nếu nguồn không phải JPEG, profile stock yêu cầu chuẩn bị JPEG riêng và duyệt lại derivative, không recompress ngầm.


## C3.5 — ZIP theo luồng và chia gói (đã hoàn thành trong source)

- Trong khu vực đóng gói thêm lựa chọn: thư mục, ZIP tối đa 100 MB/phần, Etsy tối đa 5 ZIP × 20,000,000 bytes, và ZIP giới hạn tự chọn 1–1000 MB/phần. Giới hạn thập phân được ghi rõ. Etsy chỉ áp dụng art pack; không coi stock upload là listing Etsy.
- Quy tắc Etsy kiểm tra theo tài liệu chính thức ngày 16/10/2026: https://help.etsy.com/hc/en-in/articles/115015628347-How-to-Manage-Your-Digital-Listings . Quy tắc dung lượng không thay thế các chính sách nội dung, khai báo AI và điều kiện bán hàng.
- ZIP dùng phương thức STORE: ảnh JPEG/PNG/WebP vốn đã nén được giữ nguyên, không recompress hoặc giảm chất lượng. Đây là đóng archive, không bảo đảm giảm dung lượng.
- Đọc và ghi theo stream từng đoạn 64 KiB với backpressure. Không gom toàn bộ collection vào Buffer/base64 trước khi ghi ZIP; central directory chỉ giữ metadata nhỏ. Bước tạo snapshot/preview trước ZIP vẫn có giới hạn hiện tại 24 MB mỗi master, tối đa 100 master, không tuyên bố xử lý vô hạn.
- Tính kích thước chính xác gồm local headers, data descriptors, central directory và end record. Xếp ảnh lớn trước, mỗi phần có tài liệu chung lặp lại. Nếu một ảnh + tài liệu/overhead vượt giới hạn, metadata chung đã quá lớn, hoặc số phần vượt giới hạn, báo lỗi và không giảm chất lượng/cắt đôi ảnh.
- Mỗi ZIP là archive độc lập, tên wallpaper-NN-of-MM.zip. README giải thích manifest/checksums chung mô tả toàn bộ collection và cách giải nén giữ nguyên relative paths; không dùng định dạng chia volume .z01 cần ghép mới mở được.
- Kiểm tra checksum nguồn pack trước khi đóng ZIP, kiểm tra hash/size của từng entry khi stream, CRC32 chuẩn ZIP và SHA-256 của cả archive. Kiểm tra dung lượng output đúng kế hoạch sau ghi.
- Ghi toàn bộ các phần vào staging riêng rồi đổi tên khi xong. Lỗi xóa staging trong đúng thư mục tạo ra. Nguồn thư mục C3.4 hoàn chỉnh vẫn giữ lại nếu bước archive lỗi; không tạo ZIP kết quả dở dang.
- delivery.json lưu từng ZIP, dung lượng, hash, entry list/hash và giới hạn giao gói. File này là báo cáo seller ở ngoài ZIP; 5 slot Etsy chỉ tính 5 ZIP, không tự đề nghị upload cả báo cáo thứ sáu.
- Cấu hình giao gói nằm trong preview token; thay đổi lựa chọn/dung lượng yêu cầu kiểm tra lại. UI xuất ZIP dùng cùng gate QA/metadata/license của C3.4, không có đường vòng bỏ QA.
- Queue giữ busy lock cho đến khi archive hoàn tất; IPC trả path/hash, không truyền binary ZIP qua renderer. Đã cập nhật source/dist, chưa cài đè production.

### Kiểm tra C3.5

- Full Manager 178/178 tests đạt; TypeScript/build đạt. Sau bổ sung hướng dẫn ZIP trong README, chạy lại 13 tests pack/ZIP liên quan đều đạt.
- Thêm 6 tests: tính đủ overhead/chia phần/lặp tài liệu; ZIP stream giải mã bằng Python zipfile độc lập; CRC và nguyên bytes; source mutation/path invalid; giới hạn output và failure; source pack checksum mismatch; cấu hình delivery gắn token (6 test cases mới tổng cộng với case gom nhiều assertion).
- UI Edge thật qua queue backend với A/B JPEG có sẵn, không duyệt giả QA và không sửa queue production: giới hạn custom 1.5 MB tạo 2 ZIP; Python zipfile kiểm tra CRC và hash mọi entry, đúng hash A/B; custom 1 MB chặn ảnh B vượt giới hạn; Etsy tạo 1 ZIP dưới 20 MB. Đổi delivery/dung lượng bỏ preview cũ.
- Test tổng hợp 54,000,000 bytes (3 file giả lập 18 MB, không phải ảnh sản phẩm): 3 ZIP, mỗi ZIP 18,000,279 bytes, Python CRC đạt; thời gian đo khoảng 2.47 giây trên máy này. Peak RSS khoảng 94 MB, peak arrayBuffers khoảng 33 MB. Đây chỉ đo phase ZIP trên máy này, không phải cam kết RAM toàn ứng dụng hoặc test artwork 54 MB.
- Bằng chứng: real-test-output/c3/zip/zip-report.json; large-report.json; zip-ui.png; custom-1.5mb/; etsy-draft/. Script: node scripts/c3-zip-ui.mjs và node scripts/c3-zip-large.mjs.
- Không gen ảnh, không dùng credits, không upload marketplace. ZIP mẫu vẫn là draft vì ảnh A/B còn QA/watermark blockers.
- Backup: D:/SoraSleep Main/Data/Manager/DevelopmentBackups/C3-5-20261016.

### Trạng thái cuối C3

C3.1–C3.5 đã có trong source và đã kiểm tra ở phạm vi ghi rõ. Đây chưa phải xác nhận mọi sản phẩm đủ quyền bán, chưa test upload Adobe/Etsy thật, chưa cài đè production và chưa thay thế kiểm tra wallpaper động trên Windows/Android/iPhone ở C5. ZIP32 có giới hạn ứng dụng 1 GB mỗi phần và tối đa 100 phần ngoài Etsy; lựa chọn nhóm là greedy, không bảo đảm nghiệm chia tối ưu tuyệt đối. C4.1 tiếp theo là capability spike masked-edit cho workflow nhân vật SFW.
