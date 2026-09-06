# Kế hoạch xây app tạo Wallpaper Engine từ hai ảnh tương tự

## 1. Mục tiêu sản phẩm

App nhận:

- Ảnh A: ảnh gốc, luôn là hình nền chính.
- Ảnh B: ảnh biến thể có bố cục hoặc nhân vật gần giống ảnh A.

App tự căn hai ảnh, cho phép sửa vùng sai, tạo chuyển động nhẹ và xuất một **Web Wallpaper chạy offline** có thể nhập vào Wallpaper Engine bằng `index.html`.

Đầu ra mặc định nên giống logic wallpaper đã phân tích:

- A luôn hiện ổn định.
- B chỉ được reveal trong vùng mềm quanh con trỏ.
- A và B chịu cùng một biến dạng nhẹ để luôn khớp nhau.
- Có thể bật thêm mưa, glow, parallax hoặc morph A ↔ B.

## 2. Quyết định quan trọng nhất

### Chọn Web Wallpaper làm định dạng xuất

Không nên để phiên bản đầu tự tạo `scene.pkg`, `.tex` hoặc phụ thuộc vào cấu trúc Scene Wallpaper không được thiết kế như một API xuất project công khai.

App sẽ sinh một thư mục:

```text
wallpaper-name/
  index.html
  runtime.js
  style.css
  config.json
  assets/
    image-a.webp
    image-b.webp
    flow-ab.png
    flow-ba.png
    confidence.png
    subject-mask.png
```

Người dùng kéo `index.html` vào nút Create Wallpaper của Wallpaper Engine. Mọi asset được đóng cùng thư mục để wallpaper chạy khi offline.

Lợi ích:

- Runtime và shader do app kiểm soát hoàn toàn.
- Không phải reverse-engineer package nhị phân.
- Dễ preview trong Chromium trước khi nhập.
- Dễ thêm user properties, chuột, FPS limiter và hiệu ứng mới.
- Project xuất ra có thể đọc, sửa và version-control.

## 3. Logic hình ảnh được đề xuất

### 3.1 Ba chế độ đầu ra

#### Chế độ 1 — Interactive Reveal, mặc định

Ảnh A luôn hiện. Ảnh B xuất hiện dưới một vùng tròn mềm đi theo chuột:

```text
revealMask = smoothstep(radius, radius - feather, distance(UV, pointerUV))
finalColor = mix(A, B_aligned, revealMask × confidence)
```

Đây là chế độ an toàn nhất khi hai ảnh chỉ “tương tự”, vì sai khác chỉ xuất hiện trong một vùng nhỏ và có feather che biên.

#### Chế độ 2 — Ambient Morph Loop

Hai ảnh biến đổi qua lại trong một vòng lặp:

```text
p(t) = 0.5 - 0.5 × cos(2πt / duration)
```

Hàm cosine có vận tốc bằng 0 tại A và B nên vòng lặp không giật ở điểm đổi chiều.

Mỗi frame:

```text
sampleA = A(UV + warpA(flowAB, p))
sampleB = B(UV + warpB(flowBA, 1-p))
color   = mix(sampleA, sampleB, smoothstep(0.35, 0.65, p))
```

Vùng có confidence thấp giảm warp và chuyển sang dissolve mềm. Chế độ này chỉ được bật mặc định nếu điểm khớp ảnh đủ cao.

#### Chế độ 3 — Hybrid

A và B có một chuyển động “thở” rất nhỏ, đồng bộ; con trỏ reveal B. Đây là chế độ gần nhất với wallpaper mẫu và phù hợp làm preset chất lượng cao.

## 4. Pipeline xử lý hai ảnh

### Bước 1 — Chuẩn hóa

- Đọc EXIF orientation.
- Chuyển cả hai ảnh sang sRGB tuyến tính cho các phép blend/so sánh.
- Chọn canvas theo ảnh A.
- Fit ảnh B theo `cover`, nhưng chưa crop vĩnh viễn.
- Tạo proxy 1024–1536 px để chạy computer vision nhanh; giữ ảnh gốc để render/export.

### Bước 2 — Căn chỉnh toàn cục

1. Tìm keypoint bằng AKAZE hoặc ORB.
2. Match descriptor bằng nearest-neighbor ratio test.
3. Ước lượng affine trước; chỉ nâng lên homography nếu affine không đủ tốt.
4. Dùng RANSAC loại match sai.
5. Warp B về hệ tọa độ A.

Ưu tiên affine vì nó ít làm cong hình. Homography chỉ hợp lý khi khác biệt chủ yếu đến từ phối cảnh/camera.

Các chỉ số cần lưu:

- số keypoint và match;
- tỉ lệ RANSAC inlier;
- median reprojection error;
- phần canvas hợp lệ sau warp.

