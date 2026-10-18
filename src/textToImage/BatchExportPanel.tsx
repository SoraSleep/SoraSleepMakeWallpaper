import {managerBase} from '../app/runtime';
import { useEffect, useState } from "react";
const base = (managerBase+"/landscape-batches");
type Pack = {
  key: string;
  title: string;
  mode: string;
  includePrompts: boolean;
  total: number;
  downloaded: number;
  included: number;
  missing: number;
  omitted: number;
  files: Array<{ file: string; bytes: number; sha256: string }>;
};
export function BatchExportPanel({
  runId,
  selectionRevision,
  selectedCount,
  dirty,
  downloaded,
}: {
  runId: string;
  selectionRevision: number;
  selectedCount: number;
  dirty: boolean;
  downloaded: number;
}) {
  const [mode, setMode] = useState("selected"),
    [title, setTitle] = useState(""),
    [limit, setLimit] = useState(100),
    [includePrompts, setIncludePrompts] = useState(false),
    [variant,setVariant]=useState('original'),
    [packs, setPacks] = useState<Pack[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch(base + "/" + runId + "/exports", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error("Không đọc được lịch sử ZIP.");
        return response.json();
      })
      .then((value) => setPacks(value.exports))
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [runId]);
  async function build() {
    setBusy(true);
    setError("");
    try {
      if(variant!=='original'){
        const response=await fetch((managerBase+"/capabilities"));
        const capability=await response.json();
        if(!response.ok||capability.reviewedVariants!==true)throw Error('Backend chưa hỗ trợ xuất bản đã duyệt. Cập nhật hoặc khởi động lại Manager helper.');
      }
      const response = await fetch(base + "/" + runId + "/exports", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-SoraSleep-Bridge": "1",
          },
          body: JSON.stringify({
            mode,
            variant,
            ...(title.trim() ? { title: title.trim() } : {}),
            maxPartBytes: limit * 1000000,
            includePrompts,
            selectionRevision,
          }),
        }),
        value = await response.json();
      if (!response.ok) throw Error(value.error);
      setPacks((old) => [
        value,
        ...old.filter((pack) => pack.key !== value.key),
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(
        message.includes('quality-busy')
          ? 'Một lượt QA đang chạy. Chờ hoàn tất hoặc hủy lượt đó rồi xuất lại.'
          : message.includes('quality-stale')
          ? 'Ảnh đã thay đổi sau QA. Kiểm tra lại rồi xuất lại.'
          : message.includes('reviewed-image-required')
          ? 'Còn ảnh chưa có PNG đã duyệt. Nhập đủ bản duyệt hoặc đổi sang xuất ảnh gốc.'
          : message.includes("quality-review-required")
          ? "QA phát hiện ảnh lỗi hoặc trùng trong phạm vi xuất. Kiểm tra và bỏ chọn ảnh có cảnh báo, lưu lựa chọn rồi xuất lại."
          : message.includes("export-cancelled")
          ? "Đã hủy xuất ZIP, ảnh nguồn được giữ nguyên."
          : message.includes("single-file-exceeds-limit")
            ? "Có ảnh lớn hơn giới hạn ZIP. Tăng giới hạn mỗi phần rồi xuất lại; không cần gen lại."
            : message.includes("selection-stale")
              ? "Lựa chọn đã thay đổi. Tải lại và lưu lựa chọn trước khi xuất."
              : message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="landscape-gallery" aria-label="Landscape ZIP export">
      <h3>Xuất ZIP landscape</h3>
      <p>
        Giữ nguyên bytes và kích thước ảnh nguồn. Mỗi phần là ZIP độc lập; tải
        đủ mọi phần để nhận đủ ảnh.
      </p>
      <fieldset disabled={busy} className="plr-pair">
        <label>Phiên bản ảnh<select aria-label="Landscape export variant" value={variant} onChange={e=>setVariant(e.target.value)}><option value="original">Ảnh gốc</option><option value="reviewed">PNG đã duyệt · bắt buộc đủ</option><option value="both">Cả ảnh gốc và PNG đã duyệt</option></select></label>
        <label>
          Phạm vi
          <select
            aria-label="Landscape export scope"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="selected">
              Ảnh đã chọn và lưu · {selectedCount}
            </option>
            <option value="all">Toàn bộ ảnh đã tải · {downloaded}</option>
          </select>
        </label>
        <label>
          Tên gói
          <input
            aria-label="Landscape export title"
            value={title}
            maxLength={160}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Dùng tên batch nếu để trống"
          />
        </label>
        <label>
          Giới hạn mỗi ZIP · MB
          <input
            aria-label="Landscape export size"
            type="number"
            min={1}
            max={1000}
            step={1}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </label>
      </fieldset>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          style={{ width: "auto" }}
          aria-label="Landscape include creator prompts"
          type="checkbox"
          checked={includePrompts}
          disabled={busy}
          onChange={(e) => setIncludePrompts(e.target.checked)}
        />{" "}
        Kèm prompt gốc · bản dành cho creator
      </label>
      {dirty && mode === "selected" && (
        <p>Lưu lựa chọn ảnh trong gallery trước khi xuất.</p>
      )}
      <button
        className="primary-button"
        disabled={
          busy ||
          !Number.isInteger(limit) ||
          limit < 1 ||
          limit > 1000 ||
          (mode === "selected"
            ? dirty || selectedCount === 0
            : downloaded === 0)
        }
        onClick={() => void build()}
      >
        Tạo ZIP landscape
      </button>
      {busy && (
        <>
          <p role="status">Đang kiểm tra nguồn, checksum và ghi ZIP…</p>
          <button
            className="secondary-button"
            onClick={() =>
              void fetch(base + "/" + runId + "/exports/cancel", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-SoraSleep-Bridge": "1",
                },
                body: "{}",
              }).catch(() =>
                setError(
                  "Không gửi được lệnh hủy. Kiểm tra lịch sử trước khi xuất lại.",
                ),
              )
            }
          >
            Hủy xuất ZIP
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {packs.map((pack) => (
        <article className="plr-pack-result" key={pack.key}>
          <h4>
            {pack.title} · {pack.included} tệp ảnh
          </h4>
          <p>
            {pack.included} tệp ảnh từ batch {pack.total} prompt · {pack.missing}{" "}
            prompt chưa có ảnh · {pack.omitted} ảnh đã tải không được chọn.{" "}
            {pack.includePrompts
              ? "Có kèm prompt gốc."
              : "Không kèm prompt gốc."}
          </p>
          <div className="plr-actions">
            {pack.files
              .filter((file) => file.file.endsWith(".zip"))
              .map((file) => (
                <a
                  key={file.file}
                  href={
                    base +
                    "/" +
                    runId +
                    "/exports/" +
                    pack.key +
                    "/" +
                    file.file
                  }
                  download
                >
                  {file.file} · {(file.bytes / 1000000).toFixed(2)} MB
                </a>
              ))}
          </div>
          <p className="landscape-export-docs">
            {pack.files
              .filter((file) => !file.file.endsWith(".zip"))
              .map((file) => (
                <a
                  key={file.file}
                  style={{ marginRight: 12 }}
                  href={
                    base +
                    "/" +
                    runId +
                    "/exports/" +
                    pack.key +
                    "/" +
                    file.file
                  }
                  download
                >
                  {file.file}
                </a>
              ))}
          </p>
        </article>
      ))}
    </section>
  );
}
