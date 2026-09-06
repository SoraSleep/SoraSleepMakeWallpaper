# Motion Pair Studio — Implementation Backlog

## Cách sử dụng backlog

Mỗi epic bên dưới có mục tiêu, dependency, task nhỏ, đầu ra và điều kiện hoàn thành. Estimate dùng **ideal developer day**; chưa gồm thời gian chờ feedback thiết kế hoặc phát hành store.

Quy ước ưu tiên:

- `P0`: bắt buộc để MVP sử dụng được.
- `P1`: cần cho bản beta chất lượng tốt.
- `P2`: nâng cấp sau khi có dữ liệu người dùng.

## Epic 0 — Product foundation

**Mục tiêu:** khóa phạm vi và các quyết định kỹ thuật trước khi phát triển pipeline ảnh.  
**Estimate:** 2–3 ngày.  
**Dependency:** không có.

### E0.1 — Viết product contract `P0`

- Định nghĩa đầu vào hỗ trợ: PNG, JPEG, WebP; giới hạn kích thước và dung lượng.
- Định nghĩa A là ảnh chuẩn và B là ảnh biến thể.
- Định nghĩa Difference Lens là output mode duy nhất của MVP; Hybrid và Morph là post-MVP.
- Định nghĩa hành vi khi cặp ảnh không đủ tương đồng.
- Định nghĩa dữ liệu nào xử lý offline và dữ liệu nào nằm trong runtime.
- Chốt rằng MVP xuất Web Wallpaper offline.

**Done khi:** có một tài liệu một trang được product, design và engineering đồng ý; không còn thuật ngữ mơ hồ như “ảnh tương tự” mà không có score.

### E0.2 — Architecture decision records `P0`

- ADR-001: Web Wallpaper thay cho ghi trực tiếp `scene.pkg`.
- ADR-002: cùng một WebGL renderer cho preview và output.
- ADR-003: OpenCV flow cho MVP, RAFT là quality option.
- ADR-004: project lưu stroke/mask edit ở dạng không phá hủy.
- ADR-005: mọi asset runtime chạy offline.

**Done khi:** mỗi ADR ghi context, lựa chọn, phương án bỏ qua và hệ quả.

### E0.3 — Thiết lập repository `P0`

- Monorepo gồm `apps/studio`, `crates/core` hoặc `services/image-pipeline`, `packages/wallpaper-runtime`.
- TypeScript strict mode.
- Formatter, linter, pre-commit và conventional commits.
- Build Windows x64 trong CI.
- Cache model và native dependencies.
- Cấu hình release channel: dev, beta, stable.

**Done khi:** clone mới có thể cài dependency, chạy studio và build runtime bằng một lệnh.

## Epic 1 — Design system và application shell

**Mục tiêu:** tạo UI desktop nhất quán, dùng tốt ở 1280×720 đến 4K.  
**Estimate:** 4–5 ngày.  
**Dependency:** E0.3.

### E1.1 — Design tokens `P0`

- Color tokens: canvas, panel, border, text, accent, success, warning, danger.
- Typography scale: 9/10/12/14/18/24 px.
- Spacing scale 4 px.
- Radius, elevation và focus-ring.
- Motion duration: 120/180/260 ms.
- High-contrast và reduced-motion variants.

**Done khi:** không còn màu hoặc spacing tùy ý trong component production.

### E1.2 — App shell `P0`

- Topbar: project switcher, undo/redo, preview, export.
- Workflow rail: Import, Align, Motion, Effects, Export.
- Workspace trung tâm có toolbar, canvas và timeline.
- Inspector theo context ở bên phải.
- Persist kích thước panel và trạng thái collapse.
- Keyboard navigation giữa panel.

**Done khi:** bố cục không overflow ở 1280×720; panel cuộn độc lập; canvas luôn giữ vùng nhìn tối thiểu.

### E1.3 — Component primitives `P0`

