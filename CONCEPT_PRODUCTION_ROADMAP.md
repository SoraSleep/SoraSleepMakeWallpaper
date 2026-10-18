# SoraSleep — kế hoạch sản xuất theo concept

Ngày lập: 16/10/2026. Đây là kế hoạch đề xuất, chưa phải thông báo các tính năng đã được triển khai.

## 1. Mục tiêu và giới hạn

Một danh sách prompt trong Manager phải tạo thành bộ sản phẩm có concept thống nhất, có lựa chọn loại sản phẩm, có kiểm tra chất lượng và có thể tiếp tục sau khi lỗi. Không coi “đã có file” là “đã đủ điều kiện bán”.

Ba workflow độc lập:
1. Landscape Collection: phong cảnh → ảnh tĩnh + wallpaper chuyển động nhẹ.
2. Stock Collection: ảnh được lựa chọn → master + metadata + hồ sơ nộp theo kênh.
3. Character Wardrobe Reveal: nhân vật trưởng thành A → thay trang phục trong mask → B → hiệu ứng reveal. Trước mắt là thời trang/glamour không khỏa thân; nội dung người lớn nếu phát triển sau phải có workflow, provider và kênh phân phối riêng.

Concept không phải preset. Concept quy định nội dung/phong cách; workflow quy định cách tạo; motion preset quy định cách chuyển động; export profile quy định nền tảng và định dạng.

## 2. Bằng chứng từ ứng dụng hiện tại

- MakeWallpaper planner chỉ nhận portal-reveal/difference-lens và luôn dựng kế hoạch A/B có mask.
- Manager hiện yêu cầu variantChange ngay cả khi người dùng chỉ muốn phong cảnh/stock.
- Đầu nối installed Image Dream đã test tạo A thành công: Seedream 5.0 Lite, 1440×2560, 15 credits trong lượt test.
- Reference B Seedream 4.7 đã chạy thật: 5 credits trong lượt test, cùng kích thước nhưng tự thêm cành hoa và đổi các vùng ngoài yêu cầu.
- Báo giá phải lấy tại thời điểm chạy; các con số trên không phải giá cố định.
- Hai preset xuất diagnostic MP4 và desktop, test nhấn/thả trong Edge đạt. Chưa chứng nhận host Wallpaper Engine hay điện thoại thật.
- Sales bundle hiện có giới hạn tổng 64 MiB; không phù hợp bộ nhiều sản phẩm nếu giữ nguyên cách đóng gói toàn bộ trong RAM/base64.
- PNG gốc hiện làm gói desktop một cảnh khoảng 66 MB; cần tối ưu ảnh theo khả năng alpha và chia gói theo sản phẩm.
- 1440×2560 = 3.6864 MP; chưa đạt mức tối thiểu 4 MP của Adobe Stock. Watermark còn hiện rõ trên file gốc đã dùng trong lượt test. Kiểm tra bổ sung xác nhận installed Image Dream có công cụ Chỉnh vùng (OpenCV Telea, preview/save thủ công); đầu nối hiện lấy file gốc theo task, chưa chọn bản chỉnh đã duyệt. Không cần xây lại công cụ này từ đầu. Chất lượng xử lý watermark trên từng ảnh thật vẫn cần duyệt.

## 3. Dữ liệu concept và sản phẩm

Collection lưu: collectionId, title, season, theme, mood, palette, styleGuide, exclusions, workflow, intendedChannels, licenseProfile, revision.
Scene lưu: sceneId, sourcePrompt, expandedPrompt, aspectRatio, composition, focalPoint, safeAreas, motionRecipe, generationSettings, approvedAssetIds.
Variant lưu: variantId, parentSceneId, editIntent, maskId, providerJobId, actualModel, quotedCredits, actualCostIfKnown, reviewStatus.
Product lưu: productId, sku, collectionId, sceneIds, productType, exportProfile, version, generatedFiles, hashes, QA, listingMetadata, compatibilityEvidence.

Không đồng nhất một job với một sản phẩm. Một scene được duyệt có thể tạo ảnh tĩnh, video và desktop; mỗi đầu ra có QA riêng.
Không coi cùng prompt/seed là bảo đảm cùng bố cục. Chỉ lưu seed khi provider thực sự trả về.

