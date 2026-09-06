# Phân tích wallpaper “Reze Chainsaw Man Ultrawide XRAY”

## 1. Kết luận nhanh

Wallpaper này là một **Scene Wallpaper 2D** của Wallpaper Engine, không phải video và không dùng rig xương. Cảm giác ảnh đang sống được tạo bởi bốn nhóm kỹ thuật:

1. Biến dạng tọa độ ảnh (UV distortion) có mask cho nền và nhân vật.
2. Keyframe lặp điều khiển cường độ biến dạng của nhân vật.
3. Particle mưa rơi nhanh ở phía trước.
4. Lens flare chuyển động, phản ứng với chuột, sau đó được bloom làm phát sáng.

Camera parallax, camera shake và hệ thống gió toàn cảnh đều tắt. Chuyển động nhìn thấy đến từ shader cục bộ và particle.

## 2. Cấu trúc scene

- Canvas trực giao: `7083 × 1992`, tỉ lệ khoảng `3.56:1`, phù hợp màn hình ultrawide rất rộng.
- Nền: một ảnh `7083 × 1992`.
- Nhân vật chính: PNG trong suốt `1296 × 1976`, đặt gần giữa canvas.
- Hai ảnh nhân vật thay thế có cùng kích thước và vị trí để dùng với hiệu ứng X-ray.
- Một particle system tạo mưa phối cảnh.

Thứ tự xử lý trực quan:

```text
Ảnh nền
  → Foliage Sway (lay động theo noise + mask)
  → Radial Blur (chỉ vùng được mask)
  → Lens Flare (thời gian + vị trí chuột)

Ảnh nhân vật trong suốt
  → Shadow
  → Manual Shake #1 (keyframe + flow map + opacity mask)
  → Manual Shake #2 (đang có giá trị 0, gần như không tạo dịch chuyển)
  → X-ray (trộn ảnh thay thế trong vùng quanh chuột)

Rain particle
  → compositing toàn scene
  → Bloom
```

## 3. Chuyển động của nền: Foliage Sway

Nền không được cắt thành nhiều cành/lá riêng. Shader làm méo ảnh nền tại những vùng được tô trong mask `foliagesway_mask_8be3c147`.

Các thông số chính:

| Thông số | Giá trị | Vai trò |
|---|---:|---|
| `strength` | 0.4 | biên độ lay động |
| `speeduv` | 1.14 | tốc độ thời gian |
| `phase` | 0.5 | độ lệch pha không gian |
| `power` | 1.12 | uốn hình dạng sóng |
| `scale` | 0.05 | tần số/độ lớn vùng noise |
| `ratio` | 0.3 | điều chỉnh theo tỉ lệ ảnh |

Shader lấy noise và vị trí UV để tạo phase khác nhau ở từng vùng. Nó cộng bốn sóng sin có tần số khác nhau:

```text
1, -0.16161616, 0.0083333, -0.00019841
```

Trục Y dùng một nhóm tần số khác. Vì các chu kỳ không trùng nhau, chuyển động không giống một nhịp sin đều máy móc. Biên độ nội bộ xấp xỉ:

```text
amp = strength² × 0.005
    = 0.4² × 0.005
    = 0.0008 UV
```

Sau đó mask quyết định vùng nào được dịch chuyển. Công thức khái quát:

```text
UV_mới = UV_gốc + Mask(UV) × NoiseSin(UV, time) × 0.0008
```

Đây là lý do hoa/cỏ có vẻ lay nhẹ trong khi các vùng cần ổn định ít bị méo.

## 4. Chuyển động của nhân vật: Manual Shake có định hướng

Tên “shake” dễ gây hiểu nhầm. Shader không rung cả layer bằng `position`. Nó dịch tọa độ lấy mẫu của từng pixel theo một **flow map**.

Hai texture mask có nhiệm vụ khác nhau:

- `manual_shake_mask_2772d1f2`: flow map; kênh đỏ và xanh mã hóa hướng dịch chuyển X/Y.
- `manual_shake_mask_f3114745`: opacity mask; giới hạn vùng được phép biến dạng.