- Button, IconButton, Tabs, SegmentedControl.
- Slider, NumericInput, Select, Toggle.
- Tooltip, Popover, Dialog, Toast.
- AssetCard, QualityBadge, EmptyState.
- ProgressBar có cancel.
- Error boundary và recovery action.

**Done khi:** có Storybook/component gallery hoặc route dev để kiểm tra mọi state.

### E1.4 — Command model `P1`

- Undo/redo cho transform, mask stroke, setting và effect.
- Command palette.
- Shortcut map có thể xem trong UI.
- Dirty state và cảnh báo khi đóng project chưa lưu.

**Done khi:** tối thiểu 50 thao tác liên tục có thể undo/redo đúng thứ tự.

## Epic 2 — Project và asset lifecycle

**Mục tiêu:** nhập ảnh an toàn, lưu project và phục hồi session.  
**Estimate:** 4–6 ngày.  
**Dependency:** Epic 0, E1.2.

### E2.1 — Image import `P0`

- Drag/drop và file picker cho A/B.
- Decode PNG/JPEG/WebP.
- Áp dụng EXIF orientation.
- Đọc dimensions, alpha, ICC profile và file size.
- Reject file hỏng với thông báo rõ.
- Tạo thumbnail và proxy không khóa UI.
- Cho phép Swap A/B.

**Done khi:** bộ corpus lỗi/méo không làm crash app; ảnh xoay từ điện thoại hiển thị đúng.

### E2.2 — Canvas policy `P0`

- Canvas mặc định theo ảnh A.
- Preset 16:9, 21:9, 32:9 và Native.
- Fit Cover/Contain/Smart Crop.
- Safe area cho multi-monitor.
- Cảnh báo upscale quá mức.

**Done khi:** đổi preset không mất transform hoặc mask edit.

### E2.3 — Project format `.wallproj` `P0`

- Schema có version.
- Lưu asset reference, transform, alignment metrics.
- Lưu stroke mask dạng vector/tiles.
- Lưu motion/effect/export settings.
- Relative paths cho asset nằm cạnh project.
- Migration cho schema cũ.

**Done khi:** save → close → open cho ra preview pixel-equivalent.

### E2.4 — Autosave và recovery `P1`

- Debounced autosave.
- Atomic write bằng temp + replace.
- Recovery snapshot khi app crash.
- Recent projects.
- Missing asset relink flow.

**Done khi:** kill process giữa lúc save không làm hỏng file project cuối cùng.

## Epic 3 — Global image alignment

**Mục tiêu:** đưa B về hệ tọa độ A và đo được độ tin cậy.  
**Estimate:** 6–8 ngày.  
**Dependency:** Epic 2.

### E3.1 — Preprocessing `P0`

- Chuyển sang linear working space.
- Tạo grayscale proxy 1024–1536 px.
- Normalize local contrast nhẹ cho feature detection.
- Loại vùng alpha rỗng.
- Giữ mapping chính xác từ proxy về native resolution.

**Done khi:** mọi transform đo trên proxy ánh xạ về ảnh gốc sai dưới 0.5 px do scale.

### E3.2 — Feature matching `P0`

- AKAZE mặc định, ORB fallback.
- KNN descriptor matching.
- Lowe ratio filter.
- Symmetric cross-check tùy chọn.
- Spatial bucketing tránh match dồn ở một vùng.
- Debug overlay cho keypoint/match.

**Done khi:** trả metrics ổn định và không exception với ảnh ít texture.

### E3.3 — Transform estimation `P0`

- Ước lượng translation/scale/rotation trước.
- Estimate affine bằng RANSAC.
- Estimate homography chỉ khi affine residual cao.
- Reject transform bị flip, scale phi lý hoặc perspective quá mạnh.
- Refine bằng inlier ở full proxy resolution.
- Tính valid canvas ratio.

**Done khi:** tập “Good Pair” có median reprojection error dưới ngưỡng benchmark.

### E3.4 — Manual alignment editor `P0`