## 4. Workflow phong cảnh

Luồng: nhập prompt → kiểm tra trùng → dựng concept → duyệt brief → tạo ảnh preview nhỏ theo số lượng giới hạn → duyệt ảnh → chọn motion recipe → đánh dấu vùng chuyển động → xem loop → xuất → QA → đóng collection.

Không cần B cho chế độ mặc định. Một ảnh A và các vùng hiệu ứng là đủ cho motion 2D ở giai đoạn đầu.

Motion recipe đề xuất:
- Spring Sakura: cánh hoa phía trước, đom đóm rất nhẹ nếu là cảnh đêm, chuyển động mặt nước chỉ trong mask nước.
- Summer Coast: highlight mặt biển, mây trôi chậm; khóa kiến trúc/đường chân trời.
- Autumn Forest: lá rơi, sương thấp, chuyển động nhẹ; không uốn cả ảnh.
- Winter Cabin: tuyết nhiều lớp, ánh sáng cửa sổ dao động nhẹ; khóa mái nhà/người.
- Rainy City: mưa, giọt sáng, phản chiếu vùng đường; không làm chữ/biển hiệu biến dạng.
- Moon Garden: ánh sáng nhỏ, hạt bụi; không bắt buộc mọi cảnh đều có parallax.

MVP chỉ làm Spring Sakura: particles + masked water shimmer + light breathing. Không làm mô phỏng vật lý đầy đủ hay image-to-video AI ngay từ đầu.
Nếu dùng parallax thực: cần lớp tiền cảnh/chủ thể/nền và ảnh nền được lấp vùng che. Không quảng cáo dịch nguyên ảnh là 3D parallax.
Vùng chuyển động nước, vùng cấm và mật độ hạt do người dùng xác nhận; tự nhận diện chỉ là gợi ý.
Các chu kỳ chuyển động và tuổi hạt phải tạo loop lặp được; không chỉ fade đen ở điểm nối.

## 5. Concept mẫu: Spring Sakura — Quiet Japan

Style chung: tranh phong cảnh thanh bình, hồng phấn/tím nhạt, không người, không chữ, không logo, hình học nhà cửa rõ, có vùng trống cho UI.
Ba nhóm hình ảnh: bình minh bên hồ, sân vườn nắng nhẹ, trăng đêm bên trà thất.
Pilot 3 scene × 1 tỷ lệ 9:16. Sau khi đạt mới làm thêm bố cục 16:9 riêng; không kéo giãn ảnh dọc.
Collection phát hành đầu: khoảng 8–12 scene tốt, không cam kết số lượng trước khi duyệt.
Thay đổi scene bằng góc máy, kiến trúc, thời tiết, điểm nhấn; không tạo hàng chục bản gần giống chỉ đổi màu.

Ví dụ prompt:
1. Original SFW landscape illustration of a quiet Japanese tea garden at spring dawn, pale pink cherry blossoms framing a small pond, warm mist, soft pastel light, no people, no text, no logos, portrait composition with clear upper-center sky for a phone clock.
2. Original SFW landscape illustration of a wooden footbridge crossing a tranquil spring stream, cherry blossom trees along both banks, delicate petals, natural perspective, serene afternoon light, no people, no text, no logos, portrait composition with a clean central focal path.
3. Original SFW landscape illustration of a secluded tea house beside a moonlit lake in cherry blossom season, lavender sky and soft pink blossoms, subtle reflected window light, stable architecture, no people, no text, no logos, portrait composition with quiet space above the horizon.

Prompt style chung được lưu theo revision. Chỉnh scene prompt không được âm thầm đổi brief của cả collection.

## 6. Stock Collection

Hai mục đích khác nhau:
- Art pack tự bán: ảnh theo concept và giấy phép sử dụng do người bán chọn; cần minh bạch không bán quyền sở hữu độc quyền nếu không có cơ sở.
- Marketplace stock: nộp từng ảnh đã tuyển chọn, metadata và khai báo theo quy định hiện tại từng nền tảng. Không bảo đảm được duyệt.

