# C1 — collection, brief và danh sách prompt

Hoàn thành trong source Manager ngày 16/10/2026. Đã build; chưa cài đè bản production hoặc restart Manager đang dùng.

## Chức năng
- Collection studio ba bước: Concept → Prompts → Duyệt batch.
- Brief chung: tên bộ, mùa/dịp, chủ đề, cảm xúc, palette, style guide, workflow, tỷ lệ, ngân sách batch.
- Nhập TXT hoặc CSV chuẩn có cột prompt, title tùy chọn; CSV hỗ trợ dấu phẩy, quote escape và nội dung nhiều dòng.
- Giới hạn file nhập 24 KB, collection payload 30 KB, tối đa 100 scene. Giới hạn IPC hiện hữu được giữ nguyên.
- Chỉnh tên/prompt từng scene; chọn/bỏ chọn/xóa scene. Prompt trùng được giữ để sửa, chặn shortlist trùng khi thực thi.
- Collection lưu revision bất biến; revision mới có request identity mới. Nạp lại cùng revision với cùng cấu hình không tạo batch trùng.
- Snapshot collection được backend đọc lại trước tạo queue; UI không thể âm thầm đổi prompt/brief của revision đã lưu.
- Brief và collection/scene IDs đi theo từng plan/job. Kế hoạch đã chạy giữ nguyên khi collection được sửa.
- Bản nháp được giữ local, collection đã lưu nằm tại Data/Manager/WallpaperCollections. Tải lại thư viện không thay bản nháp đang sửa.
- Gallery nhóm theo collection, revision và scene; đọc thumbnail qua IPC được ràng buộc với asset của task, giữ CSP chặt.
- Giữ/loại/chờ shortlist từng ảnh có audit riêng và tồn tại sau mở lại. Shortlist không đồng nghĩa duyệt chất lượng, quyền hoặc sẵn sàng bán.
- Batch collection dùng ngân sách tối đa: báo giá thật trước từng lượt, giữ khoản đã dispatch kể cả chưa rõ kết quả; không tự hoàn khoản chưa xác minh. Backend cũ thiếu quote đã xác minh bị chặn khi dùng budget.
- Ngân sách áp dụng từng batch. Revision mới có ngân sách batch mới, không phải giới hạn tài khoản trọn đời.

## Kiểm tra
- Toàn bộ Manager desktop suite: 152/152 đạt.
- TypeScript và Vite build đạt.
- Test UI Edge dùng collection store và queue.create thật trong thư mục tạm: brief, ngân sách, nhập TXT, gate trùng, chỉnh scene, shortlist, revision, nạp queue, reopen và chống tạo batch trùng đạt. Provider generation không chạy.
- CSV parser test đạt quoted commas/multiline/escaped quotes và các trường hợp lỗi.
- Budget tests dùng provider boundary fixture: quote tăng làm dừng trước vượt cap; unknown submission giữ reservation sau restart.
- Thumbnail read-only từ Image Dream đang cài port 17897 đạt, chặn asset ngoài task và kiểm tra cache. Không gen mới, không tiêu credits.
- Luồng UI C0 cũ kiểm tra lại đạt.

## Bằng chứng
- real-test-output/c1/ui-report.json
- real-test-output/c1/collection-review.png
- real-test-output/c1/collection-compact.png
- real-test-output/c1/thumbnail-report.json
- Backup trước thay đổi: D:/SoraSleep Main/Data/Manager/DevelopmentBackups/C1-20261016

## Bước tiếp theo
C2: renderer phong cảnh một ảnh, recipe Sakura particles, vùng nước và ánh sáng, khóa vùng bảo vệ, loop preview và xuất. C1 chưa có renderer một ảnh hoặc xác nhận bán hàng/thiết bị thật.
