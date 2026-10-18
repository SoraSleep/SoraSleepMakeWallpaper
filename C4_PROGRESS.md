# C4 — thay trang phục nhân vật trưởng thành SFW

Cập nhật 16/10/2026. C4.1 đã hoàn thành ở phạm vi capability spike và nền tảng manual-B draft trong source; C4.2–C4.6 chưa triển khai. Chưa cài đè production.

## Kết luận C4.1

**NO-GO cho tự động AI masked edit ở bản Image Dream 1.0.2 hiện tại. GO cho nhánh chuẩn bị A/B thủ công và xây mask/QA tiếp theo.** Đây là kết quả kiểm chứng capability, không phải lỗi credits hoặc yêu cầu chuyển sang API trả phí.

### Bằng chứng từ bản đang cài

- GET /api/health: đúng appId com.sorasleep.imagedream, version 1.0.2.
- GET /api/image-edits/status: available=true, engine=opencv-telea, aiModel=false, maxMaskArea=0.05. Công cụ Chỉnh vùng có sẵn vẫn được giữ; đây là sửa vùng dựa trên pixel lân cận, không phải mô hình sinh trang phục theo prompt.
- GET /api/v1/image-capabilities: HTTP 404. Chỉ kết luận route này chưa có; không suy ra toàn bộ website Dreamina không có Inpaint.
- Đọc source app.asar, không sửa: server.js đưa referenceImages vào generation config; generation-config.js chỉ cho một reference overall với Seedream 4.7. Không có mask được chuyển tiếp trong schema config đã kiểm tra.
- Chạy validator cục bộ của bản cài với một maskPath fixture: field không được trả lại trong validated config. Không gửi generation hoặc quotation.
- lib/image-edit-worker.js gọi OpenCV cv.inpaint(..., cv.INPAINT_TELEA), không có prompt/model sinh AI. lib/image-edits.js công bố aiModel=false và giới hạn vùng 5%.
- Report lưu hash của các file source đã kiểm tra, không sao chép cookie/token hoặc account secrets.

### Nghiên cứu web và quyền output

Dreamina có tài liệu chính thức hướng dẫn dùng Inpaint/brush để thay màu hoặc trang phục: https://dreamina.capcut.com/resource/change-dress-color-online . Đây là bằng chứng về tính năng web, chưa phải bằng chứng tài khoản hiện tại truy cập được hoặc app tự động điều khiển được.

Điều khoản chính thức đọc ngày 16/10/2026: https://www.capcut.com/clause/dreamina-terms-of-service?lang=en . Bản trang trả về có ngày cập nhật 22/01/2026. Phần đầu nêu dịch vụ nhìn chung dùng riêng, phi thương mại; mục Assets gắn ownership với tuân thủ Terms và có điều kiện bổ sung cho commercial use; phụ lục Việt Nam có quy định phi thương mại riêng. Chưa xác minh jurisdiction, tier và điều khoản bổ sung áp dụng cho tài khoản người dùng. Vì vậy không thể dùng việc có credits, đăng nhập free hay sở hữu output để tự kết luận được phép bán. Quyền thương mại của pipeline vẫn là chưa xác minh; không tự đánh dấu đã cấp quyền. Không tự động hóa website mới trong spike này.

## Đã triển khai

### 1. Capability inspector không tiêu credits

Module desktop/wallpaper-wardrobe.mjs đọc ba GET endpoint loopback, có timeout/redirect error và lọc field đầu ra. Không gọi preflight, batch/start, API trả phí hoặc thao tác tài khoản. Provider lạ/offline không bật tính năng; kể cả một route mới quảng cáo operation cũng không tự bật trước khi transport và phép thử được xác minh.

### 2. Chốt chặn masked request

Manager queue parser và Profile Studio client từ chối mask/protectedRegions hoặc operation/editMode inpaint/masked trước quotation/submission. Không bỏ field rồi lặng lẽ chạy overall-reference. Luồng reference hiện có không bị đổi thành masked edit; regression tests vẫn đạt.

### 3. Nhánh manual B draft

Trong Manager → Collection studio → workflow nhân vật SFW, có “C4.1 · Thay trang phục SFW”:

