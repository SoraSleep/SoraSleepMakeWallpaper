# Motion Pair Studio — UI tối ưu cho hệ thống nhiều wallpaper preset

## 1. Quyết định sản phẩm

Preset hiện tại được giữ nguyên dưới tên **01 — Difference Lens**. App không còn mở thẳng vào editor của preset này. Luồng mới:

```text
Home / Projects → Preset Library → Create Project → Editor → Validate → Export
```

Mỗi preset là một module có contract riêng, nhưng dùng chung asset pipeline, alignment, mask, preview shell và export infrastructure.

## 2. Danh sách preset đề xuất

| Thứ tự | Preset | Input | Desktop | Mobile | Mức ưu tiên |
|---|---|---:|---|---|---|
| 01 | Difference Lens | A + B | Mouse lens | Auto-path video | Đã có |
| 02 | Portal Reveal | A + B | Pointer portal | Auto-path portal | P0 |
| 03 | Before / After Sweep | A + B | Pointer/sweep | Timeline sweep | P0 |
| 04 | Transformation Loop | A + B | Idle loop | Seamless video | P0 |
| 05 | Cinematic Camera | 1–2 ảnh | Mouse parallax | Pan/zoom loop | P1 |
| 06 | Parallax Portrait | 1 ảnh + depth | Pointer depth | Gyro/loop video | P1 |
| 07 | Ambient Particles | 1 ảnh | Reactive particles | Baked video | P1 |
| 08 | Day / Night | Day + night | Time/property | Timed loop | P2 |

## 3. Kiến trúc thông tin mới

### Home / Projects

- Header gọn: logo, New wallpaper, Open project, Settings.
- Recent projects dạng card có thumbnail, preset, target, lần sửa cuối và trạng thái validation.
- Empty state dẫn thẳng tới Preset Library.
- Không hiển thị control chỉnh hiệu ứng tại Home.

### Preset Library

- Tabs: All, Interactive, Mobile, Two-image, Ambient.
- Search theo tên và capability.
- Card tỷ lệ 16:10 với preview động ngắn, badge Desktop/Mobile, số input cần dùng và độ khó.
- Difference Lens đứng đầu với số `01` và badge `Current`.
- Click card mở detail drawer thay vì tạo project ngay.
- Detail drawer có mô tả, input contract, output hỗ trợ, performance tier và nút `Use preset`.

### Create Project

- Step 1: tên project và target Desktop/Mobile/Both.
- Step 2: tải đúng số asset preset yêu cầu.
- Step 3: chọn aspect/preset chất lượng.
- Step 4: kiểm tra quyền thương mại.
- Sau khi đủ dữ liệu mới tạo project và mở editor.

### Editor

- Top bar: Back, project title, preset badge, autosave, undo/redo, Preview, Export.
- Left rail chỉ chứa các phase mà preset cần.
- Center workspace ưu tiên canvas; timeline chỉ xuất hiện với preset có animation.
- Right inspector thay đổi theo selection và phase.
- Bottom status bar hiển thị zoom, FPS, resolution, GPU/encoder capability và validation count.

### Export Center

- Target cards thay cho dropdown: Windows Interactive, Android Video, Store Bundle.
- Quality preset hiển thị resolution, FPS, bitrate, estimated size.
- Validation chia nhóm Content, Visual, Performance, Commercial, Package.
- Chỉ bật `Export` khi target hiện tại pass toàn bộ lỗi blocking.
- Sau export hiển thị file đã tạo, dung lượng, checksum và hướng dẫn cài đặt.

## 4. Layout editor đề xuất

```text
┌──────────────────────────────── Top bar ────────────────────────────────┐
│ Back  Project / Preset  Saved                  Preview  Validate Export │
├──────────┬───────────────────────────────────────────────┬──────────────┤
│ Workflow │                                               │ Inspector    │
│          │                 Canvas                        │              │
│ Assets   │                                               │ Contextual   │
│ Align    │                                               │ controls     │
│ Mask     │                                               │              │
│ Motion   │                                               │              │
│ Effects  │                                               │              │
│ Export   ├───────────────────────────────────────────────┤              │
│          │ Timeline / Keyframes when required            │              │
├──────────┴───────────────────────────────────────────────┴──────────────┤
│ Zoom · 1080×1920 · 30 FPS · H.264 available · 0 blocking issues        │
└─────────────────────────────────────────────────────────────────────────┘
```

Desktop breakpoints:

- `≥1600 px`: rail 220 px, inspector 340 px, timeline 180–240 px.
- `1280–1599 px`: icon rail 72 px, inspector 320 px.
- `<1280 px`: inspector dạng drawer; không thu nhỏ canvas dưới 640 × 360 CSS px.

## 5. Design system

### Visual direction

- Dark neutral workspace để đánh giá màu ảnh chính xác.
- Một accent lime hiện tại cho active/primary action.
- Blue cho information, amber cho warning, red cho blocked, green cho pass.
- Không dùng gradient mạnh trong vùng canvas và inspector.
- Card preset có thumbnail lớn; UI chrome giảm tương phản khi không active.

### Typography

- UI font: Inter hoặc Geist Sans.
- Title 20/26 semibold; section 13/18 semibold; body 12/18 regular; metadata 11/16.
- Không dùng chữ uppercase dài; chỉ uppercase cho micro-label tối đa 18 ký tự.
- Số resolution, FPS và time dùng tabular numerals.

### Spacing và controls

- Grid 4 px; khoảng phổ biến 8/12/16/24.
- Control cao tối thiểu 36 px; action chính 40 px.
- Slider luôn có numeric input để nhập chính xác.
- Focus ring 2 px và mọi icon button có tooltip.
- Trạng thái không chỉ dựa vào màu: luôn có icon và label.

