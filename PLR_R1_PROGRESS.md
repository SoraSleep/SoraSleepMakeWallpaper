# Preset 02 — PLR Collection Studio · R1.1

## Cập nhật sau khi người dùng chốt file prompt làm đầu vào

TXT/CSV nay là luồng chính ở đầu trang. Giữ prompt/thứ tự, báo trùng và chỉ skip khi chọn, phân trang50, chuẩn bị batch100, lưu/khôi phục danh sách và export JSON có processing recipe. Concept/series bên dưới là tùy chọn. Recipe phân biệt ảnh giữ nền và PNG clipart yêu cầu tách nền; đây chưa phải engine xử lý.

Đã test import500prompt fixture, skip1bảntrùng thành499mục/5batch, persistence, malformed import giữ danh sách, recipe clipart/Etsy, viewport390 không overflow và không POST. 4/4 tests parser/recipe; build và regression Reveal đạt. Không có500lượtgenảnh thật. Generation/segmentation/pack chưa nối end-to-end; JSON đang awaiting-manager-integration.

Kế hoạch hiện hành: [PLR_AUTOMATION_PLAN.md](PLR_AUTOMATION_PLAN.md). Ưu tiên P02.2 nối Manager, thay cho việc tự tạo prompt theo nhóm. Bằng chứng: real-test-output/plr-prompt-import/report.json.

Ngày 17/10/2026. Đã hoàn thành bước đầu: brief và phân bổ series, trong source/dist MakeWallpaper. Chưa cài đè ứng dụng production hoặc nối generation Manager.

## Phạm vi đã thực hiện

- Hai điểm vào ở trang chủ và thư viện: 01 Reveal Studio / 02 PLR Collection Studio. PLR là workflow ảnh tĩnh riêng, không thêm ID vào schema renderer wallpaper hoặc bắt buộc ảnh B.
- Link trực tiếp: http://127.0.0.1:5173/?studio=plr .
- Brief: tên bộ, concept, style chung, palette, exclusions, mục đích người mua, tỷ lệ, số ảnh cuối cần đạt.
- Mẫu mặc định Spring Sakura 500 ảnh, 10 nhóm × 50 ảnh. Có thêm/xóa nhóm, sửa tên/mô tả/số ảnh, chia đều có phân bổ phần dư chính xác.
- Kế hoạch tối đa 5.000 ảnh và 50 nhóm là giới hạn dữ liệu planning, không phải khả năng generation một batch. UI không có nút gửi job.
- Cảnh báo thiếu brief, số lượng không nguyên/hợp lệ, tổng nhóm lệch mục tiêu, nhóm trùng mô tả chuẩn hóa. Export JSON chỉ bật khi kế hoạch hợp lệ. Cho phép lưu draft còn thiếu nội dung để sửa tiếp.
- Xem trước một prompt mẫu cho từng nhóm, ghép subject và brief có thể xem được. Chưa tạo prompt từng ảnh, không nhận định 500 prompt đã khác nhau/chất lượng đạt.
- Lưu thủ công vào localStorage có revision, mở lại trên cùng trình duyệt/origin; xuất/nhập JSON độc lập. Parse schema/giới hạn text/ID; loại field lạ, không đọc JSON thành lệnh thực thi hoặc tự cấp quyền thương mại. File import tối đa 500 KB; file sai không ghi đè draft đang làm.
- Ghi chú phạm vi PLR chỉ là nháp nội dung license. Chưa đánh dấu nguồn có quyền cấp PLR, chưa cấp giấy phép cho người mua.
- Layout responsive được kiểm tra ở desktop 1440px và viewport 390px, sửa min-width body chỉ trong PLR để không ảnh hưởng editor cũ.

## Kiểm tra

- npm run build: TypeScript và Vite production build đạt.
- npm run test:plr-plan: 5/5 tests đạt (tổng ảnh, phần dư, giới hạn, duplicate, JSON schema/field lạ, prompt preview).
- npm run test:plr-ui: Edge trên dist, vào từ home/library, 503 ảnh phân bổ chính xác, save/reload, export/import, invalid import giữ draft, search PLR, viewport nhỏ không overflow; 0 POST request, không gọi generation/không tiêu credits.
- npm run test:reveal-studio: regression đạt sau thêm card PLR, đổi hai mode wizard/editor và khôi phục mode sau reload vẫn hoạt động.
- Bằng chứng: real-test-output/plr-r1/report.json; desktop.png; mobile-layout.png; plan.json (fixture 503 ảnh); real-test-output/reveal-studio/report.json.
- Xác nhận quyền ở regression Reveal chỉ là fixture kiểm gate, không xác nhận quyền cho ảnh test. JSON mẫu chỉ là kế hoạch, không phải ảnh hay bộ hàng hóa đã bán được.

## Các bước tiếp theo, theo concept người dùng đã chốt

R1.2: Scene sheet theo từng ảnh. Chia danh sách prompt cho từng nhóm, giữ prompt gốc/effective prompt, subject/composition/use case riêng, ID ổn định, phát hiện trùng. Không lặp cùng prompt 50 lần rồi gọi là series đa dạng. Import danh sách prompt TXT/CSV và phân bổ đúng nhóm. Đổi brief làm stale scene sheet đã duyệt.

R1.3: Nối kế hoạch đã duyệt vào Manager và quote. Manager hiện giới hạn tối đa 100 scene mỗi collection import, không tăng giới hạn mù; thiết kế parent PLR collection với các batch con <=100 có ID/chỉ mục và trạng thái tổng hợp. 500 ảnh được duyệt có thể cần nhiều hơn 500 lần gen, ngân sách/quote phải dựa trên từng attempt.

R2: Kiểm chứng model/size/provider thực tế, native decode và chất lượng; chọn cấu hình phù hợp art pack, không áp stock marketplace vào PLR một cách máy móc. Theo dõi nguồn/derivative từ công cụ Image Dream hiện có và quyền cấp lại PLR riêng.

R3–R5: checkpoint/resume không gen trùng, review/reject/bổ sung số ảnh, near-duplicate, master/metadata/license, contact sheet, listing preview và ZIP chia phần cho toàn bộ series. Tận dụng queue, final asset picker và ZIP C3 hiện có.

Ưu tiên kế tiếp là R1.2. Chưa gen ảnh mới, chưa tạo bộ 500 ảnh, chưa xuất ZIP sản phẩm hoặc tự đăng bán trong R1.1.
