# Kế hoạch định dạng và xuất wallpaper thương mại

## 1. Quyết định sản phẩm

Đầu ra chính nên là **Commercial Web Wallpaper Bundle**: một file ZIP chứa Web Wallpaper chạy hoàn toàn offline trong Wallpaper Engine trên Windows.

Đây là lựa chọn phù hợp nhất cho hiệu ứng đang xây dựng vì runtime Web hỗ trợ trực tiếp:

- bắt vị trí chuột;
- zoom đồng bộ ảnh A và B;
- shader/WebGL để chỉ hiện phần khác biệt của ảnh B bên trong vùng kính;
- cấu hình bán kính, độ phóng đại, độ mềm biên và FPS;
- nhiều tỉ lệ màn hình mà không phải render trước thành video.

Không chọn MP4 làm định dạng chính vì video không giữ được tương tác con trỏ. Không chọn `.mpkg` làm định dạng PC vì đây là gói do Wallpaper Engine tạo để chuyển sang Android. Không chọn `scene.pkg` làm MVP vì định dạng Scene đóng gói theo hệ sinh thái editor của Wallpaper Engine, khó tạo và kiểm thử độc lập hơn runtime Web.

## 2. Danh mục đầu ra

| Profile | File giao cho khách | Tương tác | Mục đích |
|---|---|---:|---|
| WE Interactive | `ProductName-WE-v1.0.0.zip` | Có | Sản phẩm chính cho Wallpaper Engine trên Windows |
| Video Loop | `ProductName-Loop-4K.mp4` | Không | Bản dự phòng, trailer, màn hình không chạy Web Wallpaper |
| Static | `ProductName-4K.jpg` hoặc `.png` | Không | Ảnh nền tĩnh và ảnh quảng bá |
| Android guide | `ANDROID-INSTALL.html` | Tùy thiết bị | Hướng dẫn người mua dùng Wallpaper Engine Windows để chuyển/xuất `.mpkg` |

Có thể bán ba tier:

1. **Standard**: ZIP tương tác 1440p + JPG.
2. **4K**: ZIP tương tác dùng texture 4K + MP4/JPG 4K.
3. **Collection**: nhiều wallpaper cùng giấy phép, mỗi wallpaper có `productId` riêng.

## 3. Cấu trúc gói bán

```text
ProductName-WE-v1.0.0.zip
├─ wallpaper/
│  ├─ project.json
│  ├─ index.html
│  ├─ manifest.json
│  ├─ runtime/
│  │  ├─ app.min.js
│  │  └─ app.css
│  ├─ assets/
│  │  ├─ image-a.webp
│  │  ├─ image-b.webp
│  │  ├─ difference-mask.webp
│  │  └─ preview.jpg
│  └─ licenses/
│     └─ THIRD-PARTY-NOTICES.txt
├─ INSTALL.html
├─ LICENSE.txt
├─ CHANGELOG.txt
├─ checksums.sha256
└─ preview.mp4
```

`wallpaper/` là thư mục chạy thật. Các tài liệu cài đặt và trailer nằm ngoài runtime để không làm tăng bộ nhớ khi wallpaper hoạt động.

### `project.json`

File này mô tả wallpaper cho Wallpaper Engine:

```json
{
  "title": "Product Name",
  "type": "web",
  "file": "index.html",
  "preview": "assets/preview.jpg",
  "general": {
    "properties": {
      "lensRadius": {
        "text": "Lens size",
        "type": "slider",
        "value": 0.16,
        "min": 0.06,
        "max": 0.35,
        "precision": 2
      },
      "zoom": {
        "text": "Magnification",
        "type": "slider",
        "value": 1.18,
        "min": 1,
        "max": 1.6,
        "precision": 2
      }
    }
  }
}
```

Schema chính xác phải được validator so với phiên bản Wallpaper Engine đang hỗ trợ. Tên property trong `project.json` phải trùng với handler của runtime.

### `manifest.json` của app

Đây là metadata do Motion Pair Studio quản lý, tách khỏi `project.json`:

```json
{
  "schemaVersion": 1,
  "productId": "studio.vendor.product-slug",
  "version": "1.0.0",
  "edition": "4k",
  "renderMode": "difference-lens",
  "canvas": { "width": 3840, "height": 2160 },
  "offline": true,
  "assets": {
    "imageA": "assets/image-a.webp",
    "imageB": "assets/image-b.webp",
    "differenceMask": "assets/difference-mask.webp"
  }
}
```

## 4. Logic runtime được đóng gói

App editor thực hiện toàn bộ bước nặng trước khi xuất:

1. Chuẩn hóa màu và orientation của A/B.
2. Căn chỉnh B về hệ tọa độ của A.
3. Tạo difference mask, confidence mask và correction mask.
4. Bake kết quả thành texture tối ưu.
5. Đóng runtime WebGL nhỏ, không có model AI và không cần Internet.

Runtime chỉ cần thực hiện mỗi frame:

