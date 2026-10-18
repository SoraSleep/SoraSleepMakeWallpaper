# SoraSleep — Prompt → Concept → Wallpaper / Stock

Cập nhật 17/10/2026. Đây là kế hoạch cải tiến có đối chiếu source hiện tại và tài liệu chính thức. Phần gộp preset đã triển khai; các task sản xuất mới dưới đây chưa được coi là đã chạy thật.

## Điều chỉnh theo yêu cầu người dùng — PLR

Preset 02 là **PLR Collection Studio**, bộ ảnh tĩnh theo series để tự bán, ví dụ 500 ảnh mùa xuân. Không có chuyển động/A-B, không mặc định nộp Adobe Stock. Bước R1.1 brief/phân bổ/lưu kế hoạch đã hoàn thành; xem PLR_R1_PROGRESS.md. Các phần nghiên cứu stock marketplace bên dưới chỉ dùng khi người dùng chọn nhánh marketplace riêng. Chưa nối generation hay cấp quyền PLR tự động.

## 1. Quyết định sản phẩm

Một preset tương tác: **Reveal Studio**, hai chế độ Difference Lens (zoom và lộ khác biệt) / Portal Reveal (cửa sổ sang B). Chọn chế độ trong wizard, editor, planner hoặc Wardrobe. Thư viện/home chỉ có một card. Giữ các runtime ID cũ để file dự án/bridge/gói đã xuất tiếp tục đọc được; không tạo migration làm mất setting. Một lần xuất vẫn dùng chế độ đang chọn, không tự trộn hai renderer vào cùng frame hoặc tự nhân đôi file.

Concept là brief nội dung dùng chung; không phải motion preset. Mỗi collection có thể tạo nhiều sản phẩm, nhưng không bắt buộc mỗi ảnh phải có B.

| Sản phẩm | Đầu vào | Cách làm | Đầu ra |
|---|---|---|---|
| Bộ wallpaper phong cảnh | Một ảnh A mỗi scene | Landscape Studio; particles/nước/ánh sáng phù hợp vùng đã duyệt | Ảnh tĩnh, MP4, desktop web đã test host |
| Bộ art/background tự bán | Một ảnh A mỗi scene | Chọn ảnh mạnh, bố cục dọc/ngang có chủ đích | JPEG/PNG + preview + điều khoản người mua + ZIP |
| Ảnh stock marketplace | Một ảnh A mỗi scene | Chọn kênh trước; kiểm kỹ thuật, quyền, metadata và trùng lặp | JPEG đúng profile + CSV + hồ sơ nguồn |
| Wallpaper A/B tương tác | A và B cùng bố cục | Reveal Studio; alignment/mask/protect/QA | ZIP desktop / MP4 dựng sẵn |

Khuyến nghị: ưu tiên phong cảnh SFW và stock/background không người. Giữ Wardrobe là nhánh riêng; không đưa yêu cầu tạo B vào mọi batch phong cảnh/stock. Không dùng thay màu áo hoặc đổi màu nền thành nhiều ảnh stock gần trùng.

## 2. Những gì đang có và còn thiếu

Đã có trong source Manager: collection concept (mùa/chủ đề/mood/palette/style guide); nhập TXT/CSV tối đa 100 scene; phát hiện prompt trùng chuẩn hóa; workflow landscape/stock không cần B; báo giá và ngân sách; dispatch/reconcile theo job; chọn master/derivative đúng nguồn và hash; metadata, shortlist/contact sheet, art pack/Adobe profile, ZIP streaming và giới hạn dung lượng. MakeWallpaper có Landscape Studio và Reveal Studio. Không xây lại các phần này.

Khoảng trống thực tế:

1. Chưa có một màn hình điều phối rõ từ brief đến sản phẩm với lý do bị chặn cho từng scene.
2. Chưa có kế hoạch bố cục theo mục đích dùng stock và ma trận biến thể có ý nghĩa.
3. Chưa chứng minh model/cấu hình trong app free trả ảnh native đủ độ phân giải cho kênh stock đã chọn. Pilot 1440×2560 = 3.6864 MP, chưa đạt 4 MP.
4. Có công cụ Chỉnh vùng trong Image Dream, nhưng cần nối lựa chọn derivative đã duyệt xuyên suốt, kiểm từng ảnh; không mặc định metadata sửa vùng đồng nghĩa sạch toàn ảnh.
5. Thiếu kiểm thử toàn chuỗi với collection mới sau khi đóng gói, phục hồi giữa chừng và cài host/device thật.
6. Source/dist cập nhật chưa đồng nghĩa installed production apps đã cài bản mới.

## 3. Kết quả nghiên cứu kênh

Rà ngày 17/10/2026, kiểm lại trước mỗi đợt phát hành:

- Adobe Stock chấp nhận AI theo các tiêu chuẩn riêng. Phải có quyền từ công cụ tạo ảnh, khai báo AI, dùng loại nội dung đúng ảnh nhìn như photo hay illustration; prompt và metadata tránh người nổi tiếng, tên nghệ sĩ, nhân vật/thương hiệu/tác phẩm được bảo hộ. Người/tài sản có thể cần release hoặc nhãn fictional theo trường hợp. [Hướng dẫn AI](https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/generative-ai-content-guidelines.html).
- Profile JPEG Adobe: sRGB, 4–100 MP, tối đa 45 MB, không watermark/branding. Kích thước mục tiêu nội bộ gợi ý 2160×3840 hoặc 3840×2160 (8.29 MP), chỉ khi provider thực sự hỗ trợ và chất lượng đạt; không ghi chữ 4K vào prompt rồi coi file đã là 4K. [Yêu cầu kỹ thuật](https://helpx.adobe.com/stock/contributor/submit-your-content/submit-photos/technical-legal-requirements-photo-submission.html).
- Adobe khuyên chọn nội dung khác biệt về ý tưởng/công dụng; lật, crop, đổi màu hoặc đổi filter thường không đủ. Chọn lọc trước upload thay vì xuất mọi biến thể. [Distinct content](https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/distinct-generative-ai-submission-best-practices.html).
- CSV là metadata hàng loạt, không tự thay thao tác khai báo AI/release trong portal. Giữ header từ template, UTF-8, tối đa 1 MB/5,000 dòng. [CSV](https://helpx.adobe.com/stock/contributor/manage-your-portfolio/create-csv-file.html).
- Shutterstock không nhận AI do contributor gửi: đánh dấu kênh không hỗ trợ, không tạo profile giả “sẵn sàng Shutterstock”. [Chính sách](https://submit.shutterstock.com/help/en/articles/10594622-content-policy-updates-ai-generated-content).
- Quyền thương mại Dreamina phụ thuộc điều khoản/khu vực/tính năng áp dụng. Tài khoản free có credit không tự chứng minh quyền cấp phép stock; lưu bằng chứng điều khoản theo nguồn. [Dreamina Help](https://dreamina.capcut.com/help).

Đề xuất ngách để thử, chưa phải kết luận về doanh thu hay thị trường ít cạnh tranh: seasonal backgrounds có copy space (hoa đào, thu, đông); botanical/wellness backgrounds; thiên nhiên tối giản cho slide/banner; landscape illustration coherent packs. Chọn theo công dụng rõ và khả năng kiểm chất lượng, sau đó đo phản hồi/listing thực tế.

## 4. Luồng chạy mục tiêu

Manager → tạo collection/chọn sản phẩm và kênh → nhập brief + danh sách prompt → dựng prompt/scene sheet → xem dự toán → thực thi qua đúng Image Dream free đang cài → lấy ảnh theo task ID → kiểm native → chọn master cuối → duyệt → nhánh wallpaper hoặc stock → đóng gói → kiểm output → hàng chờ phát hành.

Tự động hóa bước tạo/lưu/kiểm kỹ thuật/đóng gói. Duyệt thẩm mỹ, quyền và hành động đăng bán vẫn có trạng thái riêng. Không cam kết “prompt nào cũng tự ra ảnh bán được”. Không đăng bán tự động trong phạm vi này.

Trạng thái mỗi scene: draft → planned → quoted → generating → downloaded → technical_check → needs_review → approved/rejected → packaging → packaged → publication_review. Có submission_uncertain để tra cứu job đã gửi; không retry submit mù. Lưu sourcePrompt và expandedPrompt riêng, không ghi đè prompt người dùng. Đây là model trạng thái mục tiêu; cần map từ status hiện có, không đổi toàn bộ queue một lần.

## 5. Task triển khai theo thứ tự

### R0 — Hợp nhất preset (đã làm)

- Home/library một card Reveal Studio, chọn hai chế độ trong wizard/editor.
- Wardrobe/planner ghi rõ đây là mode của cùng preset.
- Giữ runtime ID và format project cũ; xuất theo mode đã chọn.
- Manager: bỏ hai card riêng trong Wallpaper Center, thay bằng một lựa chọn Reveal Studio có hai mode; collection dùng cùng cách gọi. Đã cập nhật source/dist, chưa cài đè app production.
- Build + Edge UI test trên dist: một default card, đổi mode wizard/editor, một card trong library và bốn card khi bật experiments, không lỗi JavaScript.
- Bằng chứng: real-test-output/reveal-studio/report.json; scripts/reveal-studio-ui.mjs. Test thêm reload/autosave giữ Portal mode. MakeWallpaper build, Manager build và Manager TypeScript đạt. Các xác nhận quyền trong test là fixture kiểm UI, không phải duyệt quyền ảnh.

### R1 — Collection recipe và bảng scene (ưu tiên tiếp theo; 1–2 buổi)

- Nâng collection hiện tại bằng outputIntent (wallpaper-pack/art-pack/stock), channelProfile, composition, copySpace, exclusions và provenancePolicy; dùng revision, default tương thích collection cũ.
- UI ba khu vực: brief, bảng prompt/scene, mục tiêu output + ngân sách.
- Với stock không hiện variantChange/B/mask/reveal. Với landscape cho chọn recipe chuyển động sau khi có ảnh.
- Scene sheet hiển thị original prompt, effective prompt, tỷ lệ, chủ thể, bố cục, vùng trống và cảnh báo trùng. Không tự thêm phong cách nghệ sĩ/nhãn hiệu.
- Compiler template cục bộ là mặc định, không bắt buộc thêm LLM trả phí. Trường nhập tự do giữ nguyên; chỉ thêm brief/ràng buộc có version, có preview.
- QA: save/open và schema cũ; prompt Unicode/CSV nhiều dòng; đổi brief làm stale quote; stock không tạo B; không submit khi chỉ preview.
- Hoàn tất khi một collection 6 scene được review và lưu/reopen đúng prompt/cấu hình mà chưa tiêu credit.

### R2 — Capability và cổng kiểm độ phân giải (1 buổi + một pilot có báo giá)

- Đọc cấu hình model/size thực tế của installed Image Dream và báo giá tài khoản đang sẵn sàng; không suy ra từ tên model.
- Hiển thị kích thước dự kiến nếu biết, unknown nếu chưa biết. Sau tải: decode/đo width×height/file size thật, giữ hash và model config.
- Stock bị chặn nếu <4 MP hoặc sai định dạng/profile. Wallpaper vẫn có thể duyệt riêng theo kích thước mục tiêu, không nâng nhãn chất lượng.
- Ưu tiên gen native đủ lớn nếu hỗ trợ. Nếu chỉ ra 2K: giữ hàng stock ở blocked hoặc thêm derivative upscale minh bạch sau khi xác minh công cụ; không upscale âm thầm để qua gate.
- QA: ảnh 3.6864 MP bị chặn stock; ảnh fixture đủ kích thước không bỏ qua các gate chất lượng/quyền; timeout/status không chắc không tạo job trùng.
- Hoàn tất khi có báo cáo khả năng thực tế cho ít nhất một cấu hình free, không cam kết native 4K trước test.

### R3 — Sản xuất batch ổn định (1–2 buổi)

- Tái sử dụng queue hiện tại: một dispatch token/task ID/scene; checkpoint trước/sau request; resume chỉ poll job đang có.
- Giới hạn concurrency theo app, mặc định một job; dự trù credit của job chưa rõ kết quả. Hết credit/login/limit thì dừng đúng trạng thái theo quy tắc provider.
- Retry tải file/đọc status có giới hạn; tạo lại ảnh là generation attempt mới có budget riêng. Không tự đổi tài khoản để vượt hạn chế dịch vụ.
- UI hiện scene nào đang chạy, ảnh nào cần duyệt, lỗi có retry/poll/reconcile phù hợp; nút pause dừng gửi job mới.
- QA: restart lúc generating/download; network timeout; credit không đủ; partial batch; nguồn bị đổi hash. Không gen lặp khi resume.

### R4 — Chất lượng ảnh cuối và tính khác biệt (1–2 buổi)

- Tái sử dụng final asset picker/shortlist C3, bổ sung checklist theo concept: phối cảnh/kiến trúc, hình học hoa/lá, chi tiết texture, vùng trống, chữ/logo, độ sắc nét, màu.
- Chọn đúng derivative đã duyệt trong Image Dream; không chọn file mới nhất theo thời gian. Nếu dùng Chỉnh vùng, lưu quan hệ gốc/derivative và xem lại toàn ảnh ở 100%.
- Hash trùng là chặn; near-duplicate là gợi ý so sánh, không tự reject cảnh khác. Metadata phải bám ảnh cuối, không suy từ prompt rằng AI đã vẽ đúng.
- Mỗi lần đổi master/hash reset chất lượng/metadata/quyền; rejected có lý do và không vào gói publish.
- QA: bản edited không thuộc scene, sai hash, mới chỉ sửa một vùng nhưng watermark vẫn còn, trùng ảnh, ảnh chưa đủ MP.

### R5 — Hai nhánh đầu ra (1–2 buổi)

- Stock: JPEG sRGB đúng profile + metadata CSV hiện có + provenance/AI/release checklist; không nhúng motion/B vào stock. Không thêm cột AI không có trong template Adobe.
- Wallpaper: chọn Landscape recipe theo ảnh; tự gợi ý particles/nước nhưng user duyệt vùng. Khi chọn Reveal Studio mới yêu cầu cặp B và QA tương ứng.
- Art pack: ảnh native + preview/contact sheet + license do seller duyệt + ZIP chia phần hiện có. Tỷ lệ dọc/ngang là composition riêng hoặc crop đã review, không kéo giãn.
- Đầu ra có asset hash, profile/version, kích thước thực, nguồn/derivative, recipe, manifest/checksum và blockers. Nhãn “sẵn sàng review” tách với “đã được chấp nhận bán”.
- QA: unzip/checksum/decode ảnh/video; CSV khớp filename; stale review bị chặn; giới hạn ZIP; gói lỗi không hiện hoàn tất.

### R6 — Pilot concept thực và test C5 (2–3 buổi, tùy thời gian gen và thiết bị)

- Chọn Spring Sakura Calm, 6 prompt khác ý tưởng: vườn bên hồ, nhánh hoa làm border, nền tối giản copy space, đường cong cánh hoa, trà thất, cảnh mưa xuân.
- Chạy thử 2 scene đầu với quote và ngân sách đã xem; xem chất lượng trước khi chạy 4 scene còn lại. Không mặc định số ảnh đạt hay giá credit.
- Chọn khoảng 3–4 ảnh mạnh tùy kết quả; một stock pack phù hợp kênh, một static art pack; chọn hai landscape scene phù hợp để render motion.
- Trên host thật: desktop tương tác và video điện thoại; test pause/resume, đổi màn hình/tỷ lệ, loop seam, touch/hiệu suất và soak 30 phút. Ghi OS/host/model máy/kết quả; không suy diễn Edge mobile viewport thành test điện thoại.
- Báo cáo theo scene: prompt/config/credit/task ID/hash → master → QA/blockers → filename output → decode/device kết quả.
- Hoàn tất kỹ thuật khi resume không gen trùng, file mở được, metadata/checksum đúng, các blockers được hiển thị thật. Quyền thương mại và marketplace acceptance không được gán tự động.

Ước lượng: 8–12 buổi có tập trung, không phải cam kết ngày phát hành. R2 có thể làm đổi phạm vi stock nếu provider không trả ảnh đủ chất lượng/kích thước hoặc quyền nguồn chưa phù hợp.

## 6. Công thức prompt và collection đầu tiên

Prompt = chủ thể/cảnh + bối cảnh + bố cục/công dụng + ánh sáng + palette/style brief + yêu cầu hình học/chất lượng + exclusions. Tỷ lệ/size truyền qua config thật, không chỉ viết trong prompt. Không yêu cầu logo/signature/nhân vật có bản quyền.

Concept chung: Spring Sakura Calm. Original botanical/landscape illustration; dusty pink, sage, warm ivory; dịu, sáng, rõ kiến trúc; không người/chữ/logo; scene khác nhau về công dụng.

Ví dụ stock banner:
“Original botanical illustration of a sparse cherry blossom branch framing the upper left corner, warm ivory background with subtle natural texture, generous clean copy space on the right for a wellness banner, soft diffused daylight, dusty pink petals and sage leaves, coherent branch anatomy, no text, no logo, no signature.”

Ví dụ wallpaper dọc:
“Original landscape illustration of a tranquil spring garden pond with a small wooden footbridge, cherry blossoms framing the lower sides, soft dawn mist, stable architectural perspective, pale pink and sage palette, quiet open sky in the upper center for a phone clock, no people, no lettering, no logos.”

Ví dụ không tốt cho batch stock: cùng ảnh vườn thay màu hồng/xanh/tím, crop ba tỷ lệ rồi tính thành ba ý tưởng. Thay bằng công dụng khác: banner copy space, botanical border, landscape establishing view.

Bộ prompt TXT mẫu ở concept-recipes/spring-sakura/prompts.txt, nhập trực tiếp qua chức năng TXT hiện có. recipe.json là brief đề xuất cho R1, chưa phải schema import được hỗ trợ; không cho UI đọc file JSON này trước khi có validator.

## 7. Thứ tự nên thực thi

R0 đã xong. Làm R1 trước để người dùng nhập danh sách prompt có đầu ra rõ; tiếp R2 vì độ phân giải/provider là quyết định chặn stock. Sau đó R3–R5 tận dụng module đang có. Chỉ chạy pilot R6 sau khi quote/config và các gate đã rõ. Không gen thêm ảnh hay upload marketplace trong lượt nghiên cứu/gộp preset này.