## 6. Preset contract kỹ thuật

Mỗi preset đăng ký một descriptor:

```ts
type WallpaperPreset = {
  id: string;
  version: number;
  name: string;
  category: 'interactive' | 'timeline' | 'ambient';
  inputs: PresetInputDefinition[];
  supportedTargets: ExportTarget[];
  workflow: EditorPhase[];
  defaultSettings: Record<string, unknown>;
  inspectorSections: InspectorSectionDefinition[];
  renderer: RendererAdapter;
  validator: PresetValidator;
  exporter: PresetExporter;
};
```

Không viết thêm `if (preset === ...)` xuyên suốt `App.tsx`. Shell đọc descriptor để dựng rail, inspector, validator và export options.

Project schema bổ sung:

```ts
{
  preset: { id: 'difference-lens', version: 1 },
  target: 'desktop-web' | 'mobile-video' | 'both',
  presetSettings: {},
  exportSettings: {}
}
```

## 7. Kế hoạch triển khai

### U0 — Audit và khóa UX contract, 0.5–1 ngày

- Chụp state hiện tại ở 1280×720, 1440×900 và 1920×1080.
- Liệt kê control nào thuộc shell, Difference Lens và export target.
- Khóa sitemap, preset list P0 và naming.
- Định nghĩa migration: project cũ tự nhận `difference-lens@1`.

**Done:** có inventory component/state; không mất chức năng P0–M7.

### U1 — Preset domain model, 1–2 ngày

- Tạo `PresetRegistry`, `WallpaperPreset` và capability types.
- Đưa Difference Lens vào registry với id ổn định.
- Tách settings riêng khỏi project shell.
- Thêm migration cho autosave và `.wallproj` cũ.
- Test parse/save/load project cũ và mới.

**Done:** đổi preset registry không cần sửa workflow shell.

### U2 — App routing và shell, 2 ngày

- Thêm route/state: Projects, Presets, Create, Editor, ExportResult.
- Tách `App.tsx` thành page và layout component.
- Tạo error boundary theo page.
- Giữ autosave khi chuyển page.
- Thêm command `Back to presets` với dirty-state guard.

**Done:** refresh/restore đưa người dùng về đúng project/editor.

### U3 — Preset Library chuyên nghiệp, 2–3 ngày

- Filter/search/category tabs.
- Preset card, badge target/input/difficulty.
- Preview poster và reduced-motion behavior.
- Detail drawer và `Use preset` CTA.
- Empty/error/loading states.
- Keyboard navigation và focus management.

**Done:** chọn Difference Lens tạo project đúng contract; card hoạt động hoàn toàn bằng bàn phím.

### U4 — Create Project wizard, 2 ngày

- Dynamic asset slots từ preset contract.
- Target và aspect presets.
- Rights declaration trước editor.
- Pair compatibility summary.
- Preserve input khi back/forward.

**Done:** không thể vào editor với input thiếu hoặc sai format.

### U5 — Editor shell refactor, 3–4 ngày

- Workflow rail dựng từ preset descriptor.
- Canvas toolbar tách khỏi top bar.
- Inspector section schema và reusable controls.
- Timeline mount theo capability.
- Status bar thật: FPS, output, encoder và validation.
- Responsive state cho 1280 px.

**Done:** Difference Lens giữ toàn bộ hành vi hiện tại trong shell mới; `App.tsx` không còn component editor khổng lồ.

### U6 — Export Center hợp nhất, 2–3 ngày

- Target cards Desktop/Mobile/Bundle.
- Validator theo target và preset.
- Estimated size, codec capability và fallback format.
- Progress/cancel/retry.
- Result screen liệt kê MP4/WebM/ZIP/manifest.

**Done:** người dùng luôn biết sẽ nhận file nào trước khi bấm Export.

### U7 — Thêm ba preset đầu, 5–7 ngày

- Preset 02 Portal Reveal dùng alignment và difference mask hiện tại.
- Preset 03 Before/After Sweep dùng cùng A/B pipeline.
- Preset 04 Transformation Loop dùng timeline và mobile encoder.
- Mỗi preset có default, controls, validator và output capability riêng.
- Không nhân bản import/alignment/export code.

**Done:** bốn preset cùng tồn tại, mở/save/export độc lập và project không lẫn settings.

### U8 — Visual QA và accessibility, 2–3 ngày

- Test 1280×720, 1440×900, 1920×1080 và 4K scaling.
- Keyboard-only happy path.
- Reduced motion và high contrast.
- Long labels, empty projects, encoder failure, 8K asset và export progress.
- Golden screenshots cho Library, Editor và Export Center.

**Done:** không overflow; không control bị che; focus order đúng; Difference Lens output không đổi.

## 8. Thứ tự build khuyến nghị

```text
U0 → U1 → U2 → U3 → U4 → U5 → U6 → U8
                              ↘ U7 sau khi shell ổn định
```

Không thêm preset 02 trước khi U1 và U5 hoàn tất. Nếu làm trước, state và inspector của preset mới sẽ tiếp tục bị hard-code vào `App.tsx` và chi phí refactor tăng nhanh.

## 9. Acceptance tổng

- Difference Lens được hiển thị là Preset 01 và không mất tính năng P0–M7.
- Tạo preset mới chỉ cần đăng ký descriptor, renderer, validator và exporter.
- Project cũ mở được và tự migrate.
- Preset Library chọn được bằng chuột và bàn phím.
- Editor không overflow ở 1280×720.
- Desktop Web, Mobile Video và Commercial Bundle có luồng export rõ ràng.
- Người dùng nhìn thấy output format, compatibility và lỗi blocking trước export.
- Thêm Portal Reveal không cần sửa component shell cốt lõi.