Mỗi asset có title, orderedKeywords, description, category, season, orientation, copySpace, aiGenerated, fictionalSubjects, sourceModel, sourcePromptHash, rightsReview, watermarkStatus, megapixels.
Từ khóa dựa vào ảnh thực tế; prompt không chứng minh trong ảnh có vật thể đó. Các mục chưa chắc cần người duyệt.
Xuất JPEG sRGB chất lượng cao; giữ master có checksum. Đánh giá chi tiết ở 100%, màu, banding, lỗi kiến trúc và vật thể lặp.
Profile Adobe minh họa yêu cầu >=4 MP và không watermark; tạo nguồn đủ độ phân giải nếu hỗ trợ, không đơn thuần phóng ảnh để qua kiểm tra kích thước.
Không trộn JPG stock với ZIP wallpaper tương tác khi nộp stock.
Chặn trùng chính xác bằng hash; cảnh báo gần trùng bằng perceptual hash/embedding, vẫn cho duyệt có lý do.
Không tự phát hành nội dung. Chuẩn bị gói sẵn để người dùng duyệt và đăng là mục tiêu giai đoạn này.

## 7. Character Wardrobe Reveal

Chỉ dùng nhân vật trưởng thành rõ ràng; ưu tiên nhân vật hư cấu hoặc nguồn đã có quyền sử dụng. Với người thật, cần quyền và đồng ý cho kiểu chỉnh sửa dự định.
Ví dụ giai đoạn đầu: đổi áo khoác sang váy dạ hội, trang phục party, thời trang beachwear người trưởng thành không khỏa thân; “sexy hơn” phải được đổi thành mô tả trang phục cụ thể trước khi gửi provider.

Luồng:
1. Nhập A, chọn character workflow, khai báo nguồn.
2. Mô tả trang phục đích; preview thay đổi dự kiến.
3. Mask riêng trang phục; khóa mặt, tóc, tay, nền, đường nét cơ thể ngoài vùng được duyệt.
4. Báo giá và kiểm tra capability masked-edit. Overall-reference không được gắn nhãn masked edit.
5. Tạo B candidate một lượt. Provider không hỗ trợ thì chuyển needs_provider/manual_B, không lén gọi text-to-image.
6. Kiểm tra lệch hình học, identity, đường viền, giải phẫu, vùng da/trang phục và phạm vi thay đổi.
7. Nếu vùng bên trong đạt: composite với A ngoài mask để bảo toàn pixel; giữ feather trong biên vùng cho phép và kiểm tra viền lần nữa.
8. Duyệt cặp cuối; xuất Difference Lens hoặc Portal Reveal hiện có.

Mask không tự sửa mọi lỗi: nếu trang phục mới cần đường viền rộng hơn mask, phải sửa mask; compositing ngoài mask không khắc phục nội dung sai phía trong.
So sánh pixel ngoài mask trên buffer lossless trước JPEG. Sau JPEG dùng sai số do nén, không đòi equality của file JPEG.
Đổi màu quần áo có thể có công cụ màu theo vùng riêng, không gọi đó là AI thay kiểu trang phục.
Tách rating nội dung khỏi preset hiển thị. Giữ contract SFW hiện tại; không đổi toàn cục contentScope để mở nhánh nhạy cảm.

## 8. UI đề xuất

Manager là trung tâm queue và collection; Image Dream là nơi sinh/chỉnh ảnh; MakeWallpaper là nơi dựng motion, xem thử và xuất.
Màn đầu: Landscape Collection / Stock Collection / Character Wardrobe Reveal.
Wizard sáu bước: Concept → Prompts → Images → Motion hoặc Edit → Quality → Package.
Landscape hiển thị recipe chuyển động, Stock ẩn điều khiển A/B và motion, Character mới hiển thị ảnh A/B + mask + preserve regions.
Gallery theo collection: ảnh, trạng thái, credits đã biết, lỗi, revision, nút duyệt hoặc sửa từng scene.
Trang Package cho chọn mục đích và thiết bị; hiển thị kích thước file và chứng cứ đã test, không dùng một badge “mobile supported” chung.
Queue cần Pause after current, Cancel remaining, Retry render only, Recover download, Regenerate with confirmation và chi phí mới.

## 9. Kiến trúc vận hành