Nếu inlier quá ít hoặc sai số quá lớn, app chuyển sang màn hình đặt 3–8 control point thủ công.

### Bước 3 — Dense correspondence

Sau global alignment, tính optical flow hai chiều:

```text
F_ab = flow(A → B_aligned)
F_ba = flow(B_aligned → A)
```

MVP dùng Dense Farneback hoặc Dense RLOF của OpenCV. Bản chất lượng cao dùng RAFT-small chạy offline. RAFT được chọn vì nó tạo displacement theo từng pixel và xử lý chuyển động lớn tốt hơn flow cổ điển, nhưng chỉ chạy lúc chuẩn bị project; runtime wallpaper không chạy model AI.

### Bước 4 — Confidence và occlusion

Không tin toàn bộ optical flow. Với pixel `x`:

```text
e(x) = |F_ab(x) + F_ba(x + F_ab(x))|
confidence(x) = exp(-e(x)² / sigma²)
```

Giảm confidence khi:

- forward/backward flow không quay về cùng điểm;
- pixel sau warp ra ngoài canvas;
- độ khác màu còn quá lớn;
- gradient hoặc biên vật thể bị lệch mạnh;
- flow có độ lớn bất thường so với vùng lân cận.

Confidence map là phần bắt buộc. Nếu bỏ nó, tóc, tay, vật thể bị che và nền khác nhau sẽ dễ bị kéo thành vệt.

### Bước 5 — Tách subject và vùng chuyển động

App đề xuất subject mask tự động, sau đó cho người dùng sửa bằng brush:

- `Move`: vùng được phép biến dạng.
- `Lock`: vùng phải đứng yên, như mắt, miệng, chữ và đường viền quan trọng.
- `Reveal`: vùng được phép dùng ảnh B.
- `Exclude`: vùng không bao giờ trộn vì hai ảnh không tương ứng.

Phiên bản đầu không cần bắt buộc model segmentation lớn. Có thể bắt đầu bằng alpha có sẵn, color difference, edge-aware flood fill và brush. Segmentation AI là module nâng cấp, không phải điều kiện để xuất wallpaper.

### Bước 6 — Làm sạch flow

- Median filter loại vector lẻ.
- Edge-aware smoothing trong cùng vùng vật thể.
- Không blur vector qua biên subject/background.
- Clamp độ dài flow theo preset: Subtle `1.5%`, Normal `3%`, Strong `5%` chiều nhỏ của canvas.
- Erode confidence nhẹ quanh occlusion để tránh viền đôi.
- Cho người dùng dùng pin/anchor để khóa mắt, khuôn mặt, logo.

### Bước 7 — Đóng gói texture runtime

Để tương thích WebGL rộng, MVP đóng flow vào PNG RGBA8:

- R: flow X đã chuẩn hóa.
- G: flow Y đã chuẩn hóa.
- B: confidence.
- A: motion/reveal mask.

`config.json` lưu `maxFlowPixels` để shader giải mã lại vector. Nếu cần độ chính xác cao hơn, bản sau dùng hai byte cho mỗi trục hoặc texture float khi môi trường hỗ trợ.

## 5. Runtime shader

### 5.1 Luồng mỗi frame

```text
Đọc FPS limit của Wallpaper Engine
  → nếu chưa tới frame cần vẽ: bỏ qua
  → cập nhật pointer có easing
  → tính phase loop
  → sample A, B, flow và confidence
  → warp hai ảnh
  → blend theo mode
  → post-process nhẹ
  → render ra canvas
```

### 5.2 Pointer phải có easing

Không dùng thẳng vị trí chuột vì vùng reveal sẽ rung:

```text
pointer += (targetPointer - pointer) × (1 - exp(-followSpeed × dt))
```

Khi chuột rời màn hình, vùng reveal fade về 0 trong khoảng 300–600 ms.

### 5.3 Ambient motion dùng chung

Một displacement rất nhỏ được cộng cho cả A và B:

```text
ambient = motionMask × (
    sin(time × 0.71 + noisePhase) +
    0.35 × sin(time × 1.17 + noisePhase × 1.9)
)
```

Hai ảnh dùng chính xác cùng ambient displacement. Đây là điều kiện để reveal không tạo ghosting.

### 5.4 Blend đúng màu

- Decode texture sRGB.
- Blend trong linear RGB.
- Encode về sRGB ở đầu ra.
- Premultiplied alpha cho layer trong suốt.

Blend trực tiếp trong sRGB dễ tạo dải tối ở vùng chuyển tiếp.

## 6. Giao diện app

### Màn hình 1 — Import

- Drop zone ảnh A và B.
- Kiểm tra kích thước, aspect ratio, alpha và color profile.
- Nút Swap A/B.

### Màn hình 2 — Auto Align