- Overlay opacity slider.
- Blink compare.
- Difference heatmap.
- Pan/zoom 25–800%.
- 3–8 control points có snap vào edge.
- Nudge bằng keyboard.
- Reset về auto transform.

**Done khi:** người dùng có thể sửa một cặp auto-align thất bại trong dưới hai phút.

### E3.5 — Alignment quality gate `P0`

- Inlier ratio.
- Reprojection error.
- Canvas coverage.
- Photometric residual sau warp.
- Badge Good/Review/Poor.
- Giải thích metric nào làm score thấp.

**Done khi:** Poor pair không tự động đi thẳng vào Morph mode.

## Epic 4 — Dense flow, occlusion và confidence

**Mục tiêu:** tạo trường chuyển động cục bộ đủ sạch cho shader.  
**Estimate:** 8–12 ngày.  
**Dependency:** Epic 3.

### E4.1 — Optical-flow abstraction `P2`

- Interface thống nhất cho Farneback, Dense RLOF và RAFT.
- Input/output tensor contract.
- Progress và cancel.
- Cache theo asset hash + transform + settings.
- CPU/GPU capability detection.

**Done khi:** đổi backend không làm thay đổi phần còn lại của pipeline.

### E4.2 — OpenCV flow backend `P2`

- Tính A→B và B→A.
- Pyramid levels theo resolution.
- Preset Fast/Balanced/Quality.
- Upsample flow về canvas đúng scale vector.
- Unit tests với synthetic translation/rotation.

**Done khi:** synthetic displacement sai trung bình dưới 1 px trong vùng hợp lệ.

### E4.3 — Confidence engine `P2`

- Forward/backward consistency.
- Out-of-bounds mask.
- Photometric residual.
- Flow-gradient discontinuity.
- Combine thành confidence 0–1.
- Histogram và low-confidence coverage.

**Done khi:** vùng occlusion thật được đánh confidence thấp trong bộ test có ground truth thủ công.

### E4.4 — Flow cleanup `P2`

- Median outlier removal.
- Edge-aware smoothing.
- Vector magnitude clamp.
- Boundary erosion quanh occlusion.
- Prevent smoothing qua locked edge.
- Preview trước/sau cleanup.

**Done khi:** giảm tear mà không làm trôi mắt, chữ hoặc landmark khóa.

### E4.5 — RAFT quality backend `P1`

- Chọn model/license phù hợp.
- Convert và validate ONNX.
- WinML/ONNX Runtime inference.
- GPU provider selection, CPU fallback.
- Model download/ship policy.
- Benchmark VRAM và latency.

**Done khi:** quality tốt hơn OpenCV trên tập Difficult Pair và không chặn MVP nếu model không khả dụng.

## Epic 5 — Mask và correction editor

**Mục tiêu:** cho người dùng sửa những vùng automation không thể hiểu đúng.  
**Estimate:** 7–9 ngày.  
**Dependency:** Epic 3, E1.3. Epic 4 chỉ cần cho các mode Morph/Hybrid sau MVP.

### E5.1 — Mask data model `P0`

- Ba lớp chỉnh Difference Lens: Auto proposal, Reveal và Protect/Erase.
- Stroke lưu position, radius, hardness, opacity, mode.
- Tile-based raster cache.
- Undo/redo theo stroke.
- Scale-independent replay ở export resolution.

**Done khi:** project 4K với 500 stroke vẫn save/load và undo nhanh.

### E5.2 — Brush engine `P0`

- Size, hardness, opacity.
- Add/subtract.
- Pressure support nếu có bút.
- Cursor preview đúng zoom.
- Edge-aware paint option.
- Clear/fill/invert mask.

**Done khi:** brush latency dưới 16 ms trên proxy 1440p.

### E5.3 — Pin/anchor system `P2`

- Click để khóa điểm quan trọng.
- Radius ảnh hưởng quanh pin.
- Face preset khóa mắt/miệng nếu detect được.
- Hiển thị conflict khi pin chống lại flow mạnh.

**Done khi:** pin loại được drift ở mắt mà không tạo discontinuity rõ.

