# C0 — nền tảng workflow theo concept

Ngày: 16/10/2026. Hoàn thành trong source MakeWallpaper và Manager; chưa đóng gói/cài đè ứng dụng production.

## Đã làm
- Sao lưu các file bị chỉnh vào D:/SoraSleep Main/Data/Manager/DevelopmentBackups/C0-20261016 trước khi sửa.
- Thêm contract workflow version 1: pair-reveal (legacy), landscape, stock, character-wardrobe (SFW).
- Tách workflowType, collectionId, concept, exportProfile khỏi presetId.
- Landscape và stock lập kế hoạch một ảnh, không yêu cầu variantChange/B/mask/reveal preset. Chặn payload trộn sai thay vì âm thầm bỏ qua.
- Stock dùng chỉ dẫn ảnh stock riêng; không bắt buộc bố cục UI wallpaper.
- Đọc revision kế hoạch cũ với mặc định pair-reveal; không viết lại byte của revision cũ. Giữ concept/collection khi sửa revision.
- Manager chuyển đúng workflow đến planner, trạng thái ảnh đơn là needs_image_review; A/B vẫn needs_pair_review.
- Giữ cơ chế không gửi trùng khi request chưa rõ kết quả. Idempotency của queue cũ vẫn dùng được sau khi thêm trường mới.
- Nếu planner cũ không hiểu workflow mới, chặn trước generate, kể cả khi tiếp tục job lần sau.
- Biểu mẫu hai ứng dụng có workflow selector; ẩn trường B và preset reveal ở landscape/stock, hiện lại ở character/A-B.
- Capabilities công khai phạm vi planning mới; singleImageMotion=false, chưa quảng cáo motion renderer mới.

## Kiểm tra đạt
- MakeWallpaper: 15/15 bridge/planner/store/render contract tests.
- Manager: 146/146 toàn bộ desktop test suite, gồm 19 bài integration queue/client.
- TypeScript và build cả hai ứng dụng đạt.
- Edge headless + HTTP planner thật với kho tạm: tạo/lưu/reopen landscape và stock, revision đúng workflow, character có điều khiển B, không lỗi JS.
- Manager UI qua IPC fixture: đổi workflow, B ẩn/hiện, review gate reset, landscape/stock submit không có preset hoặc variantChange.
- C0 không gọi generate thật, không dùng credits và không thay tài khoản Image Dream.

## Chưa thuộc C0
- C1: collection library, wizard brief, import TXT/CSV, chỉnh danh sách prompt, budget UI và shortlist.
- C2: renderer phong cảnh một ảnh và motion recipes.
- C3: stock metadata, profile kênh, chọn bản chỉnh đã duyệt từ Image Dream, tối ưu/chia gói.
- C4: masked wardrobe generation được xác minh thực tế. Hiện mới có workflow/plan SFW và luồng A hiện hữu.
- C5: chạy trên host/thiết bị thật, đóng gói và phát hành pilot.

## Bằng chứng
- real-test-output/c0/ui-report.json
- real-test-output/c0/stock-plan.png
- real-test-output/manager-wallpaper/ui-report.json

Một số cảnh báo build OpenCV fs/crypto externalized và worker lớn đã tồn tại trước C0; chưa phải phần tối ưu renderer ở bước này.
