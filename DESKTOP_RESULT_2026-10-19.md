# Kết quả cài desktop — 19/10/2026

Đã cài SoraSleep MakeWallpaper **1.0.1** theo tài khoản Windows hiện tại, bằng bộ cài NSIS. Installer trả mã0; Windows ghi nhận phiên bản1.0.1 và có shortcut ở Desktop/Start Menu. Mã nguồn đóng gói: `3d33ea3`.

## Bộ cài

- File: `SoraSleep-MakeWallpaper-Setup-1.0.1.exe`.
- Dung lượng:545,018,024 byte.
- SHA-256: `06ac5d555134ed63d9fc479337b29ac534912b71a3092f8085205b388f744928`.
- Kèm Electron, Node, FFmpeg/FFprobe, Python và model BiRefNet lite. Image Dream vẫn là ứng dụng provider riêng, dùng tài khoản/credits có sẵn.
- File installer và test media được giữ cục bộ, không đưa vào Git.

## Kiểm tra bản đã cài

Đã chạy smoke test trực tiếp trên executable trong `%LOCALAPPDATA%\Programs\SoraSleepMakeWallpaper`, dùng kho tạm và PATH giới hạn:

- **6.320 file payload** khớp SHA-256 sau cài đặt.
- FFprobe đọc đúng ảnh gốc2560×1440; FFmpeg đóng gói tạo thumbnail thành công.
- Python3.12.14 và model đóng gói thực hiện inference thật, xuất PNG giữ kích thước2560×1440.
- Electron mở được ba studio. Đây là kiểm tra điểm vào/giao diện, không phải chạy lại toàn bộ batch500 ảnh.
- WebGL2 hoạt động. WebCodecs mã hóa10 frame H.264720×1280, được FFprobe đóng gói đọc lại đúng codec/kích thước. Chưa chứng nhận playback trên mọi thiết bị điện thoại.
- Tải file từ renderer thành công, kiểm tra nội dung file sau lưu.
- Giao diện Landscape không tràn ngang ở390px; không có page error trong bài test.
- Renderer không có `window.require`; Node integration tắt, sandbox/context isolation bật.
- Đóng khi rảnh: backend thuộc desktop thoát, không còn API mồ côi.
- Không gửi yêu cầu gen mới, không dùng thêm credits tạo ảnh.
- Build frontend và76 test Manager integration đạt; kiểm tra runtime/mirror và trạng thái QA cũng đạt.

Bản thử1.0.0 bị chặn chốt release vì thiếu hai launcher ARM không dùng của pip sau cài đặt. Bản1.0.1 loại pip/ensurepip khỏi runtime cố định và được cài nâng cấp lại; toàn bộ payload sau đó khớp. Không bỏ qua lỗi checksum.

## Sử dụng và giới hạn

- Ứng dụng desktop đã được mở với kho dữ liệu riêng tại `%APPDATA%\SoraSleepMakeWallpaper`. Lịch sử Manager và project trong trình duyệt cũ không tự di chuyển sang kho này; giữ nguyên nguồn cũ và import project khi cần.
- Menu Ứng dụng mở thư mục dữ liệu hoặc Image Dream. Khi gen ảnh, Image Dream cần chạy ở cổng17897. Studio dùng17880 và API desktop dùng17932.
- Dữ liệu nằm ngoài thư mục chương trình; cấu hình NSIS giữ dữ liệu khi gỡ. Bài kiểm tra này xác minh cài/nâng cấp và khởi động; chưa thực hiện bài gỡ cài đặt với một kho dữ liệu quý đang sử dụng.
- Bộ cài chưa ký số, chưa kiểm thử trên Windows VM sạch và chưa có cập nhật tự động/rollback.
- Tách nền CPU có thể mất thời gian khi tải model lần đầu. Inference thành công không chứng nhận chất lượng mỹ thuật của mask.
- Các giới hạn output/QA và quy mô gen thật50 ảnh vẫn theo báo cáo pipeline; chưa có chứng nhận chạy thật100/500 prompt.

Bằng chứng cục bộ: `real-test-output/landscape-upgrade/desktop-report.json`, `desktop-installed.png`, `desktop-installed-mobile.png` và file SHA-256 bên cạnh installer trong `release-output`.
