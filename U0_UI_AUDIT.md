# U0 — UI audit và UX contract

Status: **Complete**  
Scope: khóa kiến trúc trải nghiệm trước khi refactor nhiều preset.

## Baseline đã lưu

- `ui-audit/baseline/editor-1280x720.png`
- `ui-audit/baseline/editor-1440x900.png`
- `ui-audit/baseline/editor-1920x1080.png`

Các ảnh là mốc regression cho U1–U8. Chúng không phải mockup UI mới.

## Kết luận audit

1. `App.tsx` đang giữ project state, processing jobs, editor shell, inspector của năm phase và export orchestration trong một file hơn 50 KB.
2. Workflow hiện tại mặc định Difference Lens: `Import → Align → Difference → Lens → Export`. Preset mới sẽ buộc thêm nhiều nhánh điều kiện nếu giữ cấu trúc này.
3. Ở 1280×720, workflow panel khoảng 226 px và inspector khoảng 306 px làm preview chỉ còn khoảng 748×466 px. Canvas vẫn dùng được nhưng thiếu chỗ cho timeline hoặc preset browser.
4. Top bar chứa quá nhiều nhiệm vụ: project switcher, autosave, reset, open, save, preview và export.
5. Left panel đang trộn workflow navigation, asset management và pair quality. Ba nhóm này có lifecycle khác nhau.
6. Inspector đang vừa hiển thị preset mode, phase control, renderer metrics và export validator; khó tái sử dụng cho preset khác.
7. Mobile/desktop target chỉ xuất hiện muộn ở Export, trong khi target ảnh hưởng aspect, motion và validation từ lúc tạo project.
8. Điểm mạnh cần giữ: dark canvas, accent lime, live performance status, phase-based authoring, clear validation state và preview trung tâm.

## UX contract đã khóa

### Product hierarchy

```text
Projects
  → Preset Library
    → Create Project
      → Editor
        → Export Center
          → Export Result
```

### Preset naming

- Preset hiện tại: `01 — Difference Lens`.
- Stable id: `difference-lens`.
- Version khởi đầu: `1`.
- `Difference Lens` là tên hiển thị; không đổi thành Motion Pair hoặc Lens Reveal trong schema/UI khác.

### Preset P0 tiếp theo

1. `difference-lens` — hiện tại.
2. `portal-reveal` — dùng A/B, alignment và mask.
3. `before-after-sweep` — dùng A/B và alignment.
4. `transformation-loop` — dùng A/B, timeline và mobile encoder.

### Navigation rules

- App mở vào Projects nếu chưa có project đang hoạt động.
- New wallpaper luôn mở Preset Library.
- Chọn preset chưa tạo project; detail panel phải giải thích input/output trước.
- Project được tạo sau khi input contract tối thiểu hợp lệ.
- Editor rail chỉ hiển thị phase mà preset khai báo.
- Export Center là page/overlay riêng, không nằm trong inspector dài.
- Back từ Editor về Projects không hủy autosave.
- Project có lỗi migrate phải mở read-only recovery state, không silently reset.

### Responsive rules

- `≥1600`: expanded workflow rail + fixed inspector.
- `1280–1599`: icon rail + fixed inspector.
- `<1280`: icon rail + inspector drawer.
- Canvas workspace phải giữ tối thiểu 640×360 CSS px.
- Timeline chỉ chiếm chiều cao khi preset có timeline capability.

## Ownership inventory

| Thành phần hiện tại | Owner mới | Ghi chú |
|---|---|---|
| Brand, project title, autosave | App shell | Dùng mọi preset |
| Open/Save project | Project service | Không nằm trong preset |
| Workflow rail | Editor shell | Dựng từ preset descriptor |
| Asset A/B cards | Asset phase | Slot động theo input contract |
| Alignment controls/jobs | Shared processing module | Chỉ mount khi preset cần alignment |
| Difference regions/brush | Difference-mask module | Difference Lens và Portal dùng chung |
| Lens radius/zoom/feather | Difference Lens preset | Không thuộc global shell |
| Mobile motion path | Timeline capability | Dùng lại cho preset timeline |
| WebGL renderer metrics | Preview status | Dùng chung, adapter theo renderer |
| Desktop ZIP export | Desktop exporter | Capability `desktop-web` |
| MP4/WebM export | Mobile exporter | Capability `mobile-video` |
| Commercial validator | Export Center | Kết hợp global + preset + target checks |
| Safe area | Canvas/target settings | Có từ lúc Create Project |