1. Kiểm tra capability và hiện trạng thái chưa xác minh AI masked edit.
2. Chọn master A và B đã được lưu ở các scene/lượt tạo của đúng collection character-wardrobe.
3. Nhập mô tả thay đổi trang phục; xác nhận nhân vật trưởng thành/SFW, quyền nguồn cho bản nháp và B làm thủ công.
4. Lưu record nháp vào WallpaperQueue/WardrobeDrafts, chứa selection ID, item ID, SHA-256 và kích thước của cả hai ảnh.

Backend bắt buộc hai hash khác nhau, cùng native dimensions, đúng collection/workflow và đúng hash master hiện tại; verify bytes từ snapshot trước khi lưu. Đổi lựa chọn hoặc master hash reset review trên UI. Không biến user attestation thành chứng nhận chất lượng/quyền thương mại.

**Giới hạn:** mới có adapter tiếp nhận các master có sẵn trong collection và lưu hợp đồng cặp A/B. Chưa có nhập file B bất kỳ, trình vẽ mask, auto submit web, composite, diff theo vùng hoặc nối thẳng record nháp này thành wallpaper xuất bán. Draft giữ status=needs_mask_and_pair_review, identityPreserved=unverified, outsideMaskPreserved=unverified, commercialReady=false. Không giả định cùng kích thước là cùng khuôn mặt/bố cục.

## Kiểm tra đã chạy

- 183/183 unit/integration tests Manager đạt, thêm 5 test cases với capability offline/foreign/Telea, preflight/submit không phát network khi có mask, queue parser guard, manual pair hash/size/review/mutation.
- TypeScript và production build đạt.
- Installed app audit thật: 3 GET endpoint, kiểm tra validator/source read-only. Kết quả đúng bản 1.0.2; zero generation requests.
- Edge UI thực thi nút capability trên API đang chạy, chọn hai fixture master, review bắt buộc, lưu draft qua queue backend, sai collection/hash bị chặn, đổi lựa chọn reset review.
- UI dùng bytes landscape A/B có sẵn để kiểm tra wiring. Checkbox trong test là fixture action, không phải xác nhận nhân vật thật/SFW/quyền nguồn. Không có portrait edit hoặc ảnh trang phục mới nào trong bước này.
- Không dùng credits, không chỉnh gallery/task/account production, không sửa installed app.asar.

Bằng chứng:

- real-test-output/c4/installed-capability.json
- real-test-output/c4/installed-source-audit.json
- real-test-output/c4/ui-report.json
- real-test-output/c4/wardrobe-ui.png
- Scripts: node scripts/c4-wardrobe-audit.mjs; node scripts/c4-wardrobe-ui.mjs.
- Backup source trước sửa: D:/SoraSleep Main/Data/Manager/DevelopmentBackups/C4-1-20261016.

## Hướng thực thi tiếp theo

### C4.2 — mask và nhập B thủ công trước

- Chọn A bằng snapshot/hash; canvas dùng tọa độ native, không lấy tọa độ CSS làm pixel ảnh.
- Brush/erase mask trang phục và protected regions riêng; bảo vệ mặt, tóc, tay và nền theo đánh giá người dùng. Tránh mặc định đổi phần da hoặc nhận diện tuổi tự động.
- Save mask PNG + project JSON, gắn source hash/dimensions và revision; đổi A buộc duyệt lại mask.
- Mô tả trang phục SFW rõ chất liệu/màu/kiểu dáng và yêu cầu giữ pose/camera/face, không coi prompt là bảo đảm giữ nguyên.
- Tiếp nhận B từ file do người dùng chỉnh bằng công cụ phù hợp; probe/decode/hash, giữ provenance và audit transport manual-b; kiểm tra cùng kích thước, không resize ngầm.
- Manual workflow vẫn hoạt động khi chưa có AI masked-edit transport. Không fallback sang text-to-image.

### Gate trước khi xét bật AI tự động ở C4.3

Cần kiểm chứng trên đúng phiên/tài khoản được phép: khả năng nhận A + binary mask + prompt, quote thật, submit duy nhất gắn task ID, download tương ứng, recovery không gửi lại và thực nghiệm giữ vùng ngoài mask. Chỉ có tên Inpaint trên trang marketing chưa đủ. Phải có nguồn phù hợp và bằng chứng quyền áp dụng trước production thương mại; không đổi sang dịch vụ trả phí ngầm.

### C4.4–C4.6

