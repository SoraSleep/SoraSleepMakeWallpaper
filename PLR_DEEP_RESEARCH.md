# Preset 02 — đánh giá chuyên sâu và thứ tự cải thiện

Ngày rà: 17/10/2026. Phạm vi: source MakeWallpaper/Manager và tài liệu chính thức. Không sửa chức năng ứng dụng, không tạo ảnh hoặc tiêu credits trong lượt nghiên cứu. Các chỉ tiêu dưới đây là đề xuất nghiệm thu, không phải kết quả benchmark đã đạt.

## Kết luận

PLR Studio hiện là công cụ nhập và chuẩn bị danh sách. Để trở thành công cụ sản xuất, ưu tiên quản lý collection lớn, thực thi bền vững, xử lý ảnh đúng loại, và gom sản phẩm cuối. Không cần thêm trình sáng tác prompt hoặc thêm hiệu ứng chuyển động.

Người dùng thiết lập preset một lần: loại hàng, provider/config được phép, kích thước, ngân sách, xử lý nền, license và giao gói. Các lần sau: nhập file → xem preflight → chạy → duyệt ngoại lệ → nhận gói.

## 1. Phát hiện từ code, gồm kiểm chứng cục bộ

| Phát hiện | Hậu quả | Ưu tiên |
|---|---|---|
| PLR export có awaiting-manager-integration | JSON chưa được gửi/chạy ở Manager | P0 |
| recipe chưa có aspect/model/resolution/imageCount/credit cap/collection identity | Chưa thể tái lập lượt sản xuất hay báo giá chính xác | P0 |
| Queue chỉ nhận tối đa100prompt | Cần điều phối nhiều batch, không gửi500 trực tiếp | P0 |
| Collection giới hạn30.000bytes JSON | 100prompt vừa dài có thể không lưu được dù chưa quá100hàng | P0 |
| Shortlist và selection tối đa100master | Chia generation thành5batch không tự giải quyết đóng bộ500ảnh | P0 |
| Planner tự nối chỉ dẫn stock/wallpaper vào prompt | Không phù hợp cam kết gửi nguyên prompt của PLR | P0 |
| UI cho skip duplicate tùy chọn, collection submission lại chặn prompt trùng | Hai lớp có chính sách không thống nhất | P1 |
| Browser lưu thủ công localStorage; row IDs chỉ prompt-1…N | Chưa đủ làm hồ sơ job/resume bền vững và phân biệt các file nhập | P1 |
| Background engine unverified | Chưa có tách nền thật, chưa đánh giá chất lượng clipart | P1 |
| Profile Studio client quote/start/archive theo từng prompt | Có overhead ở quy mô500; cần đo trước khi đổi cách submit | P1 |

Script scripts/plr-readiness-audit.mjs đã tái hiện: queue500 bị từ chối; collection100prompt×500ký tự bị chặn30KB; shortlist101master bị chặn; planner thêm nội dung vào prompt. Không gọi generation/network. Bằng chứng: real-test-output/plr-research/audit.json.

Source: src/plr/PromptFilePanel.tsx, promptFile.ts, productionRecipe.ts; wallpaper-art-plan.mjs; D:/SoraSleep Main/Manager/desktop/wallpaper-collections.mjs, wallpaper-queue.mjs, wallpaper-shortlist.mjs, profile-studio-client.mjs.

## 2. Cải thiện quan trọng nhất: parent collection và schema sản xuất

Tạo PLR collection tổng có collectionId/revision, file hash, prompt rows, preset snapshot và output selections. Dùng SQLite giao dịch hoặc store chuẩn có atomic checkpoint trong Manager, không dùng browser làm nguồn dữ liệu job duy nhất.

Row identity gồm collectionId + rowId + source ordinal; thêm rawPromptHash để theo dõi thay đổi. Không dùng riêng hash prompt làm job ID vì người dùng có thể cố ý lặp prompt để gen biến thể. Nhập cùng file cần lựa chọn resume collection cũ hoặc tạo run mới, không tự gửi lại.

Giữ rawPrompt nguyên bản; submittedPrompt chỉ khác khi có tùy chọn rewrite đã duyệt. PLR không đi qua template thêm “wallpaper UI/stock illustration”. Byte/hash nguồn và thay đổi whitespace phải truy vết được.

