"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FeedType = "event" | "pengumuman" | "dojo";
type Status = "draft" | "published";

type Item = {
  id: string;
  title: string;
  body: string;
  type: FeedType;
  status: Status;
  created_at: string | null;
  image_path?: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function KontenSayaBeritaModule() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<FeedType>("pengumuman");
  const [status, setStatus] = useState<Status>("draft");

  const editingItem = useMemo(
    () => (editingId ? items.find((i) => i.id === editingId) ?? null : null),
    [editingId, items],
  );

  const stats = useMemo(() => {
    const published = items.filter((i) => i.status === "published").length;
    const draft = items.length - published;
    return { total: items.length, published, draft };
  }, [items]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/konten/berita", { cache: "no-store" });
      const json = await res.json();
      const rawItems = Array.isArray(json?.items) ? json.items : [];
      setItems(
        rawItems.map((it: any) => ({
          id: it.id,
          title: it.title ?? "",
          body: it.body ?? "",
          type: (it.type as FeedType) ?? "pengumuman",
          status: (it.status as Status) ?? "draft",
          created_at: (it.created_at as string | null) ?? null,
          image_path: (it.image_path as string | null) ?? null,
        })),
      );
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
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/konten/berita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, type, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof json?.message === "string" ? json.message : "Gagal menyimpan";
        const detail = typeof json?.detail === "string" ? json.detail : null;
        setError(detail ? `${msg} — ${detail}` : msg);
        return;
      }
      setTitle("");
      setBody("");
      setType("pengumuman");
      setStatus("draft");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId || !title.trim() || !body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/konten/berita/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, type, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof json?.message === "string" ? json.message : "Gagal menyimpan";
        const detail = typeof json?.detail === "string" ? json.detail : null;
        setError(detail ? `${msg} — ${detail}` : msg);
        return;
      }
      setEditingId(null);
      setTitle("");
      setBody("");
      setType("pengumuman");
      setStatus("draft");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setTitle(item.title);
    setBody(item.body);
    setType(item.type);
    setStatus(item.status);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setType("pengumuman");
    setStatus("draft");
    setError(null);
  };

  const togglePublish = async (id: string, next: Status) => {
    await fetch(`/api/konten/berita/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await load();
  };

  const remove = async (id: string) => {
    const ok = confirm("Hapus konten ini?");
    if (!ok) return;
    await fetch(`/api/konten/berita/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-wide">
          Konten Saya — Berita/Feed
        </h1>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-white/60">
            Buat konten sendiri. User lain hanya melihat yang sudah{" "}
            <span className="font-semibold">Publish</span>.
          </p>
          <Link
            href="/dashboard"
            className="text-xs px-3 py-1.5 rounded-md border border-white/15 text-white/80 hover:bg-white/10 no-underline"
          >
            ← Kembali ke Home
          </Link>
        </div>
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
        <div className="text-sm font-medium text-white/90">Buat konten</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs text-white/60">Judul</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              placeholder="Judul singkat"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-xs text-white/60">Tipe</div>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FeedType)}
                className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              >
                <option value="pengumuman">Pengumuman</option>
                <option value="event">Event</option>
                <option value="dojo">Dojo</option>
              </select>
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
        </div>

        <div className="space-y-2">
          <div className="text-xs text-white/60">Isi</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full min-h-[120px] rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
            placeholder="Tulis isi konten…"
          />
        </div>

        {editingItem?.image_path && (
          <div className="space-y-2">
            <div className="text-xs text-white/60">Foto saat ini</div>
            <div className="relative aspect-video rounded-md overflow-hidden border border-white/10 bg-black/40">
              <Image
                src={editingItem.image_path}
                alt={editingItem.title || "Foto konten"}
                fill
                className="object-cover"
                sizes="(min-width: 640px) 50vw, 100vw"
                unoptimized
              />
            </div>
            <p className="text-[11px] text-white/50">
              Gambar diatur oleh admin atau melalui pengelolaan file terpisah. Saat ini hanya ditampilkan sebagai
              preview.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={editingId ? saveEdit : create}
            disabled={saving || !title.trim() || !body.trim()}
            className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 px-3 py-2 text-sm text-white"
          >
            {saving ? "Menyimpan…" : editingId ? "Simpan perubahan" : "Buat"}
          </button>
          <button
            type="button"
            onClick={editingId ? cancelEdit : load}
            className="rounded-md bg-white/10 hover:bg-white/15 px-3 py-2 text-sm text-white/90"
          >
            {editingId ? "Batal" : "Refresh"}
          </button>
        </div>

        {editingId && (
          <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
            Mode edit: perubahan akan menyimpan konten yang sudah ada. Klik{" "}
            <span className="font-semibold">Batal</span> untuk kembali ke mode buat baru.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-white/90">Daftar konten</div>
          {loading && <div className="text-xs text-white/50">Memuat…</div>}
        </div>

        <div className="mt-3 space-y-2">
          {!loading && items.length === 0 && (
            <div className="text-sm text-white/60">Belum ada konten.</div>
          )}

          {items.map((i) => (
            <div
              key={i.id}
              className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              {i.image_path && (
                <div className="relative w-full sm:w-32 aspect-video sm:aspect-square rounded-md overflow-hidden border border-white/10 bg-black/40 flex-shrink-0">
                  <Image
                    src={i.image_path}
                    alt={i.title || "Foto konten"}
                    fill
                    className="object-cover"
                    sizes="128px"
                    unoptimized
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-white font-medium truncate">{i.title}</div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border ${
                      i.status === "published"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    }`}
                  >
                    {i.status === "published" ? "Published" : "Draft"}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-white/70">
                    {i.type}
                  </span>
                </div>
                <div className="text-xs text-white/50 mt-1">{fmtDate(i.created_at)}</div>
                <div className="text-sm text-white/70 mt-2 line-clamp-2">{i.body}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(i)}
                  className="rounded-md bg-white/10 hover:bg-white/15 px-3 py-2 text-sm text-white/90"
                >
                  Edit
                </button>
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