Đo diff trước composite, duyệt viền và vùng bảo vệ, composite có biên kiểm soát rồi đo lại; pair QA trước khi nối Portal Reveal/Hidden Reveal. Pilot 3 ảnh nhân vật trưởng thành phù hợp thực hiện sau khi các gate trên có đủ dữ liệu. Chưa tính các bước này là đã xong.


## Test prompt thật và cải thiện sau C4.1

- Đã chạy qua đúng installed Image Dream 1.0.2, không dùng model/API trả phí khác. Prompt tự viết: nữ thực vật học trưởng thành mặc jacket navy trong nhà kính; lượt B chỉ yêu cầu đổi jacket hồng, giữ mặt/nền/áo trong. Source A 15 credits free; reference B 5; balance quan sát 60 → 40. Dispatch lưu trước khi gửi, poll theo đúng task ID, kiểm SHA ảnh tải xuống, không auto submit lại.
- Đây là phép thử overall-reference có nhãn rõ, không bật masked-edit workflow. Ảnh A/B 1440×2560, B đổi áo đúng nhưng native ROI mặt có ~6.45% pixel sai khác >24/255; chưa đạt strict local-edit. Không biến độ giống bằng mắt thành xác nhận giữ nguyên danh tính.
- Cải thiện Manager: reject thêm mask aliases, validate native dimensions/hash trước nhận manual draft, khóa lựa chọn stale/trùng hash/sai kích thước ở UI và reset review cả khi selection ID đổi dù hash không đổi. 184/184 tests, typecheck/build và UI fixture đạt.
- Phát hiện lỗi EPERM khi lưu trạng thái render trên OneDrive trong lần test thật. Đã sửa render-jobs: temp file tên riêng và bounded retry cho EPERM/EBUSY/EACCES; lỗi khác không bị retry. Test mô phỏng lock + disk full đạt; render thực tế chạy lại thành công.
- Kiểm chứng Hidden Reveal bằng mask renderer thử riêng cho jacket navy: màu nguồn A + giới hạn y>0.46 + blur 1 pixel. Không phải clothing segmentation dùng chung, chưa có UI mask production. Mask được điều chỉnh sau khi xem viền chưa tốt của lần đầu.
- Runtime quality kiểm tra chính ZIP đã xuất bằng cùng-origin route cấp file offline từ ZIP (không Internet), tắt magnification để đo riêng ảnh biến thể: face ROI 0/79,772 pixel thay đổi khi reveal, vùng dưới có đổi áo. Không suy rộng phép đo này thành đảm bảo toàn bộ khuôn mặt/ảnh hoặc zoom không thay hình học.
- Xuất MP4 720×1280, 30fps, 4s, decode FFmpeg; ZIP desktop đủ runtime/assets. Portal được render chẩn đoán ban đầu nhưng không nằm trong kết luận bảo vệ khuôn mặt vì runtime Portal hiện không áp mask giống Hidden Reveal. Chưa test host/device C5.
- Ảnh thử là bản gốc chưa qua Chỉnh vùng có sẵn; watermark và quyền thương mại vẫn chưa được duyệt, commercialReady=false.
- Kết quả: real-test-output/c4/prompt-pilot/review.html, quality-summary.json, pair-quality.json, offline-quality.json, difference-lens-diagnostic.mp4 và difference-lens-diagnostic.desktop.zip.
- Script: c4-real-prompt.mjs (submit/poll durable), c4-real-pair-quality.mjs, c4-real-render.mjs, c4-offline-quality.mjs. Không lặp --submit cho state đã có token.
- Source/dist Manager cập nhật; installed Image Dream chỉ được dùng để test, không sửa app.asar. Mask cải thiện đang nằm trong pilot script/artifact, chưa tuyên bố đã có general-purpose editor C4.2–C4.6.
## Cập nhật hoàn tất nhánh manual-B — 17/10/2026

Các phần dưới đây thay thế trạng thái “chưa có UI/composite” của spike phía trên. C4 hoàn tất trong phạm vi nhận B thủ công; không tuyên bố pipeline AI masked-edit tự động đã hoàn tất.