### E5.4 — Auto-mask assist `P0`

- Difference-based region proposal.
- Foreground extraction cơ bản.
- Optional AI segmentation.
- Feather theo edge.
- Accept/refine/reject proposal.

**Done khi:** assist tiết kiệm thao tác nhưng không ghi đè edit tay.

## Epic 6 — WebGL preview renderer

**Mục tiêu:** renderer trong app giống chính xác renderer xuất ra Wallpaper Engine.  
**Estimate:** 8–10 ngày.  
**Dependency:** E2.2, Epic 3 và E5.1. Epic 4 chỉ cần cho các shader post-MVP.

### E6.1 — Renderer foundation `P0`

- WebGL 2 context và fallback/error UI.
- Texture loader.
- ResizeObserver và DPR cap.
- Color-space handling.
- Premultiplied-alpha policy.
- Context loss/recovery.

**Done khi:** resize liên tục và sleep/wake GPU không làm preview đen.

### E6.2 — Flow texture codec `P2`

- Pack flow X/Y, confidence, mask vào RGBA8.
- Lưu maxFlowPixels trong config.
- Shader decode.
- Round-trip accuracy test.
- Half-resolution flow option.

**Done khi:** quantization error không nhìn thấy ở preset Subtle/Normal.

### E6.3 — Interactive Reveal shader `P0`

- Pointer screen→UV transform.
- Aspect-correct radius.
- Magnification chỉ bên trong lens, ngoài lens giữ nguyên A.
- Sample A/B/difference/validity bằng cùng một `zoomUV`.
- Smooth feather.
- Difference-weighted blend; validity mask chặn vùng warp không hợp lệ.
- Pointer easing và fade-out.
- Clamp ở canvas edges.

**Done khi:** boundary không giật, không méo hình tròn ở 32:9, B không lộ ngoài mask và không trượt khi zoom.

### E6.4 — Ambient/Hybrid shader `P2`

- Shared displacement cho A/B.
- Multi-frequency sine/noise.
- Motion mask.
- Strength clamp.
- Cosine loop có pause.

**Done khi:** A/B giữ alignment trong toàn bộ loop.

### E6.5 — Morph shader `P2`

- Bidirectional warp.
- Confidence-aware dissolve fallback.
- Occlusion handling.
- Cosine phase.
- Debug view A/B/flow/confidence/difference.

**Done khi:** không có seam ở frame đầu/cuối và Poor pair không thể bật mode nếu chưa override.

### E6.6 — Timeline và transport `P2`

- Play/pause/scrub.
- Duration và pause interval.
- Key state A/B.
- Frame stepping debug.
- Current time display.

**Done khi:** scrub deterministic; cùng timestamp cho cùng output.

## Epic 7 — Effects và customization

**Mục tiêu:** thêm chiều sâu nhưng giữ chi phí GPU có kiểm soát.  
**Estimate:** 5–7 ngày.  
**Dependency:** Epic 6.

### E7.1 — Effect stack `P0`

- Ordered effect list.
- Enable/disable và parameter binding.
- Cost indicator.
- Preset serialize.
- Reset từng effect.

**Done khi:** thay thứ tự tạo output deterministic và lưu đúng vào project.

### E7.2 — Finish effects `P1`

- Soft bloom.
- Vignette nhẹ.
- Color match A/B.
- Grain/dither chống banding.
- Pointer parallax giới hạn 2–8 px.

**Done khi:** mỗi effect có GPU budget và reduced-motion behavior.

### E7.3 — Rain trails `P1`

- Instanced particles hoặc procedural fragment effect.
- Count, speed, length, alpha.
- Aspect-aware spawn.
- Pause khi effect tắt.

**Done khi:** 4K/30 fps nằm trong performance budget mục tiêu.

### E7.4 — Wallpaper Engine user properties `P1`

- Reveal radius.
- Motion strength.
- FPS behavior.
- Effects toggles.
- Color/accent option.

