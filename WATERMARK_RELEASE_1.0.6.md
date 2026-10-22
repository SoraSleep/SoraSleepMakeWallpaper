# MakeWallpaper 1.0.6 verification

Core build commit: `0567f4d`. See [implementation and limits](WATERMARK_FIX.md).

Installer: `SoraSleep-MakeWallpaper-Setup-1.0.6.exe`.

SHA-256:
`237aead05315b33dab6d33ab89fa13b52f1647dd0a99928bfe21edd028c2406e`

## Completed validation

- 89 Manager tests, five Python worker tests, frontend production build.
- Desktop/mobile warning dialog, explicit two-corner inspection and approval gate.
- 12 real landscapes, two real portraits, two square stock images. All preserve
  dimensions, original source hashes and every pixel outside the repair mask.
- Two clean controls and two repeated-cleanup controls have zero masked pixels.
- Actual API replay preserves uncertainty, blocks unapproved product downloads,
  and returns exact verified image hashes after isolated test-fixture approval.
- The unpacked release passes all6,335 payload checksums. Its bundled Python and
  models run with isolated library paths on two existing real images, producing
  byte-identical PNGs to the source replay. Times:38.6 and22.3 seconds in one
  process. Normal uncached API jobs still pay per-process initialization cost.
- No new generation requests, credit reservations or production image approvals.

One landscape (#6) retains an uncertainty warning and softer reconstructed
flowers. It needs manual inspection/correction before sale. Technical validation
does not approve its aesthetic quality.

## Local artifacts

The installer is in the build directory's `dist/` folder. Evidence is retained in
`real-test-output/watermark-fix/`: `review.html`, `final-v3`, `formats-v3`, `api`,
`ui`, `packaged`, `release-state.json` and the build/test logs. These local images
and generated packages are not committed to Git.

Automatic close/upgrade was rejected by the execution policy before the command
ran. The installed app was still1.0.5 when verified; the1.0.6 installer is ready
for manual installation. The pre-upgrade comparison verified all252 existing
data files unchanged. No installation success is claimed.

To independently verify the unpacked runtime without installing:

```powershell
node scripts/watermark-packaged-check.mjs "absolute path to dist/win-unpacked"
```