## State inventory

### Global/project state

- Project identity: id, title, createdAt, updatedAt.
- Selected preset id/version.
- Selected target: desktop, mobile hoặc both.
- Assets và rights.
- Canvas/aspect/safe area.
- Autosave and hydration state.

### Shared processing state

- Alignment settings, metrics, progress và abort controller.
- Difference settings, result, regions, strokes và progress.
- Renderer performance/capabilities.
- Export progress/result.

### Difference Lens-only state

- Radius, feather, magnification, reveal intensity và follow speed.
- Comparison/difference preview mode.
- Mask brush mode, size và hardness.
- Auto motion path/duration/loop cho mobile.

### Ephemeral UI state

- Current page và active editor phase.
- Open drawer/dialog.
- Current canvas view mode.
- Notice/toast.
- Selected inspector object.

Ephemeral UI state không được ghi chung vào portable `.wallproj`, trừ layout preference có namespace riêng.

## Workflow capability matrix

| Phase | Difference Lens | Portal | Sweep | Transform Loop |
|---|---:|---:|---:|---:|
| Assets | ✓ | ✓ | ✓ | ✓ |
| Canvas | ✓ | ✓ | ✓ | ✓ |
| Align | ✓ | ✓ | ✓ | ✓ |
| Difference Mask | ✓ | ✓ | Optional | Optional |
| Motion | Desktop pointer / mobile path | Path/timeline | Timeline | Timeline |
| Effects | Lens | Portal | Divider | Blend/warp |
| Validate | ✓ | ✓ | ✓ | ✓ |
| Export | Web/video/bundle | Web/video/bundle | Web/video/bundle | Video/bundle |

## Migration contract cho project cũ

Mọi project schema hiện tại không có `preset` sẽ được đọc như:

```json
{
  "preset": { "id": "difference-lens", "version": 1 },
  "target": "both"
}
```

Mapping:

- `lens` → `presetSettings.lens`.
- `mobileMotion` → `presetSettings.mobileMotion`.
- `mobileRender` → `exportSettings.mobileVideo`.
- `alignment`, `difference`, `assets`, `canvas` tiếp tục là shared project data.
- Không xóa field cũ ở migration đầu; writer mới chỉ dùng schema mới sau khi round-trip test pass.
- Autosave cũ và file `.wallproj` phải migrate bằng cùng một function.
- Migration thất bại trả structured error và giữ nguyên source object.

## Những chức năng không được regress

- Import A/B và rights gate.
- ORB + RANSAC alignment cùng manual transform.
- Difference analysis và Reveal/Erase/Protect strokes.
- Difference Lens WebGL preview.
- Mobile safe area và auto motion.
- Desktop offline ZIP.
- Mobile MP4/WebM fallback và distribution bundle.
- Commercial validator, progress, cancel và autosave.

## Quyết định cho U1

- Tạo `src/presets/types.ts` và `src/presets/registry.ts`.
- Tạo descriptor `src/presets/differenceLens.ts` trước khi di chuyển UI.
- Nâng project schema bằng migration function thuần, có test fixtures JSON.
- Chưa thay đổi visual layout trong U1; U1 chỉ tạo domain boundary và giữ output hiện tại.
- Không triển khai preset 02 trước khi Difference Lens chạy qua registry.

## Definition of Done U0

- [x] Baseline ở 1280×720, 1440×900 và 1920×1080.
- [x] Current component/state inventory.
- [x] Shell/shared/preset ownership map.
- [x] Sitemap và navigation rules.
- [x] Preset 01 cùng ba preset P0 tiếp theo.
- [x] Legacy migration contract.
- [x] Non-regression list cho U1.