- Overlay A/B với slider.
- Blink compare và difference view.
- Hiển thị điểm chất lượng: Good / Needs review / Poor.
- Control points và transform thủ công.

### Màn hình 3 — Motion Editor

- Preview 30/60 fps.
- Hiển thị flow bằng vector hoặc màu hướng.
- Brush Move, Lock, Reveal, Exclude.
- Pin các landmark quan trọng.
- Timeline chỉ cần Duration, Pause, Strength và Easing.

### Màn hình 4 — Effects

- Reveal radius và feather.
- Ambient motion strength.
- Bloom/glow nhẹ.
- Rain preset tùy chọn.
- Pointer influence.
- Fit mode: Cover / Contain / Smart Crop.

### Màn hình 5 — Export

- Tên wallpaper.
- Quality: 1080p / 1440p / 4K / Native.
- Texture format và giới hạn VRAM dự kiến.
- Nút Export Folder.
- Nút Open Preview.
- Hướng dẫn kéo `index.html` vào Create Wallpaper.

## 7. Kiến trúc đề xuất

### Desktop app

Khuyến nghị cho Windows:

```text
UI: React + TypeScript
Desktop shell: Tauri
Image pipeline: Rust + OpenCV bindings hoặc Python sidecar ở giai đoạn thử nghiệm
AI inference: ONNX Runtime/WinML
Preview: WebView dùng cùng runtime WebGL với file xuất
Export: template HTML/JS/GLSL được version hóa
```

Để làm prototype nhanh, dùng Python + OpenCV cho pipeline và một UI React cục bộ. Khi logic hình ảnh ổn định mới chuyển phần xử lý sang Rust/C++ hoặc đóng Python thành sidecar. Không nên tối ưu công nghệ đóng gói trước khi xác nhận chất lượng morph.

### Module boundaries

```text
ImageLoader
AlignmentEngine
FlowEngine
ConfidenceEngine
MaskEditor
PreviewRenderer
WallpaperTemplate
ExportValidator
```

Mỗi project app lưu một file riêng, ví dụ `.wallproj`, chứa đường dẫn asset, transform, flow settings, mask edit strokes và export settings. Mask chỉnh sửa nên lưu dưới dạng stroke/layer để có thể tính lại ở độ phân giải khác.

## 8. Quality gate tự động

App không nên luôn hứa rằng Auto Morph sẽ đẹp. Dùng score:

```text
alignmentScore = 0.30 × inlierRatio
               + 0.25 × validCanvasRatio
               + 0.25 × photometricConsistency
               + 0.20 × forwardBackwardConsistency
```

Ngưỡng ban đầu cần hiệu chỉnh bằng bộ ảnh thật:

- `≥ 0.78`: cho phép Morph mặc định.
- `0.55–0.78`: đề xuất Interactive Reveal/Hybrid.
- `< 0.55`: yêu cầu control point hoặc chỉ dùng crossfade/reveal không warp.

Các số này là giả thuyết sản phẩm để benchmark, không phải hằng số khoa học.

## 9. MVP nên làm gì

### Có trong MVP

- Nhập A/B.
- Auto global alignment bằng AKAZE/ORB + RANSAC.
- Flow hai chiều bằng OpenCV.
- Confidence map.
- Brush Lock/Reveal và control point.
- WebGL preview.
- Interactive Reveal và Hybrid.
- Export Web Wallpaper offline.
- Respect FPS limit của Wallpaper Engine.
- 3 preset 1080p, 1440p, 4K.

### Chưa cần trong MVP

- Đóng gói `scene.pkg`.
- Tự publish Steam Workshop.
- Text-to-image hoặc sinh ảnh B.
- Audio visualizer.
- Particle editor tổng quát.
- RAFT bắt buộc trên mọi máy.
- Morph nhiều hơn hai ảnh.

## 10. Lộ trình triển khai

### Phase 0 — Spike kỹ thuật, 3–5 ngày

- Shader WebGL nhận A/B và flow map.
- Reveal theo chuột.
- Export folder và nhập thử vào Wallpaper Engine.
- Đo FPS/VRAM ở 1080p và 4K.

Điều kiện qua phase: wallpaper chạy offline, theo đúng FPS limit và không lệch tỉ lệ ở 16:9/21:9.

### Phase 1 — Alignment prototype, 1 tuần

- AKAZE/ORB + RANSAC.
- Affine/homography selection.
- Overlay, difference view, control points.
- Bộ 30–50 cặp ảnh test.

Điều kiện qua phase: mắt/khuôn mặt hoặc landmark chính lệch dưới 2–3 px trên proxy 1080p đối với bộ ảnh “Good”.

### Phase 2 — Flow và confidence, 1–2 tuần