```text
pointer -> smoothing -> lens center
uv      -> synchronized zoom transform
lens    = circleSDF(uv, center, radius, feather)
base    = sample(A, uv)
lensA   = sample(A, zoomUV)
lensB   = sample(B, zoomUV)
reveal  = lens * sample(differenceMask, zoomUV) * sample(confidenceMask, zoomUV)
inside  = mix(lensA, lensB, reveal)
color   = mix(base, inside, lens)
```

Cách này bảo đảm bên ngoài kính luôn là A ở tỉ lệ bình thường. Bên trong kính là A đã phóng đại, và B chỉ hiện tại pixel được difference mask xác nhận. A, B và mask trong kính dùng cùng một phép biến đổi UV nên điểm khác biệt không bị trượt.

## 5. Chuẩn asset

### Texture

- Ảnh A/B: WebP lossy chất lượng cao hoặc WebP lossless tùy loại tranh.
- Mask liên tục: WebP lossless hoặc PNG grayscale; kiểm tra banding trước khi phát hành.
- Preview: JPG hoặc WebP kích thước nhỏ.
- Giữ mọi asset ở local; không dùng CDN, font online, analytics hoặc API bên ngoài.
- Bake ảnh về đúng không gian màu sRGB và xóa metadata không cần thiết.

### Preset độ phân giải

| Preset | Kích thước nguồn khuyên dùng | Mục tiêu |
|---|---:|---|
| 1080p | 1920×1080 | máy phổ thông |
| 1440p | 2560×1440 | bản Standard |
| 4K | 3840×2160 | bản Premium |
| Ultrawide | 3440×1440 | sản phẩm thiết kế riêng 21:9 |

Không tự động kéo ảnh 16:9 thành 21:9. App phải cho chọn `cover`, safe crop hoặc xuất riêng một composition ultrawide.

## 6. Trải nghiệm Export trong app

### Bước 1 — Product

- Product title, creator/publisher, product ID.
- Version theo Semantic Versioning.
- Edition và storefront SKU.
- Ảnh preview, mô tả ngắn, copyright notice.

### Bước 2 — Compatibility

- Windows + Wallpaper Engine Web.
- Resolution preset và aspect-ratio policy.
- FPS mặc định và giới hạn chất lượng.
- Tùy chọn pause/mute theo state do Wallpaper Engine gửi vào runtime.

### Bước 3 — Buyer controls

- Lens size.
- Magnification.
- Edge softness.
- Pointer smoothing.
- Reveal intensity.
- Quality/FPS preset.

Mỗi control phải có khoảng giá trị an toàn do tác giả giới hạn để người mua không làm lộ mép ảnh hoặc gây sampling ngoài texture.

### Bước 4 — License

- Chọn template Personal Use hoặc Commercial Display.
- Khai báo quyền với A, B, font, nhạc và mọi asset khác.
- Sinh `LICENSE.txt` và `THIRD-PARTY-NOTICES.txt`.
- Chặn export thương mại khi asset còn trạng thái `rights: unknown`.

### Bước 5 — Validate và Package

- Build runtime production.
- Hash toàn bộ file.
- Chạy validation matrix.
- Sinh ZIP bằng đường dẫn tương đối, không chứa file nguồn editor.
- Sinh `INSTALL.html` và product report.

UI kết thúc hiển thị ba hành động: **Open package**, **Test in Wallpaper Engine**, **Copy storefront details**.

## 7. Validation bắt buộc

Một gói chỉ được đánh dấu `Ready to sell` khi đạt:

- `project.json`, `manifest.json` hợp lệ và mọi asset được tham chiếu tồn tại;
- `index.html` khởi động offline, không phát sinh request mạng;
- A/B/mask có cùng hệ tọa độ và không xuất hiện viền rỗng khi zoom cực đại;
- reveal đúng ở 16:9, 21:9 và 32:9 theo policy đã chọn;
- runtime đọc FPS từ Wallpaper Engine và không chạy vòng lặp thừa;
- pointer rời màn hình, nhiều màn hình và DPI scaling không làm lens nhảy;
- texture nằm dưới budget đã đặt cho từng preset;
- đóng/mở wallpaper 20 lần không làm tăng listener, WebGL context hoặc bộ nhớ;
- ZIP giải nén sạch, checksum đúng và đường dẫn không vượt ra ngoài thư mục đích;
- không có source image, cache, thumbnail tạm, token, đường dẫn máy tác giả hoặc metadata nhạy cảm.

## 8. Cài đặt cho người mua

### MVP: ZIP thủ công

1. Người mua cài và sở hữu Wallpaper Engine trên Steam.
2. Tải và giải nén ZIP.
3. Mở Wallpaper Engine → Create Wallpaper → Open from File.
4. Chọn `wallpaper/index.html`, hoặc mở project theo luồng được phiên bản Wallpaper Engine hỗ trợ.
5. Chọn wallpaper và chỉnh Lens/Zoom trong Properties.

Đây là cách ít lỗi antivirus nhất và không cần app bán hàng ghi vào thư mục hệ thống.

### Giai đoạn sau: installer có chữ ký

Có thể bổ sung `Install-Wallpaper.exe` để:

- xác định thư mục Wallpaper Engine;
- xác minh checksum và chữ ký của gói;
- copy vào thư mục library do người dùng chọn;
- gọi CLI chính thức của Wallpaper Engine để mở wallpaper;
- lưu uninstall manifest.