Flow vector được giải mã bằng:

```text
flow = (RG - 0.498) × 2
```

Màu trung tính gần `0.498` nghĩa là đứng yên; lệch đỏ/xanh tạo hướng kéo pixel. Dịch chuyển cuối cùng gần với:

```text
UV_mới = UV_gốc
       + OpacityMask(UV)
       × FlowMap_RG(UV)
       × Wave(keyframeValue)
       × strength²
       × strengthMultiplier
```

Với `strength = 0.1` và multiplier `1`, hệ số cực đại trước mask chỉ khoảng `0.01 UV`. Biên độ nhỏ giúp tóc, quần áo và viền cơ thể chuyển động mềm mà không làm tranh bị chảy.

### Curve điều khiển

Giá trị đưa vào shader có bốn keyframe:

| Frame | Thời gian ở 30 fps | Giá trị |
|---:|---:|---:|
| 0 | 0.00 s | -0.3100 |
| 35 | 1.17 s | 0.0495 |
| 57 | 1.90 s | -0.3200 |
| 65 | 2.17 s | -0.3100 |

Toàn timeline dài `150 frame = 5 giây`, chế độ `loop`, `wraploop = true`. Các tangent Bézier được làm mượt. Từ frame 65 đến cuối vòng, giá trị gần như trở lại trạng thái nghỉ; vì thế chuyển động có một nhịp nhấn ngắn rồi khoảng nghỉ dài, giống thở/chuyển trọng lượng hơn là rung liên tục.

Curve này không trực tiếp là số pixel. Shader tiếp tục đổi nó thành một sóng sin đã chuẩn hóa, rồi nhân với flow map.

Manual Shake thứ hai dùng một flow map và opacity mask khác nhưng `value = 0`. Với cấu hình hiện tại, offset của pass này gần bằng 0; có vẻ đây là một pass dự phòng hoặc một trục chuyển động chưa được kích hoạt.

## 5. Vì sao các biến thể nhân vật luôn khớp

Ba lớp nhân vật có cùng kích thước `1296 × 1976`, cùng origin và cùng chuỗi Shadow/Manual Shake. Hai lớp thay thế bình thường bị ẩn, nhưng vẫn được shader X-ray dùng làm texture nguồn.

Việc dùng cùng flow map, cùng curve và cùng tọa độ khiến pixel ở các biến thể bị biến dạng giống nhau. Khi shader đổi/trộn ảnh dưới con trỏ, đường nét không bị “trượt” hoặc tạo bóng kép.

## 6. Logic X-ray theo chuột

X-ray là một hiệu ứng hậu kỳ trên lớp nhân vật chính:

1. Lấy vị trí chuột trong screen space.
2. Chiếu ngược vị trí đó về UV của layer.
3. Tạo vùng mềm quanh chuột bằng một sprite halo.
4. Nhân vùng halo với alpha của ảnh thay thế.
5. Blend ảnh thay thế vào ảnh chính trong vùng đó.

Công thức khái quát:

```text
blend = Alpha(ảnh_thay_thế)
      × Halo(khoảng_cách(pixel, chuột), size)
      × multiply

color = Blend(ảnh_chính, ảnh_thay_thế, blend)
```

Scene chứa hai pass X-ray. Pass tên `Nude` đang bật; pass dùng biến thể `Explicit` đang tắt. Đây là cơ chế tương tác làm nên chữ “XRAY” trong tên wallpaper.

## 7. Radial blur và lens flare

Radial blur đặt tâm ở `(0.5, 0.5)`, scale `0.14`, chỉ tác động qua mask riêng. Nó lấy nhiều mẫu theo tia hướng về tâm, tạo cảm giác vùng hoa tiền cảnh bị nhòe theo chiều sâu. Effect này được đánh dấu là đắt về hiệu năng.

