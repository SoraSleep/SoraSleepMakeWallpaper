# Motion Pair Studio — Master Build Plan

## 1. Product contract đã hiệu chỉnh

### Trải nghiệm cốt lõi

Người dùng đưa vào hai ảnh:

- **A — Base:** ảnh luôn hiển thị trên desktop.
- **B — Variant:** gần giống A nhưng có một hoặc nhiều chi tiết khác.

Khi di chuột, một kính phóng đại đi theo con trỏ:

1. Ngoài kính luôn hiển thị ảnh A ở tỉ lệ bình thường.
2. Trong kính hiển thị A đã phóng đại.
3. Chỉ tại vùng được đánh dấu khác biệt, pixel của B đã phóng đại mới thay thế A.
4. Khi kính rời điểm khác biệt, người xem chỉ thấy A được phóng đại.
5. Khi chuột rời màn hình, kính mờ dần rồi biến mất.

Đây là mode bắt buộc cho MVP và được gọi là **Difference Lens**. Ambient animation, Hybrid và Morph là module bổ sung sau khi sản phẩm cốt lõi đã ổn định.

### Công thức render chuẩn

Với `uv` là tọa độ màn hình và `zoomUV` là tọa độ phóng đại quanh tâm kính:

```text
base       = A(uv)
lensA      = A(zoomUV)
lensB      = B_aligned(zoomUV)
lensMask   = smoothCircle(uv, pointer, radius, feather)
diff       = DifferenceMask(zoomUV)
valid      = ValidityMask(zoomUV)
insideLens = mix(lensA, lensB, diff * valid)
final      = mix(base, insideLens, lensMask)
```

`DifferenceMask` là mask có chủ đích do app đề xuất và người bán xác nhận. Không dùng trực tiếp `abs(A-B)` làm đầu ra vì nhiễu nén, lệch sáng và sai số alignment cũng sẽ bị coi là khác biệt.

### Quyết định kỹ thuật

- MVP dùng WebGL 2/Web Wallpaper offline.
- Global alignment và manual correction nằm trên critical path.
- Difference mask tự động cùng brush Reveal/Erase/Protect nằm trên critical path.
- Dense optical flow chỉ dùng cho Hybrid/Morph ở phiên bản sau.
- Export chính là ZIP Web Wallpaper thương mại.
- Editor và runtime dùng chung shader để preview giống file bán ra.

## 2. Kiểm tra mức phù hợp hiện tại

| Thành phần | Trạng thái hiện tại | So với logic chuẩn | Việc cần làm |
|---|---|---|---|
| UI desktop | Có prototype chuyên nghiệp | Phù hợp hướng sản phẩm | Giữ layout, hoàn thiện state thật |
| Import A/B | Có file picker và preview | Mới ở mức trình diễn | Thêm decode, validate, project state |
| Lens theo chuột | WebGL 2, smoothing và fade đã chạy | Đúng logic | Host/DPI validation ở P7/P9 |
| Reveal B | B được nhân với difference mask trong lens | Đúng logic | Bake mask vào package ở P7 |
| Magnification | `zoomUV` hoạt động quanh tâm lens | Đúng logic | Kiểm tra thêm trên multi-monitor |
| Alignment | ORB + RANSAC worker và manual correction | Đã triển khai ở P3 | Bổ sung quality fixtures ở P9 |
| Difference view | Multi-scale mask, heatmap và brush edit | Đã triển khai ở P4 | Tối ưu preset theo art style |
| Flow/Morph | Chỉ là demo UI | Không cần cho MVP | Chuyển sang P2 |
| Export | Chỉ là màn hình mô phỏng | Chưa bán được | Sinh runtime, project.json và ZIP |
| Commercial checks | Đã có backlog/tài liệu | Đúng hướng | Tích hợp vào Export wizard |

Kết luận kiểm tra: **ý tưởng và bố cục UI phù hợp, implementation preview hiện tại chưa đúng logic cuối**. Nó đang là `B × circularMask trên A`; sản phẩm cần `magnified A trong lens + B × differenceMask trong lens`.

## 3. Kế hoạch thực hiện theo thứ tự

Estimate là ngày làm việc của một developer đã quen TypeScript/WebGL/OpenCV. Tổng MVP bán được khoảng **40–55 ngày**, chưa tính thời gian tạo art và kiểm tra pháp lý.