**Done khi:** thay setting trong Wallpaper Engine cập nhật runtime mà không reload project.

## Epic 8 — Export pipeline

**Mục tiêu:** tạo thư mục wallpaper sạch, offline và nhập được ngay.  
**Estimate:** 6–8 ngày.  
**Dependency:** Epic 6; E7.4 nếu có properties.

### E8.1 — Runtime template `P0`

- `index.html`, `runtime.js`, GLSL, CSS tối thiểu.
- Không CDN, không network request.
- Version stamp.
- Asset manifest.
- Error overlay chỉ trong debug build.

**Done khi:** ngắt mạng hoàn toàn vẫn chạy.

### E8.2 — Image export `P0`

- 1080p/1440p/4K/Native.
- Bake B aligned, difference mask và validity mask trong cùng hệ tọa độ A.
- WebP/PNG quality policy.
- Preserve alpha khi cần.
- Generate thumbnail.
- File-name sanitation.
- Atomic output directory.

**Done khi:** export bị cancel không để lại project nửa vời.

### E8.3 — Wallpaper config `P0`

- Sinh config runtime.
- Sinh metadata/title/preview.
- User-property definitions.
- Aspect-fit policy.
- Default FPS behavior.

**Done khi:** import bằng `index.html` tạo wallpaper đúng canvas và settings.

### E8.4 — Export validator `P0`

- Kiểm tra file thiếu.
- Kiểm tra path absolute hoặc network URL.
- Kiểm tra texture dimensions và VRAM estimate.
- Load project bằng local preview harness.
- Render snapshot ở ba aspect ratio.
- Sinh validation report.

**Done khi:** nút Export chỉ báo thành công sau khi runtime đã load và render được một frame.

### E8.5 — Handoff UX `P0`

- Open export folder.
- Copy import instructions.
- “Open in Wallpaper Engine” nếu có API/command được xác nhận.
- Không tự publish Workshop.
- Ghi rõ asset license reminder trong metadata flow.

**Done khi:** người mới có thể nhập output mà không đọc tài liệu ngoài.

## Epic 9 — Performance và reliability

**Mục tiêu:** wallpaper đẹp nhưng không gây tải nền quá mức.  
**Estimate:** 5–8 ngày.  
**Dependency:** Epic 6–8.

### E9.1 — FPS limiter `P0`

- Đọc `applyGeneralProperties.fps`.
- Dùng `requestAnimationFrame` và frame accumulator.
- Clamp delta sau sleep/resume.
- Stop update khi document hidden nếu phù hợp.
- Overlay profiler trong debug.

**Done khi:** runtime không render vượt FPS limit đã cấu hình.

### E9.2 — GPU memory policy `P0`

- Estimate texture bytes trước export.
- Cap DPR preview.
- Half-resolution flow mặc định ở 4K.
- Lazy texture creation.
- Release texture/program đúng lúc.

**Done khi:** không tăng VRAM theo mỗi lần đổi project/preview.

### E9.3 — Processing jobs `P0`

- Worker thread/process.
- Progress có phase.
- Cancel cooperative.
- Timeout và fallback backend.
- Crash isolation cho model/native code.

**Done khi:** UI vẫn phản hồi trong toàn bộ quá trình alignment/flow 4K.

### E9.4 — Long-session test `P1`

- Preview chạy 8 giờ.
- Đổi project 100 lần.
- Resize/minimize/restore.
- GPU context loss simulation.
- Memory/handle leak tracking.

**Done khi:** memory ổn định trong tolerance đã định.

## Epic 10 — QA và benchmark

**Mục tiêu:** đo chất lượng thay vì đánh giá bằng cảm giác.  
**Estimate:** 6–10 ngày, chạy song song từ Epic 3.  
**Dependency:** tăng dần theo feature.

### E10.1 — Pair corpus `P0`

- 50 cặp có quyền sử dụng.
- Anime, người thật, phong cảnh.
- Good/Review/Poor ground-truth label.
- Cases: crop, pose, outfit, background, occlusion, low texture.
- Không đưa asset nhạy cảm vào automated screenshot test.

