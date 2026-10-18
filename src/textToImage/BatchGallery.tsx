import { useEffect, useRef, useState } from "react";
import "./gallery.css";
import { BatchExportPanel } from "./BatchExportPanel";
import {BatchQualityPanel} from './BatchQualityPanel';
const base = "http://127.0.0.1:17930";
type Item = {
  id: string;
  ordinal: number;
  prompt: string;
  title: string;
  group: string;
  status: string;
  selected: boolean;
  width?: number;
  height?: number;
  bytes?: number;
  thumbnailUrl?: string;
  sourceUrl?: string;
};
type Gallery = {
  total: number;
  filteredTotal: number;
  selection: { revision: number; itemIds: string[] };
  items: Item[];
};
export function BatchGallery({
  runId,
  completed,
}: {
  runId: string;
  completed: number;
}) {
  const [thumbnailErrors, setThumbnailErrors] = useState<Set<string>>(
      new Set(),
    ),
    [retries, setRetries] = useState<Record<string, number>>({});
  const [gallery, setGallery] = useState<Gallery | null>(null),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(0),
    [selection, setSelection] = useState<Set<string>>(new Set()),
    [dirty, setDirty] = useState(false),
    [active, setActive] = useState<Item | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0);
  const dirtyRef = useRef(false),
    dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (query === search) return;
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, search]);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    void fetch(
      base +
        "/landscape-batches/" +
        runId +
        "/gallery?" +
        new URLSearchParams({
          offset: String(page * 24),
          limit: "24",
          q: search,
          status,
        }),
      { signal: controller.signal },
    )
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok) throw Error(value.error);
        if (controller.signal.aborted) return;
        setGallery(value);
        if (!dirtyRef.current) setSelection(new Set(value.selection.itemIds));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [runId, page, search, status, completed, version]);
  useEffect(() => {
    if (active) {
      dialog.current?.showModal();
      return () => dialog.current?.close();
    }
  }, [active]);
  function update(ids: string[], checked: boolean) {
    setSelection((old) => {
      const next = new Set(old);
      for (const id of ids) checked ? next.add(id) : next.delete(id);
      return next;
    });
    dirtyRef.current = true;
    setDirty(true);
  }
  async function save() {
    if (!gallery) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
          base + "/landscape-batches/" + runId + "/gallery/selection",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-SoraSleep-Bridge": "1",
            },
            body: JSON.stringify({
              expectedRevision: gallery.selection.revision,
              itemIds: [...selection],
            }),
          },
        ),
        value = await response.json();
      if (!response.ok)
        throw Error(
          value.error === "landscape-selection-stale"
            ? "Lựa chọn đã đổi ở phiên khác. Tải lại danh sách rồi chọn lại."
            : value.error,
        );
      setGallery({ ...gallery, selection: value });
      dirtyRef.current = false;
      setDirty(false);
      setVersion((old) => old + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  function close() {
    setActive(null);
    trigger.current?.focus();
  }
  const available = gallery?.items.filter((item) => item.sourceUrl) ?? [];
  return (
    <section className="landscape-gallery" aria-label="Landscape gallery">
      <h3>Gallery · Ảnh landscape</h3>
      <BatchQualityPanel runId={runId}/>
      <p>
        Thumbnail dùng để duyệt nhanh. Ảnh gốc chỉ tải khi bạn mở xem hoặc tải
        file.
      </p>
      <div className="plr-pair">
        <label>
          Tìm trong prompt
          <input
            aria-label="Search landscape images"
            maxLength={200}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Lọc ảnh
          <select
            aria-label="Filter landscape images"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Tất cả</option>
            <option value="downloaded">Đã tải</option>
            <option value="pending">Đang chờ</option>
            <option value="failed">Lỗi / cần đối soát</option>
            <option value="selected">Đã chọn và lưu</option>
          </select>
        </label>
      </div>
      <div className="plr-actions">
        <button
          className="secondary-button"
          disabled={busy || !available.length}
          onClick={() =>
            update(
              available.map((item) => item.id),
              true,
            )
          }
        >
          Chọn trang hiện tại
        </button>
        <button
          className="secondary-button"
          disabled={busy || !available.length}
          onClick={() =>
            update(
              available.map((item) => item.id),
              false,
            )
          }
        >
          Bỏ chọn trang hiện tại
        </button>
        <button
          className="primary-button"
          disabled={busy || !dirty}
          onClick={() => void save()}
        >
          Lưu lựa chọn ảnh
        </button>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => {
            dirtyRef.current = false;
            setDirty(false);
            setVersion((old) => old + 1);
          }}
        >
          Tải lại lựa chọn đã lưu
        </button>
      </div>
      <p aria-label="Landscape gallery selection">
        {selection.size} ảnh được chọn ·{" "}
        {dirty ? "Có thay đổi chưa lưu" : "Đã đồng bộ lựa chọn"} ·{" "}
        {gallery?.filteredTotal ?? 0}/{gallery?.total ?? 0} kết quả
      </p>
      {busy && <p role="status">Đang cập nhật gallery…</p>}
      {error && <p role="alert">{error}</p>}
      <div className="landscape-gallery-grid">
        {gallery?.items.map((item) => (
          <article className="landscape-gallery-card" key={item.id}>
            {item.thumbnailUrl ? (
              <button
                className="landscape-gallery-image"
                aria-label={"View landscape " + item.ordinal}
                onClick={(event) => {
                  trigger.current = event.currentTarget;
                  setActive(item);
                }}
              >
                <img
                  onError={() =>
                    setThumbnailErrors((old) => new Set([...old, item.id]))
                  }
                  src={
                    base +
                    item.thumbnailUrl +
                    "?retry=" +
                    (retries[item.id] ?? 0)
                  }
                  alt={"Landscape thumbnail " + item.ordinal}
                  loading="lazy"
                  decoding="async"
                  width={480}
                  height={270}
                />
                <span>Xem ảnh lớn</span>
              </button>
            ) : (
              <div className="landscape-gallery-placeholder">
                #{item.ordinal} · {item.status}
              </div>
            )}
            <div className="landscape-gallery-copy">
              {thumbnailErrors.has(item.id) && (
                <div className="landscape-gallery-thumb-error">
                  Thumbnail chưa tải được.
                  <button
                    className="secondary-button"
                    aria-label={"Retry landscape thumbnail " + item.ordinal}
                    onClick={() => {
                      setThumbnailErrors((old) => {
                        const next = new Set(old);
                        next.delete(item.id);
                        return next;
                      });
                      setRetries((old) => ({
                        ...old,
                        [item.id]: (old[item.id] ?? 0) + 1,
                      }));
                    }}
                  >
                    Thử tải lại thumbnail
                  </button>
                </div>
              )}
              <label>
                <input
                  aria-label={"Select landscape " + item.ordinal}
                  type="checkbox"
                  disabled={!item.sourceUrl}
                  checked={selection.has(item.id)}
                  onChange={(e) => update([item.id], e.target.checked)}
                />{" "}
                #{String(item.ordinal).padStart(3, "0")} {item.title}
              </label>
              <small>
                {item.width
                  ? `${item.width}×${item.height} · ${((item.bytes ?? 0) / 1000000).toFixed(2)} MB`
                  : item.status}
              </small>
              <p>{item.prompt}</p>
              {item.sourceUrl && (
                <a href={base + item.sourceUrl + "?download=1"} download>
                  Tải ảnh gốc #{item.ordinal}
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      {gallery?.filteredTotal === 0 && !busy && (
        <p>Không có ảnh khớp bộ lọc.</p>
      )}
      <div className="plr-actions">
        <button
          className="secondary-button"
          disabled={busy || page === 0}
          onClick={() => setPage(page - 1)}
        >
          Trang gallery trước
        </button>
        <span>
          {page + 1}/
          {Math.max(1, Math.ceil((gallery?.filteredTotal ?? 0) / 24))} · 24
          ảnh/trang
        </span>
        <button
          className="secondary-button"
          disabled={busy || (page + 1) * 24 >= (gallery?.filteredTotal ?? 0)}
          onClick={() => setPage(page + 1)}
        >
          Trang gallery sau
        </button>
      </div>
      {gallery && (
        <BatchExportPanel
          runId={runId}
          selectionRevision={gallery.selection.revision}
          selectedCount={gallery.selection.itemIds.length}
          dirty={dirty}
          downloaded={completed}
        />
      )}
      {active && (
        <dialog
          ref={dialog}
          className="landscape-image-dialog"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          aria-label={"Landscape image " + active.ordinal}
        >
          <button className="secondary-button" onClick={close} autoFocus>
            Đóng ảnh lớn
          </button>
          <h3>
            #{active.ordinal} · {active.width}×{active.height}
          </h3>
          <img
            src={base + active.sourceUrl}
            alt={"Full landscape " + active.ordinal}
          />
          <p>{active.prompt}</p>
          <a href={base + active.sourceUrl + "?download=1"} download>
            Tải ảnh gốc
          </a>
        </dialog>
      )}
    </section>
  );
}