## Phase 0 — Khóa scope và mẫu chuẩn, 2 ngày

### T0.1 — Khóa Definition of Done

- Chỉ giữ Difference Lens trong MVP.
- Chốt input PNG/JPEG/WebP, tối đa 8K và giới hạn dung lượng.
- Chốt output Standard 1440p và Premium 4K.
- Viết rõ trạng thái Good Pair, Review Pair, Rejected Pair.

**Đầu ra:** product contract một trang.  
**Done khi:** mỗi hành vi base/lens/difference/mouse-exit đều có ví dụ expected.

### T0.2 — Tạo bộ ảnh kiểm thử

- 5 cặp gần như pixel-perfect.
- 5 cặp lệch crop/scale/rotation nhẹ.
- 5 cặp khác ánh sáng/màu.
- 5 cặp xấu cần từ chối.
- Ground-truth mask vẽ tay cho tối thiểu 10 cặp.

**Đầu ra:** `test-assets/manifest.json`.  
**Done khi:** có license/provenance cho từng asset và không dùng ảnh thương mại chưa rõ quyền.

## Phase 1 — Kiến trúc production, 3–4 ngày

### T1.1 — Tách monorepo

- `apps/studio`: desktop editor.
- `packages/renderer`: WebGL renderer dùng chung.
- `packages/wallpaper-runtime`: runtime xuất bán.
- `packages/project-schema`: schema và migration.
- `services/image-pipeline`: alignment/mask worker.

**Done khi:** một lệnh chạy studio, một lệnh build runtime, TypeScript strict không lỗi.

### T1.2 — Project model

- Schema `.wallproj` có version.
- Asset reference, hashes, transform, mask edit, lens settings, export settings.
- Save atomic, autosave và recovery.

**Done khi:** save → close → open cho preview giống nhau.

### T1.3 — Job system

- Worker cho decode, alignment, difference và encode.
- Progress, cancel, retry và structured error.
- Không khóa UI khi xử lý ảnh 4K.

**Done khi:** cancel giữa alignment không làm hỏng project.

## Phase 2 — Import và canvas, 3–4 ngày

### T2.1 — Image decoder

- Drag/drop và file picker.
- EXIF orientation, alpha, ICC/sRGB, dimension và corruption check.
- Proxy 1024–1536 px để xử lý nhanh; giữ source cho export.

**Done khi:** ảnh điện thoại xoay đúng, ảnh lỗi bị từ chối mà app không crash.

### T2.2 — Canvas policy

- Native, 16:9, 21:9, 32:9.
- Cover, Contain và safe crop.
- Cảnh báo upscale và vùng thiếu pixel khi zoom cực đại.

**Done khi:** đổi aspect ratio không mất alignment hoặc mask.

### T2.3 — Asset rights ledger

- Owner, nguồn license, commercial use, attribution và proof.
- Trạng thái Verified/Unknown/Rejected.

**Done khi:** Unknown/Rejected không thể nhận nhãn Ready to sell.

## Phase 3 — Alignment, 5–7 ngày

### T3.1 — Normalize pair

- Chuyển về sRGB/linear đúng bước xử lý.
- Match resolution proxy.
- Chuẩn hóa exposure nhẹ chỉ cho việc tìm correspondence.

**Done khi:** normalization không sửa source và có thể bật/tắt debug.

### T3.2 — Auto alignment

- ORB/AKAZE feature matching.
- Affine + RANSAC mặc định.
- Homography chỉ khi score cải thiện đủ lớn.
- ECC refinement sau transform thô.

**Done khi:** trả transform, inlier ratio, reprojection error và valid coverage.

### T3.3 — Manual alignment

- Overlay opacity, blink compare, edge compare.
- 3–8 control points.
- Nudge, scale, rotate và reset.

**Done khi:** người dùng sửa được cặp mà auto-align chỉ gần đúng.

### T3.4 — Pair gate

- Good: cho đi tiếp.
- Review: yêu cầu xem heatmap và xác nhận mask.
- Rejected: giải thích do overlap/geometry quá thấp.

**Done khi:** cặp không liên quan không thể âm thầm đi tới export.

## Phase 4 — Difference extraction, 6–8 ngày

### T4.1 — Residual map

- So sánh trong linear luminance và chroma.
- Multi-scale difference để bỏ nhiễu pixel nhỏ.
- Edge-aware filtering.
- Bỏ vùng invalid sau warp.

