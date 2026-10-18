# Preset 03 — Landscape Batch

## Mở đúng preset

Vào http://127.0.0.1:5173/?studio=text-to-image hoặc chọn mục03 Landscape Batch từ Projects. Đây là tạo ảnh phong cảnh tĩnh, giữ nền. Image Dream cần đang chạy và có tài khoản free sẵn sàng.

## Chuẩn bị và chạy

1. Nhập TXT/CSV hoặc dán1–500prompt. TXT mỗi dòng không trống là1prompt. CSV cần cột `prompt`, có thể thêm `title`/`group`; dùng ngoặc kép cho dấu phẩy/nhiều dòng. Mỗi prompt tối đa8000ký tự, file≤5MB. Dòng trùng vẫn giữ; không tự viết lại prompt.
2. Bấm **Đọc model free từ Image Dream**. Chọn model, độ phân giải và tỷ lệ được provider hỗ trợ. Landscape thường dùng16:9; có thể dùng3:2 hoặc tỷ lệ khác trong danh sách. 2K/4K là nhãn provider; kích thước pixel thật hiện sau khi tải.
3. Nhập ngân sáchcredits tối đa rồi **Lưu batch landscape**. Bước này lưu prompt/config, chưa gen. Cấu hình của batch đã lưu không đổi theo các ô nhập phía trên; muốn cấu hình khác thì tạo batch mới.
4. Bấm **Kiểm tra dự toán**. Kiểm số prompt còn lại, credits/lượt và hạn mức. Dự toán không chứng minh tổng số dư tài khoản đủ cho500ảnh. Free models vẫn có thể tiêu credits free của tài khoản.
5. Bấm **Chạy batch**. Giữ Manager, Image Dream và máy hoạt động. Bộ điều phối gửi tuần tự, lưu task identity và tải nguồn về.

## Dừng và khôi phục

- **Tạm dừng batch**: không gửi prompt mới; task đã gửi có thể vẫn tiếp tục bên Dreamina. **Tiếp tục batch** dùng lại task đã lưu.
- Khi mở lại trang, batch gần nhất được khôi phục. Batch cũ nằm trong **Batch landscape đã lưu**. Mở ứng dụng không tự gen.
- Khi có task chưa rõ kết quả, dùng **Đối soát task** sau khi bộ điều phối đã dừng. Không tạo batch mới chỉ để thử lại cùng task: có thể làm gen trùng.
- Lỗi hoặc thiếucredits: giữ run cũ, xem trạng thái; không tăng attempt tự động. Việc cấp/đổi tài khoản theo cơ chế của Image Dream.

## Gallery và lựa chọn

Mỗi trang24thumbnail nhỏ. Tìm prompt/title/group, lọc đã tải/đang chờ/lỗi/đã chọn. Mở ảnh lớn mới tải nguồn gốc; Escape đóng và trả focus. Thumbnail lỗi có nút thử lại, không gen lại ảnh.

Chọn/bỏ ảnh rồi **Lưu lựa chọn ảnh**. Chọn trang chỉ tác động24ảnh đang hiển thị. Bộ lọc Đã chọn dùng bản đã lưu. Thay lựa chọn không đổi nguồn hay prompt; cập nhật xung đột phiên khác bị chặn theo revision.

## Watermark

Mục **Remove watermark · Image Dream** dùng region editor sẵn có của Image Dream:chọn nguồn từ kho, chọn vùng, xem preview, duyệt và lưu PNG riêng. Giữ nguồn/kích thước, không tiêu thêm credit gen. Vùng rộng có thể bị nhòe hoặc tạo vệt hình học do thuật toánTelea; cần xem kỹ trước dùng. Bảnretouch hiện tải riêng, chưa tự thay source trong gallery/ZIP. Không mặc định ZIP là ảnh sạch watermark.

## Xuất file

Chọn **Ảnh đã chọn và lưu** hoặc **Toàn bộ ảnh đã tải**. Đặt tên gói, giới hạn1–1000MB/phần. Tải đủ mọi ZIP. Các phần độc lập, giải nén vào cùng thư mục. Số ảnh thiếu/bỏ chọn hiện rõ; batch chưa đủ500không được coi là500ảnh hoàn tất.

Gói gồm ảnh gốc nguyênbytes,`manifest.json`,`README.txt`,`checksums.sha256`. Manifest ghi cấu hình, kích thước thật, SHA256 vàordinal. Prompt không kèm mặc định. Chỉ bật **Kèm prompt gốc** khi cần bản creator. Hủy xuất dừng ở checkpoint; xuất lại không gen lại.

## Phạm vi kiểm chứng

Xem evidence dưới `real-test-output/text-to-image-b5`. Kiểm thử500prompt nhập/điều phối/gallery/ZIP bằngfixture khác với500lượt gen thật. Chưa benchmark500gen liên tục; nên bắt đầu lô nhỏ và tăng dần. Duyệt nội dung/chi tiết ở kích thước thật trước sử dụng hoặc bán.

B5 đã chạy13prompt mới ởhai tỷ lệ:12ảnh2560×1440 và1ảnh2496×1664,13/13mỗiảnh1attempt;3ZIPđạtCRC/SHA. Lô10prompt mất8.55phút trong một phiên test, có một lượtproviderdownloadchậm rồi hoàn tất. Tổngreservation65credit; không coi là số biến động ví đã đo. Kết quả thử nghiệm dùng store riêng, không tự đưa vào thư viện production.
