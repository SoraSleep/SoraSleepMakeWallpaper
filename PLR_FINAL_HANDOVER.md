# PLR — bàn giao kiểm thử cuối

## Kết quả

Đã gen mới một prompt bình tưới xanh sage với hoa cosmos trắng qua Image Dream đã cài. Nguồn 2048×2048 → tách nền → QA → cắt lề trong suốt → ZIP → cover, Markdown và JSON đăng bán. Mỗi prompt đúng một attempt, reservation 15 credit (không đồng nghĩa đã đo biến động ví). Luồng mất khoảng 106 giây, chưa tính kiểm tra UI sau đó.

Đã mở controller mới, resume workflow completed và xác nhận không tăng attempt. Test UI desktop/mobile tạo listing, reload giữ listing, mọi artifact tải HTTP200, hash khớp; không có page error. ZIP kiểm CRC/SHA đủ một ảnh. 46 backend regression, 9 frontend contract/prompt tests, build và workspace UI đều đạt. Test 500 chỉ là fixture; lượt thật lớn nhất trước đó là 15 prompt.

Output: `real-test-output/plr-final/review.html`. Ảnh là watercolor SFW, bố cục đầy đủ, nhìn contact sheet không thấy chủ thể bị cắt; vẫn cần duyệt PNG ở kích thước thật trước đăng.

## Các sửa đổi cuối

Listing đọc format và trạng thái alpha từ manifest thay vì luôn ghi PNG trong suốt. Không tự gán phong cách watercolor qua tags. Kiểm hash package trước tạo cover/mô tả; cover và Markdown có SHA256 và bị chặn khi bytes thay đổi. Test riêng xác nhận collection JPG giữ nền không bị mô tả nhầm thành clipart trong suốt.

## Cách dùng

1. Mở Image Dream với tài khoản có credit và mở MakeWallpaper tại http://127.0.0.1:5173/?studio=plr.
2. Nhập TXT/CSV prompt, kiểm số dòng và lựa chọn xử lý. Phong cảnh giữ nền; clipart mới bật tách nền.
3. Kiểm tra Manager, chọn collection, kiểm tra model/resolution và hạn mức. Chạy tự động đến ZIP.
4. Nếu cần dừng, dùng Pause; khi mở lại chọn collection cũ và Resume. Không tạo collection mới để thử lại một task chưa rõ kết quả.
5. Trong Duyệt & xuất gói, kiểm ảnh, lưu lựa chọn rồi đóng gói. Tải đủ mọi phần ZIP.
6. Nhấn Tạo bộ nội dung đăng bán để lấy cover, mô tả và tags. Chỉnh tiêu đề, nội dung và chính sách theo sản phẩm thực tế trước đăng.

## Giới hạn được xác nhận

Chưa benchmark gen thật 500 prompt liên tục. QA tự động phát hiện lỗi kỹ thuật/ảnh trùng, không thay thế duyệt hình. Cover hiện dùng tối đa 24 ảnh từ contact sheet. Kết quả thử nghiệm nằm trong store riêng dưới real-test-output; không tự chuyển vào thư viện production.