Manager orchestration API nội bộ là đường chính. MCP nếu thêm sau chỉ điều khiển cùng API, không tạo queue thứ hai.
Giữ appId/version/capabilities; ưu tiên đúng installed Image Dream 17897, không tự fallback sang source/demo.
Thêm workflowType, collectionId, recipeVersion, assetRevision vào contract mới; migrate dữ liệu cũ thành workflow pair-reveal thay vì phá project hiện có.
Queue tách generation, download, image-review, render, device-review, package. Resume chỉ tiếp tục bước chưa xong.
Persist ý định gửi trước khi generate; không tự gửi lại khi trạng thái request chưa rõ. Render được retry độc lập mà không gen lại ảnh.
Mỗi batch có ngân sách, báo giá live, giới hạn số attempts, dừng khi hết credits/cần xác minh/challenge. Không coi nhiều account là lý do chạy vô hạn.
Upload/download và bundle lớn dùng file/stream, không giữ mọi ảnh/video base64 trong RAM.
Fingerprint render từ ảnh/mask/settings/recipe version; tái sử dụng kết quả đúng revision.

## 10. Định dạng và tương thích

Windows tương tác: gói Web Wallpaper offline có index.html, runtime, project.json và assets, cần test trong host thực.
Android: MP4 H.264 và ảnh poster, nhập bằng app wallpaper phù hợp và test thiết bị thật. Không hứa chạy nguyên gói web hay tương tác chuột.
iPhone: ảnh tĩnh trước; Live Photo là nhánh xuất riêng cần phát triển/test. MP4 không phải Live Photo.
Stock: JPEG sRGB + CSV metadata theo kênh.
Art collection: JPG/PNG được chọn + contact sheet + license + metadata + hướng dẫn.
Không gọi bản upscale từ nguồn thấp là native 4K. Giữ kích thước native trong manifest.
Tách preview công khai và file giao khách. Mỗi sản phẩm có SKU, version, manifest và checksum.
Etsy profile hiện tại: tối đa 5 file, 20 MB/file. Cần chia gói hoặc chọn kênh giao hàng phù hợp, không chỉ cắt byte ZIP thành part khó dùng.

## 11. Lộ trình task và tiêu chí hoàn thành

Ước lượng cho một người phát triển, là khoảng công sức dự kiến; phụ thuộc test provider và thiết bị, không phải lịch cam kết.

### C0 — Chuẩn hóa workflow và dữ liệu (2–3 ngày)
- C0.1 Backup schema/project/queue mẫu, ghi acceptance cho project cũ.
- C0.2 Tách collection, workflow, motion preset, export profile.
- C0.3 Bỏ yêu cầu variantChange cho landscape/stock; giữ cho pair.
- C0.4 Migration và versioned capabilities.
- C0.5 Contract tests: cùng list prompt tạo được ba loại plan, dữ liệu cũ vẫn mở.
Gate: chưa cần generate mới; không có luồng stock/landscape bị ép tạo B.

### C1 — Concept và nhập prompt (2–4 ngày)
- C1.1 Wizard chọn workflow và concept brief.
- C1.2 Paste TXT/CSV; kiểm tra trống/trùng/độ dài, cho sửa từng dòng.
- C1.3 Style guide dùng chung và prompt từng scene có revision.
- C1.4 Chọn tỷ lệ, safe area, ngân sách; preview toàn bộ job trước chạy.
- C1.5 Collection gallery và duyệt shortlist.
Gate: import/reopen/pause không mất prompt; chỉ sinh số ảnh đã duyệt và trong ngân sách.

### C2 — Landscape motion MVP (4–6 ngày)
- C2.1 Asset pipeline một ảnh, renderer và schema không phụ thuộc B.
- C2.2 Sakura particles có seed ổn định, mật độ/tốc độ/độ sâu.
- C2.3 Mask nước và shimmer; light breathing trong vùng chọn.
- C2.4 Safe regions, reduced motion, adaptive quality, pause khi ẩn.
- C2.5 Loop preview và export video/desktop offline.
- C2.6 Test loop seam, pause/resume, CPU/GPU và memory trong 30 phút trên máy đích.
Gate: 3 scene pilot, loop không giật rõ tại điểm nối, không rung nhà/đường chân trời, không có bước render làm phát sinh ảnh mới.