- Forward/backward flow.
- Occlusion/confidence map.
- Edge-aware cleaning.
- Brush Lock/Reveal.
- Loop cosine và Hybrid.

Điều kiện qua phase: không có tear lớn, ghosting ở vùng confidence thấp được che hoặc chuyển sang dissolve.

### Phase 3 — App MVP, 1–2 tuần

- Luồng 5 màn hình.
- Project save/load.
- Preview dùng đúng renderer xuất.
- Preset chất lượng và export validator.
- Crash recovery và progress/cancel khi tính flow.

### Phase 4 — Quality release, 1 tuần

- RAFT-small tùy chọn.
- GPU inference qua WinML/ONNX Runtime, CPU fallback.
- Test GPU Intel/AMD/NVIDIA.
- Benchmark 16:9, 21:9, 32:9 và multi-monitor.
- Installer và sample projects.

Tổng ước lượng: khoảng 5–7 tuần cho một MVP tốt với một người làm full-time, sau khi spike xác nhận WebGL runtime.

## 11. Kiểm thử cần thiết

### Bộ dữ liệu

Ít nhất 50 cặp, chia thành:

- cùng ảnh nhưng crop/scale khác;
- cùng nhân vật, pose gần giống;
- thay trang phục;
- tóc/tay khác vị trí;
- nền giống và nền khác;
- anime, ảnh người thật, phong cảnh;
- texture ít chi tiết và nhiều chi tiết.

### Chỉ số offline

- reprojection error;
- flow forward/backward error;
- tỉ lệ pixel confidence thấp;
- SSIM/LPIPS sau warp chỉ dùng để so sánh nội bộ;
- thời gian xử lý ở 1080p/4K;
- kích thước output.

### Chỉ số runtime

- 30/60 fps theo cấu hình Wallpaper Engine;
- thời gian GPU mỗi frame;
- VRAM;
- không tiếp tục render quá FPS limit;
- resize và thay đổi aspect ratio không làm stretch;
- wallpaper vẫn hoạt động khi không có mạng.

## 12. Rủi ro và cách xử lý

| Rủi ro | Biểu hiện | Cách xử lý |
|---|---|---|
| Hai ảnh không thật sự tương ứng | mặt/tay chảy | confidence gate, control point, fallback Reveal |
| Occlusion | viền đôi, lỗ | bidirectional check, erode mask, dissolve |
| Nền khác nhau nhiều | texture kéo dài | tách subject, lock nền |
| Flow quá mạnh | chóng mặt, méo | clamp 1.5–5%, preset Subtle mặc định |
| 4K tốn VRAM | giật | texture cap, WebP, half-resolution flow |
| Máy không có GPU AI phù hợp | xử lý lâu | OpenCV fallback, model chỉ chạy offline |
| Preview khác Wallpaper Engine | lỗi khi xuất | dùng cùng HTML/WebGL runtime cho preview và output |
| CEF render liên tục | tốn GPU | đọc và áp dụng FPS limit, pause khi không cần |

## 13. Logic sản phẩm hợp lý nhất

Phiên bản đầu nên được định vị là **“two-image interactive wallpaper builder”**, không phải “AI biến mọi cặp ảnh thành morph hoàn hảo”.

Luồng mặc định:

```text
Hai ảnh
  → auto-align
  → chấm điểm độ tương ứng
  → tạo confidence + mask
  → cùng một ambient warp rất nhẹ
  → reveal ảnh B theo chuột
  → export Web Wallpaper
```

Morph toàn màn hình là tùy chọn khi score cao. Cách này cho tỉ lệ thành công lớn nhất, đúng với kỹ thuật của wallpaper mẫu, dễ kiểm soát lỗi hình và đủ đẹp để MVP có giá trị ngay.

## 14. Nguồn kỹ thuật

- Wallpaper Engine, Web Wallpaper overview: https://docs.wallpaperengine.io/web/overview.html
- Wallpaper Engine, tạo và nhập Web Wallpaper: https://docs.wallpaperengine.io/en/web/first/gettingstarted.html
- Wallpaper Engine, FPS limiter: https://docs.wallpaperengine.io/en/web/performance/fps.html
- Wallpaper Engine, user properties: https://docs.wallpaperengine.io/en/web/customization/properties.html
- OpenCV, AKAZE/ORB và RANSAC homography: https://docs.opencv.org/4.12.0/dc/d16/tutorial_akaze_tracking.html
- OpenCV, homography: https://docs.opencv.org/4.13.0/d9/dab/tutorial_homography.html
- OpenCV, dense optical flow: https://docs.opencv.org/4.13.0/d4/dee/tutorial_optical_flow.html
- RAFT paper: https://arxiv.org/abs/2003.12039
- ONNX Runtime trên Windows: https://onnxruntime.ai/docs/get-started/with-windows.html

