"use client";

import { useEffect, useMemo, useState } from "react";

type Status = "draft" | "published";

type Item = {
  id: string;
  image_url: string;
  caption: string | null;
  post_url: string;
  status: Status;
  created_at: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function KontenSayaInstagramModule() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [postUrl, setPostUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<Status>("draft");

  const stats = useMemo(() => {
    const published = items.filter((i) => i.status === "published").length;
    const draft = items.length - published;
    return { total: items.length, published, draft };
  }, [items]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/konten/instagram", { cache: "no-store" });
      const json = await res.json();
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    if (!postUrl.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/konten/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_url: postUrl,
          caption,
          status,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof json?.message === "string" ? json.message : "Gagal menyimpan";
        const detail = typeof json?.detail === "string" ? json.detail : null;
        setError(detail ? `${msg} — ${detail}` : msg);
        return;
      }
      setPostUrl("");
      setCaption("");
      setStatus("draft");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (id: string, next: Status) => {
    await fetch(`/api/konten/instagram/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await load();
  };

  const remove = async (id: string) => {
    const ok = confirm("Hapus item IG ini?");
    if (!ok) return;
    await fetch(`/api/konten/instagram/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-wide">
          Konten Saya — Instagram Feed
        </h1>
        <p className="text-sm text-white/60 mt-1">
          Cukup isi link post Instagram. Gambar akan diambil otomatis. User lain hanya melihat yang{" "}
          <span className="font-semibold">Publish</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs text-white/60">Total</div>
          <div className="text-lg text-white font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs text-white/60">Published</div>
          <div className="text-lg text-white font-semibold">{stats.published}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs text-white/60">Draft</div>
          <div className="text-lg text-white font-semibold">{stats.draft}</div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="text-sm font-medium text-white/90">Tambah item</div>

        <div className="space-y-2">
          <div className="text-xs text-white/60">Post URL</div>
          <input
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
            placeholder="https://instagram.com/p/…"
          />
          <div className="text-[11px] text-white/45">
            Tip: tempel link post IG (contoh: <span className="font-mono">https://www.instagram.com/p/xxxxx/</span>)
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs text-white/60">Caption</div>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              placeholder="Opsional"
            />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-white/60">Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
            >
              <option value="draft">Draft</option>
              <option value="published">Publish</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={create}
            disabled={saving || !postUrl.trim()}
            className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 px-3 py-2 text-sm text-white"
          >
            {saving ? "Menyimpan…" : "Tambah"}
          </button>
          <button
            type="button"
            onClick={load}
            className="rounded-md bg-white/10 hover:bg-white/15 px-3 py-2 text-sm text-white/90"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-white/90">Daftar item</div>
          {loading && <div className="text-xs text-white/50">Memuat…</div>}
        </div>

        <div className="mt-3 space-y-2">
          {!loading && items.length === 0 && (
            <div className="text-sm text-white/60">Belum ada item.</div>
          )}

          {items.map((i) => (
            <div
              key={i.id}
              className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <a
                    href={i.post_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white font-medium truncate hover:underline"
                    title={i.post_url}
                  >
                    {i.caption?.trim() ? i.caption : "Post Instagram"}
                  </a>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border ${
                      i.status === "published"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    }`}
                  >
                    {i.status === "published" ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="text-xs text-white/50 mt-1">{fmtDate(i.created_at)}</div>
                <div className="text-xs text-white/60 mt-2 truncate" title={i.image_url}>
                  {i.image_url}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => togglePublish(i.id, i.status === "published" ? "draft" : "published")}
                  className="rounded-md bg-white/10 hover:bg-white/15 px-3 py-2 text-sm text-white/90"
                >
                  {i.status === "published" ? "Jadikan Draft" : "Publish"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(i.id)}
                  className="rounded-md bg-red-600/80 hover:bg-red-600 px-3 py-2 text-sm text-white"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