**Done khi:** xuất heatmap 0–1 và debug view có thể đối chiếu A/B.

### T4.2 — Auto mask proposal

- Adaptive threshold theo noise floor của từng cặp.
- Connected components và loại vùng quá nhỏ.
- Morphological close/open có giới hạn.
- Feather theo khoảng cách đến biên.

**Done khi:** IoU với ground truth đạt ngưỡng đã chốt trên test set; không tối ưu theo một ảnh demo.

### T4.3 — Mask editor

- Brush Reveal, Erase và Protect.
- Brush size, hardness, opacity.
- Lasso/fill component.
- Undo/redo và before/after.

**Done khi:** mask khó có thể được sửa chính xác ở zoom 400%.

### T4.4 — Difference regions

- Đặt tên từng điểm khác biệt.
- Bật/tắt region.
- Preview thứ tự nếu muốn tạo chế độ discovery/game.

**Done khi:** export có thể chỉ giữ những region người bán đã duyệt.

## Phase 5 — Difference Lens renderer, 5–7 ngày

**Trạng thái implementation:** hoàn thành trong studio; production build pass. Acceptance trên Wallpaper Engine host và ma trận GPU được chuyển sang P7/P9. Chi tiết tại `P5_PROGRESS.md`.

### T5.1 — WebGL foundation

- Fullscreen quad, texture manager, resize và context recovery.
- Cover/contain UV transform dùng chung.
- Blend trong linear RGB rồi encode sRGB.

**Done khi:** A render đúng màu/kích thước tại 16:9, 21:9, 32:9.

### T5.2 — Magnifying lens shader

- Zoom quanh pointer: `zoomUV = center + (uv-center)/zoom`.
- Circle SDF, feather và optional border/refraction nhẹ.
- Clamp/safe bounds ở zoom tối đa.

**Done khi:** chỉ vùng lens phóng đại, ngoài lens không thay đổi.

### T5.3 — Difference reveal shader

- Sample A, B, difference mask và validity mask bằng cùng `zoomUV`.
- Composite theo công thức chuẩn ở đầu tài liệu.
- Debug mode A/B/Mask/Final.

**Done khi:** B không xuất hiện ngoài region đã duyệt và không trượt khi tăng zoom.

### T5.4 — Pointer behavior

- Easing độc lập với FPS.
- Fade lens 300–600 ms khi pointer rời màn hình.
- Touch fallback và center idle option.
- Multi-monitor/DPI coordinate checks.

**Done khi:** lens không rung, nhảy hoặc mắc lại sau mouse leave.

### T5.5 — Performance contract

- Đọc `applyGeneralProperties.fps` của Wallpaper Engine.
- `requestAnimationFrame` có FPS gate.
- Pause khi Wallpaper Engine yêu cầu.
- Texture memory estimator.

**Done khi:** 1440p đạt frame budget trên GPU tối thiểu đã chốt và không tăng bộ nhớ qua 20 lần reload.

## Phase 6 — Hoàn thiện UI/UX, 5–6 ngày

### T6.1 — Import screen

- Asset cards A/B, Swap, metadata, rights badge.
- Empty, loading, error và replace states.

### T6.2 — Align screen

- Toolbar Overlay/Blink/Edges.
- Metrics thật, quality badge và control points.

### T6.3 — Difference screen

- Thay tab Motion hiện tại bằng Difference cho MVP.
- Heatmap, region list và mask brush.
- Lens preview luôn có thể bật nhanh.

### T6.4 — Lens screen

- Radius, magnification, feather, follow speed, fade-out.
- Split Preview/Edit mode.
- Numeric input đi kèm slider.

### T6.5 — Accessibility và recovery

- Keyboard, focus ring, tooltip, high contrast, reduced motion.
- Undo/redo, autosave, crash recovery và error boundary.

**Done Phase 6 khi:** toàn bộ happy path dùng được ở 1280×720 không overflow và không có số liệu mock.

## Phase 7 — Wallpaper runtime và export, 6–8 ngày

### T7.1 — Runtime template

- `index.html`, minified JS/CSS, shader và local assets.
- Không CDN, analytics, font online hoặc API.
- Wallpaper Engine property listener.

### T7.2 — Project adapter