**Done khi:** corpus có manifest, expected behavior và license/source metadata.

### E10.2 — Algorithm benchmarks `P0`

- Alignment reprojection error.
- Forward/backward flow error.
- Low-confidence coverage.
- Runtime/VRAM.
- Human artifact score 1–5.
- Regression thresholds trong CI.

**Done khi:** thay thuật toán không merge nếu làm xấu benchmark quá tolerance.

### E10.3 — Runtime compatibility `P0`

- Windows 10/11.
- Intel/AMD/NVIDIA GPU.
- 16:9, 21:9, 32:9.
- 100/125/150/200% display scale.
- Wallpaper Engine FPS 15/30/60.

**Done khi:** có compatibility matrix và lỗi còn lại được phân mức.

### E10.4 — Accessibility `P1`

- Keyboard-only flow.
- Visible focus.
- Screen-reader label cho control.
- Reduced motion.
- Không chỉ dùng màu để báo quality/error.

**Done khi:** toàn bộ workflow cơ bản hoàn thành không cần chuột.

## Epic 11 — Packaging và beta release

**Mục tiêu:** phân phối app có update và diagnostic tối thiểu.  
**Estimate:** 4–6 ngày.  
**Dependency:** Epic 0–10 P0.

### E11.1 — Windows packaging `P0`

- Signed installer khi có certificate.
- Per-user install.
- Uninstall sạch.
- Native/model dependency check.
- Offline installation option.

**Done khi:** cài/upgrade/uninstall trên máy sạch không cần môi trường dev.

### E11.2 — Diagnostics `P0`

- Local log có rotation.
- Export diagnostic bundle sau khi người dùng chọn.
- Không ghi nội dung ảnh vào log.
- GPU/backend/capability report.
- Crash report opt-in.

**Done khi:** lỗi export có đủ context để tái hiện nhưng không lộ asset.

### E11.3 — Beta program `P0`

- 10–20 tester với GPU và màn hình khác nhau.
- Feedback form theo từng project.
- Thu pair quality score và mode được chọn.
- Theo dõi thời gian import→export.
- Fix P0/P1 trước stable.

**Done khi:** ít nhất 80% Good Pair xuất thành công không cần chỉnh mask sâu.

## Epic 12 — Commercial export và distribution

Chi tiết quyết định định dạng, cấu trúc gói và chính sách phát hành nằm trong `COMMERCIAL_EXPORT_PLAN.md`.

### E12.1 — Commercial bundle contract `P0`

- Xuất ZIP Web Wallpaper offline gồm `project.json`, runtime, asset đã bake và `manifest.json`.
- Build tái lập được, có SHA-256 và không chứa source project/cache.
- Adapter cô lập schema Wallpaper Engine khỏi schema nội bộ.

**Done khi:** gói mới giải nén có thể mở trên một máy Windows sạch đã cài Wallpaper Engine.

### E12.2 — Product và rights metadata `P0`

- Product ID, version, edition, publisher và storefront SKU.
- Rights ledger cho từng ảnh/font/audio/texture.
- Sinh `LICENSE.txt` và `THIRD-PARTY-NOTICES.txt`.
- Chặn nhãn `Ready to sell` khi quyền thương mại còn unknown.

**Done khi:** release report truy được nguồn và trạng thái quyền của mọi asset trong gói.

### E12.3 — Commercial validator `P0`

- Kiểm tra schema, missing asset, network dependency, checksum và texture budget.
- Test reveal/zoom ở 16:9, 21:9, 32:9 và mức zoom tối đa.
- Xác nhận runtime tuân theo FPS property của Wallpaper Engine.

**Done khi:** một lỗi validation bất kỳ chặn xuất bản và chỉ rõ file/control cần sửa.

### E12.4 — Store assets và fallback `P1`

