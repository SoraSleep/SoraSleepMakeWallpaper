# A0 — Image Dream → MakeWallpaper (SFW)

Ngày kiểm tra: 15/10/2026. Phạm vi: đọc code local, đối chiếu bản cài, chạy unit tests Image Dream. Không chạy tạo ảnh thật, không dùng credits, không đọc cookie hay cấu hình bí mật.

## Bản source đã xác minh

| Ứng dụng | Đường dẫn | Trạng thái |
|---|---|---|
| MakeWallpaper workspace | C:/Users/ADMIN/OneDrive/Documents/ChatGPT/Make Wallpaper | HEAD 4f4f76f |
| MakeWallpaper bản cài | D:/SoraSleep Main/Apps/Wallpaper | HEAD 4f4f76f; chưa xác minh toàn bộ working tree giống workspace |
| Image Dream workspace | C:/Users/ADMIN/OneDrive/Documents/ChatGPT/SoraSleep-Image-Dream | HEAD 4384c89, nhiều thay đổi local chưa commit; phần tích hợp mới nằm trong working tree |
| Manager bản cài/source | D:/SoraSleep Main/Manager | Electron/React, adapters và pipeline modules |
| Manager thư mục Documents | C:/Users/ADMIN/OneDrive/Documents/ChatGPT/SoraSleep Manager | Chỉ thấy docs/ui-checks, không coi là runtime source |

Không pull/reset Image Dream vì working tree đang có thay đổi của người dùng. README có mô tả handoff mới hơn code MakeWallpaper workspace; không coi mô tả là bằng chứng endpoint đã có ở bản chạy.

## Khả năng thực tế

- Image Dream: Express + Playwright điều khiển Dreamina, chưa phải adapter chính thức tới API tạo ảnh. Có /api/models, /api/batch/start, pause/resume/stop, /api/events, /api/gallery, /api/integrations/assets, /api/health.
- Metadata ảnh v1 đã có assetId/hash, MIME, kích thước thực, prompt/model, rightsStatus và aspect validation. Có manifest ZIP và final/draft.
- API nhận referenceImages và có upload-reference, nhưng đường tạo ảnh thật được đọc chỉ fill prompt/click Generate; referenceImages được log trong simulateGeneration. Chưa chứng minh real image-reference hoặc masked edit/inpaint hoạt động.
- Tham số model/aspect/resolution/imageCount được validate và lưu task; cần xác minh riêng việc áp dụng chúng vào giao diện provider trong generation thực. Unit/mock pass không chứng minh lựa chọn provider thực.
- Chưa thấy hợp đồng tạo B từ A, mask edit, parentAssetId hay job kết quả bền vững theo request ID. /api/status chứa activeAccount/accounts trực tiếp: cần kiểm tra/sanitize trước khi dùng làm telemetry pipeline, không lấy endpoint này vào manifest.
- Manager adapter Wallpaper hiện quảng bá health/outputs, jobsPath=null. Bridge Wallpaper /jobs trả 501. Manager chưa có điều phối create-render-export tự động cho flow này.
- Wallpaper hiện có bridge lưu project/export, chưa có job submission/headless render contract cho A1. manager-preview chỉ là server preview, không phải bằng chứng video render service.
- Autosave hiện một project; export 01 desktop còn logic kính cũ. A1 phải dùng fixture và đánh dấu output thử nghiệm cho tới renderer parity đạt.

## Quyết định kiến trúc A0

1. MVP SFW, dùng Hidden Reveal và Portal Window; trạng thái cuối là needs_review, không tự đăng bán.
2. Manager giữ job/product/revision và điều phối. Image Dream tạo ảnh; Wallpaper dựng hình. Một job chạy mỗi lần ở MVP.
3. A1 dùng bundle portable có A/B/mask chuẩn và không gọi provider. Chạy theo bước kiểm chứng thay vì nhảy thẳng vào gen AI.
4. A2 chỉ mở auto-B khi provider adapter chứng minh reference/edit thật. Nếu chưa có, trả capability_missing và giữ bước duyệt/chỉnh B thủ công. Không tạo hai ảnh độc lập rồi đánh dấu paired.
5. Dữ liệu asset dùng file bytes + sha256 + đường dẫn tương đối trong bundle; không đưa cookie, account, token, URL tạm thời hoặc đường dẫn tuyệt đối vào contract portable.
6. Giá/provider limits chưa được xác minh; không coi costPerPrompt hardcode là giá thật. Lưu attempts và usage thực; budget chỉ dùng được khi adapter có số liệu đáng tin.

## Hợp đồng v1 đề xuất (chưa phải API đã triển khai)

Bundle gồm manifest.json và assets/. Manifest chứa:

- schemaVersion=1, jobId, productId, revision, idempotencyKey, createdAt.
- contentScope=sfw; prompt; style; presetId (difference-lens|portal-reveal).
- assets: imageA,imageB,differenceMask; mỗi asset gồm assetId, sha256, relativePath, mimeType,width,height,bytes,role,parentAssetId (B trỏ A).
- provenance: producer, producerVersion, modelId, generationRequestId, createdAt, rightsStatus (unreviewed|verified|rejected); không tự đặt verified.
- canvas: aspect, fit, focalPoint; alignment theo UV output→source được version hóa.
- maskReview: status pending|approved, asset hashes đã duyệt. Thay A/B phải invalidate approval.
- outputProfiles: IDs được whitelist; presetSettings; rendererVersion; budget.maxAttempts.
- review: artworkStatus, rightsStatus, productStatus; trạng thái xuất thương mại chỉ mở khi gate phù hợp đã đạt.

Validation: từ chối schema lạ, ID sai, traversal/absolute paths, asset thiếu, hash/MIME/kích thước sai; cùng idempotencyKey không tạo job mới. Rights không xác định phải được giữ nguyên để duyệt.

API A1 dự kiến: capabilities; submit bundle; get job; cancel; list artifacts. Endpoint/version cụ thể chốt khi triển khai adapter, không giả định health=render capability.

## A1 backlog sẵn sàng triển khai

1. Viết schema/validator và fixture bundle SFW chuẩn, test hợp lệ/sai path/hash/missing asset/unknown version.
2. Chọn workspace Wallpaper làm source triển khai; ghi rõ cách cập nhật bản cài D: và kiểm tra health.version/buildCommit trước test.
3. Thêm durable job store với snapshot, trạng thái queued/running/failed/cancelled/needs_review và artifact report.
4. Thêm capabilities và submit/status/cancel APIs loopback; chưa bật generation ngoài.
5. Adapter Manager gọi fixture job, lưu artifact và revision; idempotent retry.
6. Tách export khỏi download side effect; dùng renderer đã kiểm chứng. Không gọi output thương mại khi renderer 01 chưa đồng nhất.
7. Gate A1: fixture đi từ job tới bundle/artifact trong Manager; restart/retry không trùng; cancel không giữ tài nguyên; lỗi có report.

## Kiểm chứng và giới hạn

Image Dream npm test: 11/11 pass (metadata, simulation, health, handoff). Không kiểm tra provider thật/reference editing, không đo chi phí hoặc thời gian tạo ảnh. A0 discovery và contract proposal hoàn tất; năng lực tạo A/B tự động vẫn là gate chưa đạt cho A2.