Lens flare được thêm sau blur, dùng tông tím-xanh khoảng `(0.145, 0.133, 0.459)`. Vị trí và hình flare thay đổi bởi:

- `sin(time × 0.25)`;
- `cos(time × 0.125)`;
- chuyển động quay với tốc độ `1.0`;
- vị trí chuột với influence `1.0`.

Nhiều đốm flare nhỏ được tạo bằng các hàm suy giảm theo khoảng cách và noise. Bloom toàn scene (`strength 1.48`, threshold `0.65`) làm flare, giọt mưa và highlight sáng lan ra.

## 8. Particle mưa

Preset mưa dùng emitter hình cầu/ngẫu nhiên phía trên scene:

- rate gốc: `400` hạt/giây;
- tối đa: `512` hạt;
- lifetime: `0.5 s`;
- velocity: `(0, -3000, 0)`;
- size gốc: `5`;
- alpha ngẫu nhiên: `0.05–0.30`;
- renderer: `spritetrail`, tạo vệt dài;
- vật liệu additive, nên giọt sáng cộng lên màu nền.

Instance trong scene đặt các điều khiển `count = 0.52`, `size = 0.78`, `speed = 0.54`, `alpha = 0.60`, rồi scale vùng phát hạt thành `4.33458 × 1.36543`. Kết quả là mưa phủ được canvas rất rộng nhưng vẫn mảnh và bán trong suốt.

## 9. Shadow và chiều sâu

Nhân vật có shadow giả bằng cách lấy lại alpha của chính layer ở tọa độ lệch `shadowOffset = (2, -2)`, tô đen với alpha khoảng `0.53`. Đây không phải đèn 3D. Nó chỉ tạo một viền/bóng nhỏ giúp nhân vật tách khỏi nền.

Chiều sâu tổng thể đến từ:

- nền có tiền cảnh đã blur ngay trong ảnh gốc;
- radial blur có mask;
- nhân vật trong suốt đặt phía trên;
- mưa dạng trail;
- flare và bloom;
- chuyển động nền và nhân vật có nhịp khác nhau.

## 10. Công thức dựng lại

Trong Wallpaper Engine Editor, quy trình gần nhất là:

1. Chuẩn bị một ảnh nền ultrawide và một PNG nhân vật đã tách nền.
2. Nếu cần X-ray, chuẩn bị ảnh thay thế cùng đúng kích thước, crop và alignment với nhân vật chính.
3. Thêm nền, paint mask cho vùng cây/hoa cần lay và dùng Foliage Sway với biên độ nhỏ.
4. Paint mask radial blur riêng cho hoa tiền cảnh hoặc vùng cần tăng chiều sâu.
5. Thêm nhân vật, tạo flow map theo hướng tóc/vải/viền muốn kéo; tô opacity mask chỉ tại vùng cần chuyển động.
6. Animate tham số Manual Shake bằng curve 5 giây: có một chuyển động rõ trong khoảng 0–2.2 giây và nghỉ/ease về đầu vòng trong phần còn lại.
7. Copy chính xác chuỗi effect và mask sang mọi ảnh thay thế.
8. Thêm X-ray và gán ảnh thay thế vào blend texture.
9. Thêm mưa với lifetime ngắn, tốc độ Y lớn và renderer trail.
10. Thêm lens flare chậm, cuối cùng bật bloom vừa phải.

Điểm quyết định chất lượng không nằm ở biên độ lớn. Nó nằm ở mask được vẽ đúng vùng, hướng flow đi theo cấu trúc tóc/vải/cây, các lớp cùng alignment, và nhịp chuyển động có khoảng nghỉ.

## 11. Tệp đã trích xuất

- `unpacked/3653324997/scene.json`: toàn bộ cấu trúc scene và thông số effect.
- `unpacked/3653324997/shaders/`: mã shader nguồn.
- `decoded_textures/RezeBackground.png`: ảnh nền gốc.
- `decoded_textures/Reze.png`: lớp nhân vật chính.
- `decoded_textures/*.bmp`: các mask được giải mã.