CSV tối thiểu vẫn là prompt. Nâng tùy chọn: id, title, group, asset_type, aspect_ratio, background_mode. Không bắt buộc người dùng điền các cột này; preset áp default. Validate capability thực cho từng tỷ lệ qua mọi tầng: UI hiện có1:1/4:5 nhưng planner/queue hiện chỉ cho9:16/16:9.

Batch giới hạn cả số hàng và serialized bytes nếu tái dùng collection cũ. Giải pháp tốt hơn là lưu prompt rows riêng trong parent store, child batch chỉ giữ tham chiếu. Không tăng mọi limit lên5000 mà vẫn nhúng toàn dữ liệu vào mỗi checkpoint.

Recipe cần: productKind, promptPolicy, aspect, model/configVersion, resolution target, imagesPerPrompt, maxCredits, maxRegenerationAttempts, minPixelSize, background model/version/hash, trim/padding, outputFormat/colorProfile, licenseProfile/revision, delivery/maxPartBytes.

## 3. Định nghĩa số lượng và ngân sách

Phải phân biệt prompt rows, generation attempts, candidates, selected masters và delivered files. 500prompt không tự bảo đảm500ảnh đạt hoặc500ảnh duy nhất. Preview/thumbnail không tính vào số ảnh sản phẩm.

Mặc định một candidate được chọn cho mỗi prompt; các kết quả khác lưu seller archive. Nếu provider trả nhiều ảnh, mapping theo task/artifact ID rồi chọn đúng bản, không gom tất cả download thành số hàng đã bán.

Hai chế độ kết thúc:
- Theo danh sách: chạy từng prompt một lần, báo số đạt/thất bại; đóng bộ thực tế.
- Theo số lượng mục tiêu: bù các ảnh bị reject trong giới hạn attempt và credit đã đặt; không vòng lặp gen vô hạn.

Credit ledger tách: quoted, reserved cho request đã dispatch/chưa rõ kết quả, observed charged, released. Thay quote/config làm stale preflight. ETA lấy từ thống kê job thật, không hardcode giá15credit hay thời gian mỗi ảnh từ một pilot.

Giới hạn account/provider hoặc hết credit là trạng thái dừng có thể tiếp tục phù hợp; không biến việc xoay tài khoản thành quyền vượt giới hạn dịch vụ.

## 4. Queue sản xuất có thể resume

Manager làm orchestrator duy nhất; Image Dream adapter xử lý generation; worker local xử lý ảnh; packer C3 giao gói. UI MakeWallpaper dùng narrow API hoặc đặt workflow trong Manager với IPC, không để hai queue cùng điều khiển một phiên Image Dream.

State machine:
queued → preflight → dispatching → generating → downloading → processing → technical_check → needs_review/approved → packaging → packaged.

Checkpoint trước dispatch; lưu remote task identity ngay khi biết. Timeout sau submit là reconcile, không retry tạo ảnh. Download retry cùng task; segmentation retry từ nguồn đã tải; ZIP retry từ masters đã chốt. Reimport/restart không làm mất quyết định QA.

Xử lý dở trước khi tối ưu tốc độ:
- Pause ngừng dispatch mới, xử lý rõ job đang chạy.
- Cancellation không xóa gallery hay đóng app người dùng tùy tiện.
- Session/profile/credit không hợp lệ → hiển thị đúng lý do.
- Lock một generation owner; giới hạn concurrency theo provider.
- Khi khởi động lại, dispatching/submitted không có kết quả rõ phải reconcile.

Client hiện quote/start/archive từng prompt. Đo overhead thật, sau đó mới xét micro-batch nếu API/task correlation và ngân sách được kiểm chứng. Không đổi thẳng thành start500prompt hoặc mở nhiều browser.

## 5. Tách nền: chọn engine bằng bộ thử đúng sản phẩm