### C3 — Stock và đóng collection (3–5 ngày)
- C3.1 Validation độ phân giải, watermark status và chất lượng từng kênh; nối bước chọn bản chỉnh đã duyệt từ công cụ Chỉnh vùng có sẵn, giữ quan hệ source/derivative. Không tự đánh dấu mọi file đã chỉnh là sạch toàn bộ watermark.
- C3.2 Metadata editor, AI disclosure và keyword review.
- C3.3 Near-duplicate cảnh báo, shortlist và contact sheet.
- C3.4 Export JPEG/CSV/art pack với quyền và revision rõ.
- C3.5 Streaming bundle và chia gói theo giới hạn kênh.
Gate: mỗi file trong gói có manifest/checksum; ảnh chưa đủ điều kiện không vào nhóm ready; không phát hành tự động.

### C4 — Wardrobe masked-edit (4–7 ngày sau spike)
- C4.1 Spike 1–2 ngày: xác minh Dreamina masked inpainting thật và quyền dùng output; nếu chưa đủ thì hỗ trợ manual B adapter trước.
- C4.2 UI mask + protected regions + mô tả trang phục đích.
- C4.3 Submit/recovery theo task ID, capability thật, không fallback text-to-image.
- C4.4 Kiểm tra trước composite, composite có biên kiểm soát, kiểm tra sau composite.
- C4.5 Pair QA và revision; dùng hai reveal preset sẵn có.
- C4.6 Pilot 3 ảnh nhân vật trưởng thành có nguồn phù hợp; duyệt thủ công từng cặp.
Gate: ngoài mask lossless không đổi; mặt/tay/nền giữ nguyên; vùng trang phục và đường viền được duyệt. Nếu spike thất bại, không công bố auto outfit.

### C5 — Release pilot và test thiết bị (3–5 ngày)
- C5.1 Windows Wallpaper Engine thực: import, offline, nhiều tỷ lệ, pause và sleep/wake.
- C5.2 Một Android thật: import MP4, loop, khóa/mở màn hình, chạy 30 phút, ghi máy/OS/app.
- C5.3 iPhone ảnh tĩnh; Live Photo chưa triển khai thì không ghi hỗ trợ động.
- C5.4 Failures: mất mạng trước/sau submit, restart Manager, hết credits, queue provider đang bận, download fail và hết dung lượng.
- C5.5 Pilot Spring Sakura: 3 scene trước, mở rộng bộ sau khi xem chất lượng; thêm 3 cặp nhân vật nếu C4 đạt.
- C5.6 Listing preview, hướng dẫn cài, file giao khách và manifest; duyệt phát hành riêng.
Gate: báo cáo PASS/FAIL theo sản phẩm và thiết bị, không suy từ test Edge sang hỗ trợ điện thoại.

Tổng khoảng 4–7 tuần công việc tuần tự cho bản pilot hoàn chỉnh; landscape + art pack có thể phát hành trước khi auto wardrobe đạt.

## 12. Thứ tự ưu tiên

C0 → C1 → C2 → C3 → C5 landscape. Làm spike C4 khi có đủ thời gian và capability; không chặn cả dòng phong cảnh vì bài toán đổi trang phục.
Sau pilot: thêm autumn/winter recipe, batch composition ngang/dọc, render cache, catalog tìm kiếm, profile kênh bán. Chưa cần làm mọi mùa, native Android app hay AI video hàng loạt ngay.

## 13. Nguồn đối chiếu

- Wallpaper Engine Web offline và project.json: https://docs.wallpaperengine.io/en/web/first/gettingstarted.html
- Các loại wallpaper: https://docs.wallpaperengine.io/
- Apple Live Photo wallpaper: https://support.apple.com/en-sa/120734
- Adobe Stock illustration: https://helpx.adobe.com/stock/contributor/submit-your-content/submit-illustrations/technical-legal-requirements-illustration-submission.html
- Adobe AI requirements: https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/adobe-stock-generative-ai-faq.html
- Etsy digital files: https://help.etsy.com/hc/en-in/articles/115015628347-How-to-Manage-Your-Digital-Listings
- Dreamina commercial use: https://dreamina.capcut.com/help
- Dreamina watermark information: https://dreamina.capcut.com/clause/dreamina-user-safety-guide

Các profile kênh phải lưu ngày kiểm tra và được rà lại trước phát hành. Điều kiện thương mại phụ thuộc feature/model/điều khoản áp dụng, không suy từ việc có free credits.
