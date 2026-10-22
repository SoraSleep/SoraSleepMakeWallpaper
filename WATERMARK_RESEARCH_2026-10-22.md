# Dreamina corner marks — investigation,22 October2026

## Measured findings

This investigation used the existing50-image spring landscape run, two unmarked demo images, four native corner comparisons and two earlier processed landscape outputs. No images were generated, no credits were used, and the installed algorithm was not changed.

The current detector was run on all50 original2560×1440 images:

| Mark | Accepted, score≥0.40 | Ambiguous,0.28–0.40 | Below0.28, ignored |
|---|---:|---:|---:|
| Top-left AI badge |39|3|8|
| Bottom-right Dreamina logo |50|0|0|

The eight ignored AI candidates are images1,6,8,11,16,21,26,41. Native crops show badge/frame traces behind branches and flowers. Images5,28,29 are ambiguous and currently block cleanup. These are detection classifications on this dataset, not general success rates or proof that all processed outputs are visually clean.

Image1's real badge scores0.2507. Image6 scores0.199. An unmarked demo image produces a spurious badge candidate of0.2417. Consequently, globally lowering the threshold to catch these badges would also risk editing clean artwork. Correlation scores are not calibrated probabilities.

Local evidence: `real-test-output/watermark-research/scan-50.json`, `scan-summary.json`, `negative-controls.json`, `uncertain-corners.jpg`, `existing-before-after.jpg` and `review.html`.

## Code findings

1. **Low confidence is treated as absence.** The worker only blocks scores0.28–0.40 and ignores lower scores. A partly occluded, low-contrast AI badge can survive while the bottom-right logo is successfully removed.
2. **The calculated glyph mask is unused for the final repair mask.** After morphology/dilation, the worker fills the entire matching rectangle plus margin. This removes more underlying scene information than the visible strokes alone. A full badge background may require a broad mask, but this should be a deliberate per-mark decision.
3. **Repair routing includes the watermark in its texture measurement.** Standard deviation is calculated on the original crop, including bright logo strokes. It can therefore classify the mark's contrast as background detail. Measure texture outside the mask instead.
4. **Residual checking reuses the same detector.** Its original blind spots remain blind spots after repair. A low score does not prove that a human cannot still see letters or a frame.
5. **Current LaMa ONNX inputs are fixed at512×512.** This was checked using ONNX Runtime: image `[batch,3,512,512]`, mask `[batch,1,512,512]`. The worker resizes its native crop to512 and back. The large logo crop can lose detail through this path. Simply changing the input to1024 is incompatible with these weights.
6. **Every uncached file starts a new Python worker.** The model session cache is process-local, so session construction and template setup are repeated across images. Reusing a bounded worker is worth benchmarking before replacing the model.

The existing before/after native crops show removed lettering but softened/reconstructed snow, foliage and ground texture. There is no clean ground-truth image under the real marks, so exact original-detail recovery cannot be certified.

## Image Dream versus MakeWallpaper

The running Image Dream `/api/image-edits/status` reports `engine:opencv`, methods`ns/telea`, `aiModel:false`, a5% mask area cap and retained AI provenance. Its existing region-edit feature is real, but is not a neural inpainting model. MakeWallpaper already uses local LaMa for textured crops and Telea for simpler crops. Replacing everything with another call to the same Image Dream editor would not fix missed detection.

## Recommended development order

### W0 — detection and uncertainty

- Treat rounded frame, AI letters, Dreamina symbol and wordmark as separate supporting cues.
- Use expected corner position and scale as priors, with a wider fallback search for resized/cropped assets.
- Preserve three outcomes: confirmed mark, confirmed clean/unsupported evidence, and needs review. A weak match must not automatically mean absent.
- For confirmed Dreamina-origin sources, surface uncertainty at either corner; do not blindly erase a fixed corner on arbitrary input art.
- First acceptance set: the eight missed and three ambiguous cases, all50 positives, unmarked originals and additional negative corner crops. Do not tune only against the two current negatives.

### W1 — masks that retain scene detail

- Compare the current rectangle against stroke/frame masks with scale-dependent antialiasing and shadow margins.
- Include a filled badge background only when evidence supports one. Retain a broader fallback when a narrow mask leaves remnants.
- Measure mask coverage and residual traces separately for AI and Dreamina.
- Preserve native dimensions, originals, transparency where applicable and every pixel outside the selected repair mask. Keep the5% area guard.

### W2 — repair quality at native scale

- Select the repair method using unmasked background texture/edges rather than the logo's contrast.
- A/B test Telea/NS on smooth regions and LaMa on detailed backgrounds.
- With the existing fixed512 model, test native512 context crops for the small badge and overlapping512 crops for the wider logo. Evaluate seams and texture before adopting tiling.
- A higher-resolution/refinement model is a separate benchmark, not a drop-in1024 setting. Keep the current model until a candidate demonstrably improves full-size output on the user's CPU.
- Any reverse-alpha reconstruction should remain experimental until the actual overlay color/opacity/position are calibrated. Arbitrary transparency guesses can amplify compression noise or clip detail.

### W3 — independent output inspection

- Check both corner regions after repair, including corners the detector considered uncertain.
- Add an independent constrained OCR/frame check as a review signal. OCR is not sufficient to certify cleanliness or authorize deleting other text in the artwork.
- Review at100% for remaining strokes, rectangular blur patches, broken lines, seams and color/alpha discontinuities. The current human approval gate remains required.
- Use synthetic overlays on known clean backgrounds for quantitative tests, and real provider images for visual evaluation. These are complementary tests.

### W4 — batch performance and integration

- Benchmark one persistent bounded Python/ONNX worker, cached templates and a fast corner search with broad fallback.
- Record cold/warm times, memory, failures and queue behavior; preserve immutable input hashes and atomic publication.
- Update the processing recipe so older cached outputs and approvals are not silently treated as results of the new algorithm.
- Validate landscape, portrait, square and transparent outputs plus repeated processing and clean-image controls before releasing a new installer.

## Primary references

- [OpenCV template matching](https://docs.opencv.org/4.x/de/da9/tutorial_template_matching.html): patch comparison, scores and masks.
- [OpenCV image inpainting](https://docs.opencv.org/4.x/df/d3d/tutorial_py_inpainting.html): mask-driven Telea and NS reconstruction from neighboring content.
- [LaMa paper](https://arxiv.org/abs/2109.07161) and [official implementation](https://github.com/advimman/lama): contextual inpainting, not recovery of a known original image.
- [Feature Refinement to Improve High Resolution Image Inpainting](https://arxiv.org/abs/2206.13644): detail loss and high-resolution refinement research; requires separate runtime evaluation.
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR): candidate independent OCR component, not integrated or benchmarked in this investigation.
