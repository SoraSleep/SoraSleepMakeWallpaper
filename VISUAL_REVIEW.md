# Output quality review

The review screen compares the untouched source and processed output at native resolution. It supports original/output/split views, zoom, panning, recognized restoration regions, notes and three decisions: approve, needs correction and reject.

## Workflow

1. Open **Duyệt ảnh** in the PLR quality cards or text-to-image gallery. For interactive wallpapers, open the review panel in Export Center.
2. Inspect at100%, open each recognized processing region and check the confirmation. Approval is a human decision; technical checks do not certify aesthetics.
3. If correction is needed, mark the image accordingly or import a corrected PNG. Keep native dimensions and transparency. The original is retained; replacing the candidate resets approval.
4. Approve the final candidate and select it for packaging. PLR automation pauses at review and can resume using existing generated images without another generation request.

Product exports require current approvals. Rejection, source changes or replacement invalidate earlier receipts; rebuild affected archives after reapproval. Old archives without receipts must be reviewed and rebuilt. Draft project backups preserve originals and are not sale packages.

PLR ZIPs bind approved candidate hashes; edited duplicate images are rejected. Lossless transparent trimming may change the final file hash and includes source dimensions. The approval records are stored in the backend's persistent visual-reviews directory, outside the source repository.

## Validation

- `npm run test:manager-integration`:79 tests including persistence, revision conflicts, source integrity, replacement dimensions/alpha and revocation.
- `node scripts/visual-review-acceptance.mjs`: existing real static, transparent and landscape pairs; blocked pending export, corrected PNG bytes in ZIP, revoked archive download, native review UI and390px layout. Test approvals are confined to a copied test store.
- `npm run test:watermark-browser`: two real portrait images through desktop preset ZIPs, H.264, WebM and legacy landscape exports using isolated fixture approvals.
- `npm run build`: TypeScript and production bundle.

These checks use existing generated images and do not spend generation credits. Physical phone testing and aesthetic approval of future generated batches remain separate from automated regression tests.