Khuyến nghị benchmark BiRefNet chính thức làm ứng viên chất lượng, U2Net làm baseline; chưa kết luận engine nào tốt nhất trên máy này. BiRefNet có biến thể general/matting/HR. Model card base ghi MIT; pin đúng repository/revision/artifact để tránh nhầm model khác cùng architecture. [BiRefNet model card](https://huggingface.co/ZhengPeng7/BiRefNet), [official implementation](https://github.com/ZhengPeng7/BiRefNet).

Rembg là adapter tiện cho batch, không phải một model đồng nhất. Tài liệu hiện tại chọn BRIA mặc định và nhắc weights có license riêng. BRIA RMBG-2.0 weights cần thỏa thuận thương mại; không dùng default mà suy ra quyền từ MIT của thư viện. [rembg](https://github.com/danielgatis/rembg), [BRIA](https://huggingface.co/briaai/RMBG-2.0).

Bộ benchmark đề xuất30ảnh,6nhóm×5: hoa trắng; lá/cành mảnh; watercolor có viền nhạt; chủ thể tối; nhiều đối tượng cách rời; chi tiết mềm/tóc/lông. Duyệt trên checkerboard, trắng, đen và màu bão hòa.

Đo: chủ thể mất/còn nền, halo, chi tiết bị cắt, sai alpha holes, thời gian median/p95, RAM/VRAM cao nhất và tỉ lệ cần sửa. Subset có mask người duyệt làm đối chứng; ảnh hoa nhiều cánh rời không được tự xóa component nhỏ như rác.

Worker tái dùng một inference session, không load model lại cho từng ảnh. Concurrency1 ban đầu; tăng sau đo bộ nhớ. Nguồn immutable, derivatives có parent hash và recipe hash. Giữ canvas native; trim/padding là setting rõ, không crop chặt âm thầm.

Matting/foreground refinement là bước riêng khi có halo; không giải quyết mọi trường hợp bằng blur mask. RGB phía dưới alpha và viền bán trong suốt cũng cần kiểm trên nền đối lập.

File full landscape/background không chạy segmentation. File trộn loại dựa trên asset_type/background_mode hoặc review, không suy đoán chắc từ một từ trong prompt.

## 6. Quality control đủ để bán, giảm duyệt lặp lại

Ba tầng:
1. Tự động xác định chắc: decode, dimensions/format, hash, missing file, duplicate exact, alpha rỗng/toànopaque khi yêu cầutransparent.
2. Gợi ý: dHash/semantic similarity, softness, bất thường bounding box, vùng màu/matte, crop. Hiện C3 có dHash warning; tái sử dụng và bổ sung thay vì gọi là AI judge hoàn chỉnh.
3. Người duyệt: thẩm mỹ, chi tiết hình học, đúng ý prompt, chất lượng viền, quyền nguồn và claim listing.

Không auto reject hai ảnh vì cùng concept; similarity cần ngưỡng hiệu chỉnh với bộ ảnh thực. Không auto approve chỉ vì “0 lỗi decode”.

Preset đã duyệt có thể áp quyền/config chung cho cả batch cùng nguồn; chỉ ảnh ngoại lệ cần review. Đổi source/hash/model/license revision phải làm stale phần review liên quan. Contact sheet theo trang, có zoom100% và thao tác giữ/loại/chạy lại xử lý cho nhiều ảnh.

Kích thước theo công dụng: clipart, ảnh nền màn hình, digital paper, print art có tiêu chuẩn riêng. Không áp ngưỡng Adobe4MP cho mọi PLR. Ví dụ3600×3600px cho giấy12×12inch tại300ppi là phép tính kích thước, không chứng nhận chi tiết. Đổi metadata DPI không tăng pixel. JPEG không dùng cho alpha; PNG không tự nghĩa là vector.

## 7. Gom500ảnh và giao gói

Tái sử dụng ZIP streaming/checksum C3. Parent manifest tổng hợp selected masters từ nhiều batches; shortlist/contact sheet phân trang và xử lý streaming vượt giới hạn100hiện tại. Không gom500bitmap/base64 vào RAM.

Trước chạy ước tính disk: ví dụ giả định10MB/ảnh×500=5GB cho một lớp dữ liệu; nguồn+derivative+ZIP có thể khoảng15GB, chưa tính model/preview. Đây là tình huống tính toán, không đo file thật. Kiểm free space và dự phòng; không xóa originals để tiếp tục tự động.

Buyer pack: ảnh đã duyệt, thư mục group nếu có, README, license/restrictions, contact sheet, hướng dẫn tải và manifest phù hợp. Seller archive riêng chứa prompts, attempts, task IDs, model/config/credit/QA; không đưa credentials/account internals vào hàng giao.

Một bộ500ảnh có thể xuất thành nhiều ZIP độc lập, không cần volume .z01. Reopen/unzip/CRC/hash/decode output cuối để bảo đảm gói có thể sử dụng.

Etsy giới hạn5file×20MB. Bộ lớn cần báo không vừa và chọn phương án giao hợp lệ; không hạ chất lượng âm thầm. AI phải được khai báo theo Creativity Standards, và người mua PLR không đương nhiên được bán lại nguyên bộ trên mọi marketplace. [Etsy digital files](https://help.etsy.com/hc/en-us/articles/115015628347-How-to-Manage-Your-Digital-Listings), [Creativity Standards](https://www.etsy.com/legal/creativity/).

## 8. PLR license và provider là yêu cầu sản phẩm

Lưu điều khoản cụ thể người mua được chỉnh sửa, dùng thương mại, bán ảnh gốc hay bán lại cả bộ, được cấp tiếp PLR hay không. Nhãn PLR không thay nội dung giấy phép.

Dreamina Help yêu cầu kiểm điều khoản theo tính năng/khu vực cho thương mại. Bản Terms trả về ngày rà còn nêu hạn chế tương tác bằng automated scripts. Cần xác minh quyền tích hợp và cấp lại asset cho đúng trường hợp; đăng nhập, freecredits hay quyền sở hữu output không tự chứng minh tất cả quyền này. [Help](https://dreamina.capcut.com/help), [Terms](https://www.capcut.com/clause/dreamina-terms-of-service?lang=en).

Giữ bước chỉnh vùng đã có của Image Dream và quan hệ derivative; không coi việc đã sửa một vùng là toàn ảnh sạch/đã có quyền bán. Không bỏ attribution bắt buộc hoặc tự cấp license.

Listing sinh từ số file/kích thước/format/alpha thực tế. Các trạng thái cần phân biệt: packaged-draft, ready-for-final-review, ready-to-upload theo profile đã duyệt, published chỉ khi có hành động phát hành thật.

## 9. UI tối giản phù hợp yêu cầu “chỉ đưa prompt”

Giữ màn hình chính:
- Drop file + tên bộ + preset sản phẩm đã lưu.
- Preflight: số prompt, ảnh dự kiến, duplicate policy, config, credit cap và disk.
- Run/Pause/Resume; tiến độ riêng generated/downloaded/processed/approved/packed.
- Tab Cần xem lại chỉ hiển thị ngoại lệ, có contact sheet và native preview.
- Output: ảnh thực tế, phầnZIP, preview listing, license và blockers.

Ẩn thiết lập nâng cao trong preset editor. Không bắt chọn concept/series mỗi lần. Cảnh báo “500prompt→497ảnhđạt” trực quan, không dùng một progress bar để giả đã hoàn tất mọi stage.

## 10. Thứ tự phát triển và nghiệm thu

| Giai đoạn | Việc làm | Điều kiện xong |
|---|---|---|
| P02.2A | Parent store, identity, immutable recipe, verbatim prompt và cấu hình đủ | Reload/reimport không nhầm run; byte/count limits xử lý rõ |
| P02.2B | Manager API/IPC, credit ledger, dispatcher/resume | 500mockjobs, fault injection từng stage, không submit trùng |
| P02.3 | Benchmark + worker segmentation | 30ảnh thật, report chất lượng/timing/RAM, engine pinned |
| P02.4 | QA ngoại lệ + master selection nhiều batch | Duyệt/đổi derivative đúnghash, similarity không auto reject nhầm |
| P02.5 | Aggregate pack500 + source/buyer separation | Unzip/checksum/decode và số ảnh đúng, staging lỗi không complete |
| P02.6 | Listing kit, license preset, delivery constraints | Claims theo output thật, blockers đúng kênh |
| P02.7 | Real pilots rồi soak | 3background+3clipart end-to-end; sau đó50/500 theo ngân sách |

Test chịu lỗi bắt buộc: mất mạng sau submit; restart lúc download; hếtcredit; session hết hạn; worker hếtRAM; hỏng1PNG; diskfull; ZIP bị lock; nguồn đổihash; danh sách có prompttrùng cố ý. Chỉ retry đúng stage, không xóa hay ghi đè công việc khác.

Đo hiệu quả: approved/output ratio, số ảnh phải xem tay, credit/ảnh approved, thời gian/stage, lỗi resume và dung lượng giao thực tế. Chưa đưa cam kết tốc độ, tỷ lệ đạt hoặc số giờ500ảnh trước benchmark thật.

Việc nên làm ngay: P02.2A/B. Chưa nên thêm nhiều model, prompt generator, auto-upload đa marketplace hoặc benchmark500lượtgen trước khi dispatcher và pack aggregator hoạt động.