- Sinh `project.json` đúng schema được kiểm tra trên phiên bản Wallpaper Engine mục tiêu.
- Buyer controls: radius, zoom, feather, follow, intensity, quality.
- Giới hạn control theo safe bounds của từng project.

### T7.3 — Texture bake

- Warp B về A ở export resolution.
- Bake difference/validity masks.
- WebP/PNG selection theo visual quality.
- Loại metadata/source thừa.

### T7.4 — ZIP packager

- Sinh `manifest.json`, INSTALL, LICENSE, CHANGELOG, notices.
- Relative paths, deterministic file order và SHA-256.
- Không kèm `.wallproj`, source image chưa bake hoặc source map.

### T7.5 — Preview assets

- Cover JPG/WebP.
- MP4 trailer 1080p/4K.
- Static wallpaper fallback.

**Done Phase 7 khi:** máy Windows sạch đã cài Wallpaper Engine có thể giải nén, import và chạy offline.

## Phase 8 — Commercial validator, 4–5 ngày

### T8.1 — Static checks

- JSON schema, missing file, duplicate path và unsafe ZIP path.
- Network URL scan.
- Source/secret/path metadata scan.
- Rights ledger gate.

### T8.2 — Visual matrix

- Render 16:9, 21:9, 32:9.
- Pointer center/corner/edge.
- Min/max radius và zoom.
- Golden screenshots cho A, lens A và reveal B.

### T8.3 — Runtime checks

- Offline start.
- FPS 15/30/60.
- Reload/context-loss loop.
- VRAM estimate và package-size budget.

### T8.4 — Release report

- Pass/fail theo task.
- Product/version/hash.
- Compatibility và known limitations.

**Done Phase 8 khi:** nút `Ready to sell` chỉ xuất hiện sau khi toàn bộ P0 pass.

## Phase 9 — Beta và phát hành, 3–5 ngày

### T9.1 — Closed beta

- 5–10 cấu hình Windows/GPU/multi-monitor.
- Test install instructions và buyer properties.
- Ghi crash, render mismatch và time-to-install.

### T9.2 — Store package

- Product page, trailer, screenshots và FAQ.
- Ghi rõ yêu cầu người mua sở hữu Wallpaper Engine.
- Versioned ZIP không bị sửa sau release.

### T9.3 — Update process

- Giữ `productId`, tăng version.
- Changelog và migration policy.
- Rollback file cũ trên storefront.

**Done khi:** một người không tham gia phát triển có thể mua, cài, dùng và cập nhật theo tài liệu.

## Phase 10 — Sau MVP

Thứ tự đề xuất:

1. Ambient motion rất nhẹ nhưng dùng cùng displacement cho A/B/mask.
2. Nhiều difference region và discovery sequence.
3. Hybrid motion.
4. Dense optical flow cùng Morph sau khi có benchmark riêng.
5. Signed installer sau khi ZIP MVP đã ổn định.
6. Android workflow dựa trên luồng chính thức của Wallpaper Engine.

## 4. Critical path thực tế

```text
T0.1 Product contract
→ T1.2 Project model
→ T2.1 Import
→ T3.2 Auto alignment
→ T3.3 Manual correction
→ T4.1 Residual map
→ T4.2 Auto mask
→ T4.3 Mask editor
→ T5.2 Lens shader
→ T5.3 Difference reveal
→ T7.1 Runtime
→ T7.3 Texture bake
→ T7.4 ZIP packager
→ T8 Commercial validator
→ T9 Beta/release
```

## 5. Các mốc demo bắt buộc

### Demo 1 — Logic proof

Hai ảnh đã căn chỉnh thủ công, mask vẽ tay, lens WebGL phóng đại đúng và chỉ lộ B tại mask.

### Demo 2 — Creator workflow

Import → auto-align → chỉnh mask → lens preview → save/open project.

### Demo 3 — Sellable package

Export ZIP → giải nén trên máy khác → import Wallpaper Engine → chạy offline → buyer controls hoạt động.

### Demo 4 — Release candidate

Commercial validator pass, rights verified, trailer/store assets và release report hoàn chỉnh.

## 6. Những việc không đưa vào MVP

- AI segmentation hoặc RAFT bắt buộc.
- Morph loop.
- Marketplace riêng trong app.
- Cloud processing, account hoặc subscription.
- DRM online.
- Installer EXE chưa ký.
- Xuất trực tiếp `.mpkg` thay cho luồng chính thức của Wallpaper Engine.