- C4.2: Wardrobe Studio (`?studio=wardrobe`) có nhập A/B cùng native dimensions, brush/erase edit và protect, feather bên trong mask, nhập mask PNG, so sánh A/B/composite. Tọa độ brush quy đổi theo native ảnh. Protected region luôn thắng edit.
- C4.3 manual fallback: lưu/mở workspace JSON giữ bytes/hash gốc, mask gắn hash A, prompt và revision. Mở lại hoặc sửa dữ liệu buộc chạy lại QA/xác nhận. Manager mở Studio với assetId khi capability thực tế có hỗ trợ. Automatic masked edit vẫn false: app cài đặt chỉ được xác minh overall-reference và OpenCV Telea.
- C4.4: đo diff trước/sau composite. Kiểm tra exact RGBA ở native: ngoài edit và trong protect đều 0 pixel thay đổi sau composite. Đây là kiểm tra tính toàn vẹn theo mask, không phải chứng nhận mask nhận diện đúng quần áo.
- C4.5: xuất Difference Lens và Portal Reveal, ZIP kèm wardrobe-qa.json, MP4 và chuyển sang editor hiện có. A/B trong gói là PNG lossless để tránh lệch decode JPEG/PNG; workspace giữ originals. Chỉ thêm wardrobe-qa.json vào allowlist ZIP. Hai preset này không nhúng thêm mảng raw mask lớn vào config.
- C4.6: ba cặp ảnh thật từ Image Dream (nữ thực vật học áo hồng; nam thực vật học áo xanh; nữ kiến trúc sư áo đỏ rượu), native 1440×2560. Mỗi cặp xuất hai ZIP và hai MP4 720×1280, 30fps, 4 giây, 120 frames; FFmpeg decode đạt. Cặp đầu tiêu 20 free credits ở giai đoạn trước; hai cặp thêm tiêu 40. Lượt tiếp tục này không gen thêm ảnh.

### Kiểm chứng và giới hạn chất lượng

- Manager 184/184 tests, MakeWallpaper bridge suite 20/20, wardrobe core 5/5; typecheck/production builds đạt trong lượt triển khai này.
- UI test trên built dist: ba cặp × hai preset; import, save/reopen, review gate, invalidation khi đổi prompt; hash mask sai bị chặn. Brush test thật xác nhận native mapping, erase, protected và restore.
- Script độc lập đọc chính ZIP, so PNG A với original A; ngoài mask/protected exact 0; chạy runtime offline cho cả hai preset. Test runtime tắt zoom/glow/ripple để tách riêng ảnh biến thể; protected ROI nội biên dùng sai số sampling 2. Không suy rộng thành zoom không thay đổi hình học.
- Mask pilot dùng màu nguồn và chỉnh vùng riêng cho từng ảnh, không phải tính năng auto clothing segmentation. Đã chỉnh dải cổ và highlight sau visual review. Mẫu kiến trúc sư vẫn còn đốm xám/màu cũ nhỏ ở vai phải, cần tô mask thủ công và duyệt lại trước production. Kiểm tra pixel đạt không đồng nghĩa mọi viền đã đẹp.
- Các ảnh thử còn watermark nguồn, chưa qua công cụ Chỉnh vùng sẵn có. Không kết luận công cụ watermark của Image Dream bị lỗi; bước này chưa áp dụng nó. Quyền nguồn/thương mại chưa xác minh. Checkbox trong test chỉ kiểm tra gate. Tất cả artifacts giữ commercialReady=false.
- MP4 là chuyển động dựng sẵn, không có tương tác chuột. ZIP tương tác dành cho host desktop tương thích; chưa xác minh cài thật Windows/Android/iPhone, chưa soak 30 phút (C5).
- Đã cập nhật source/dist hai dự án. Không ghi đè installed Image Dream/Manager app.asar, không push Git.

### Kết quả và cách chạy lại

- Tổng quan: real-test-output/c4/completion/review.html
- Báo cáo UI: real-test-output/c4/completion/ui-report.json
- Đo output độc lập: real-test-output/c4/completion/export-quality.json
- Brush: real-test-output/c4/completion/brush/report.json
- Kết luận: real-test-output/c4/completion/completion-report.json
- `npm run test:wardrobe`; `node scripts/c4-brush-ui.mjs`; `npm run test:wardrobe-ui`; `npm run test:wardrobe-output`.
- Không chạy lại các script generation với submit cho state đã có remote token.

Tiếp theo trước bán: sửa nốt mask/duyệt viền từng sản phẩm, áp dụng quy trình nguồn sạch/quyền hợp lệ, chạy C5 trên thiết bị/host thật. Muốn bật AI masked-edit phải kiểm chứng transport A+mask+prompt và recovery thực tế; giữ gate hiện tại đến khi có bằng chứng.
