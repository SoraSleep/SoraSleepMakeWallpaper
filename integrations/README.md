# Integration source snapshots

These source-only snapshots preserve the tested Manager PLR/Landscape backend and Image Dream local region editor alongside the Wallpaper frontend. Original installed development roots were `D:/SoraSleep Main/Manager/desktop` and `D:/SoraSleep Main/Apps/ImageDream/lib`.

They are not a complete Manager or Image Dream distribution. Restore/integrate into compatible projects, not directly over a running installation. Image Dream region editing needs sharp and OpenCV; Manager needs FFmpeg/FFprobe and its configured Python segmentation runtime. No account/session data is included.

Run backend tests with `node --test integrations/manager-desktop/landscape*.test.mjs integrations/manager-desktop/plr*.test.mjs` after configuring runtimes. Runtime discovery and dependency packaging are planned in RELEASE_AUDIT_2026-10-18.md.