- Render `preview.mp4`, cover, screenshots và ảnh tĩnh.
- Sinh INSTALL, CHANGELOG, cấu hình tối thiểu và storefront copy.
- Preset Standard, 4K và Ultrawide.

**Done khi:** một lần export tạo đủ file để upload storefront và đủ gói cho khách cài.

### E12.5 — Signed installer `P2`

- Detect library, verify signature/hash, copy, open qua CLI và uninstall sạch.
- Code signing và antivirus compatibility matrix.

**Done khi:** cài/update/uninstall không phá project khác và rollback được khi copy thất bại.

## Critical path

```text
E0.1 Difference Lens contract
  → E0.3 Repository
  → E2.1 Import
  → E3.2 Feature matching
  → E3.3 Transform
  → E3.4 Manual alignment
  → E5.4 Difference-mask proposal
  → E5.2 Mask correction
  → E6.3 Reveal shader
  → E8.1 Runtime template
  → E8.2 Baked textures
  → E8.4 Export validator
  → E12.1 Commercial ZIP
  → E12.2 Rights metadata
  → E12.3 Commercial validator
  → E10.3 Compatibility
  → E11.3 Beta
```

## Sprint plan đề xuất

### Sprint 1 — Chứng minh Difference Lens, 1 tuần

- E0.1, E0.2.
- E6.1 foundation tối thiểu.
- E6.3 reveal shader bằng mask vẽ tay.
- E8.1 runtime template.
- Import thử vào Wallpaper Engine.

**Demo:** ngoài kính là A nguyên bản; trong kính A được zoom và B chỉ xuất hiện tại mask.

### Sprint 2 — Import và alignment, 1 tuần

- E2.1, E2.2.
- E3.1–E3.3.
- Overlay/difference phần cốt lõi của E3.4.
- Quality metrics ban đầu.

**Demo:** nhập cặp ảnh, auto-align, xem before/after và metrics.

### Sprint 3 — Difference extraction, 1 tuần

- Residual heatmap đa tỉ lệ.
- E5.4 auto-mask proposal.
- Difference/validity texture.
- Debug A/B/Mask/Final.

**Demo:** app đề xuất đúng vùng khác biệt trên corpus và bỏ nhiễu alignment/nén ảnh.

### Sprint 4 — Mask correction và lens controls, 1 tuần

- E5.1–E5.2.
- Hoàn thiện E3.4.
- Undo/redo cơ bản.
- Radius, zoom, feather, follow speed và mouse-leave fade.

**Demo:** sửa mask ở zoom 400%; B không lộ ngoài vùng đã duyệt.

### Sprint 5 — Runtime và export MVP, 1 tuần

- E8.2–E8.5.
- E9.1–E9.3.

**Demo:** project hoàn chỉnh xuất và chạy offline trong Wallpaper Engine.

### Sprint 6 — Commercial package, 1 tuần

- E12.1–E12.4.
- Product/version/rights metadata.
- ZIP, checksum, license, install guide và preview assets.

**Demo:** một lần export tạo gói storefront và gói cài cho khách.

### Sprint 7 — Beta quality, 1–2 tuần

- E10 compatibility.
- E11 diagnostics/beta.
- Visual matrix 16:9, 21:9, 32:9.
- Kiểm tra offline, FPS và long-session.

**Demo:** release candidate có commercial validation report.

## Release criteria cho MVP

- Nhập hai ảnh và lưu/mở project thành công.
- Good Pair auto-align đạt mục tiêu reprojection.
- Difference Lens phóng đại A chỉ trong kính và chỉ lộ B tại mask.
- Poor Pair bị chặn khỏi export cho đến khi alignment/mask được sửa.
- Brush Reveal/Erase/Protect sửa được mask và có undo/redo.
- Output không có network dependency.
- Output tuân theo FPS limit Wallpaper Engine.
- Export validator render thành công 16:9, 21:9, 32:9.
- Không crash trên compatibility matrix P0.
- Commercial ZIP, checksum và release report được tạo tái lập từ CI.
- Mọi asset có trạng thái quyền thương mại Verified.