Installer chỉ nên phát hành khi có code signing certificate và quy trình update/uninstall hoàn chỉnh. Không đóng gói hoặc phân phối lại phần mềm Wallpaper Engine.

## 9. Bán hàng, Workshop và cập nhật

- Bán ZIP qua storefront hỗ trợ file số và cập nhật phiên bản như itch.io, Gumroad hoặc cửa hàng riêng.
- Trang bán dùng `preview.mp4`, ảnh so sánh A/B, cấu hình tối thiểu và hướng dẫn cần sở hữu Wallpaper Engine.
- Wallpaper Engine Workshop phù hợp cho demo hoặc bản rút gọn miễn phí; tài liệu Steam/Wallpaper Engine mô tả Workshop wallpaper là nội dung chia sẻ miễn phí.
- Mỗi release là file bất biến `ProductName-WE-v1.2.0.zip`; storefront thông báo bản mới cho người đã mua.
- `productId` giữ nguyên, `version` tăng; không dùng cơ chế tự tải code từ server để giữ cam kết offline.

## 10. Giấy phép và quyền nội dung

App cần quản lý provenance cho từng asset:

```text
asset owner | license source | commercial use | modification | attribution | proof file
```

Chỉ gắn nhãn `Commercial-ready` khi người bán sở hữu hoặc có giấy phép thương mại cho cả hai ảnh, nhân vật, logo, font, âm thanh và texture. Ảnh fan art hoặc nhân vật anime có bản quyền không mặc nhiên được phép bán chỉ vì người dùng đã chỉnh sửa hoặc tạo chuyển động.

Giấy phép sản phẩm mẫu nên cho phép người mua:

- dùng wallpaper trên thiết bị cá nhân của họ;
- giữ bản backup cá nhân;
- nhận update theo điều khoản cửa hàng.

Và cấm:

- bán lại, chia sẻ hoặc upload gói lên Workshop/kho khác;
- tách asset để dùng trong sản phẩm khác;
- công bố bản sửa đổi như một sản phẩm mới.

Mẫu license phải được luật sư tại thị trường bán kiểm tra trước khi dùng ở quy mô thương mại.

## 11. Chống sao chép thực tế

Web Wallpaper dễ cài đặt và phù hợp hiệu ứng, nhưng file HTML/JS/asset có thể được người mua truy cập. Không nên quảng cáo định dạng này là DRM hoặc “không thể giải nén”.

Biện pháp hợp lý:

- bundle và minify runtime;
- bỏ toàn bộ source map/source project;
- manifest có product ID, version và checksum;
- watermark ẩn riêng theo đơn hàng nếu storefront cho phép tạo build tự động;
- điều khoản license rõ ràng và quy trình takedown;
- tập trung giá trị vào art hợp pháp, collection, update và hỗ trợ.

Không nên thêm phone-home bắt buộc. Nó làm wallpaper mất khả năng offline, tạo rủi ro riêng tư và khiến sản phẩm ngừng chạy nếu server đóng.

## 12. Lộ trình build

### Milestone A — Export contract

- Chốt schema `manifest.json` và `project.json` adapter.
- Tạo runtime template chạy A/B/difference mask.
- Export ZIP tái lập được: cùng input tạo cùng cấu trúc và checksum.

### Milestone B — Commercial Export UI

- Product, Compatibility, Buyer Controls, License, Validate.
- Rights ledger cho asset.
- Preset Standard/4K/Ultrawide.

### Milestone C — Validator

- Schema, asset, offline-network và texture-budget checks.
- Render matrix và ảnh chụp golden frame.
- Smoke test bằng Wallpaper Engine CLI trên máy Windows test.

### Milestone D — Store package

- Sinh license/install/changelog/storefront copy.
- MP4 trailer và ảnh preview.
- Release report cùng SHA-256.

### Milestone E — Signed installer, tùy chọn

- Chỉ làm sau khi ZIP MVP đã bán ổn định.
- Detect/copy/open/uninstall.
- Code signing, antivirus matrix và rollback.

## 13. Nguồn chính thức dùng để ra quyết định

- Wallpaper Engine, Getting started with Web Wallpapers: https://docs.wallpaperengine.io/en/web/first/gettingstarted.html
- Wallpaper Engine, User properties: https://docs.wallpaperengine.io/en/web/customization/properties.html
- Wallpaper Engine, FPS limiter: https://docs.wallpaperengine.io/en/web/performance/fps.html
- Wallpaper Engine, Command line controls: https://help.wallpaperengine.io/en/functionality/cli.html
- Wallpaper Engine Steam store page: https://store.steampowered.com/app/431960/Wallpaper_Engine/
- Wallpaper Engine, Editing downloaded wallpapers: https://help.wallpaperengine.io/en/functionality/editingwallpapers.html
- Wallpaper Engine, Mobile pairing and `.mpkg`: https://help.wallpaperengine.io/en/mobile/pairing-fixes.html
- Steam Subscriber Agreement, Workshop Contributions: https://store.steampowered.com/subscriber_agreement/
