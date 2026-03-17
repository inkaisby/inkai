"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  title: string;
  price: string;
  href: string;
  is_active: boolean;
  created_at: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function MarketplaceSayaModule() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [href, setHref] = useState("/dashboard");
  const [isActive, setIsActive] = useState(true);

  const stats = useMemo(() => {
    const active = items.filter((i) => i.is_active).length;
    const inactive = items.length - active;
    return { total: items.length, active, inactive };
  }, [items]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/konten/marketplace", { cache: "no-store" });
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
    if (!title.trim() || !price.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/konten/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, price, href, is_active: isActive }),
      });
      setTitle("");
      setPrice("");
      setHref("/dashboard");
      setIsActive(true);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, next: boolean) => {
    await fetch(`/api/konten/marketplace/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    });
    await load();
  };

  const remove = async (id: string) => {
    const ok = confirm("Hapus produk ini?");
    if (!ok) return;
    await fetch(`/api/konten/marketplace/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-wide">
          Marketplace Saya
        </h1>
        <p className="text-sm text-white/60 mt-1">
          Buat produk sendiri. User lain hanya melihat yang <span className="font-semibold">Aktif</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs text-white/60">Total</div>
          <div className="text-lg text-white font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs text-white/60">Aktif</div>
          <div className="text-lg text-white font-semibold">{stats.active}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs text-white/60">Nonaktif</div>
          <div className="text-lg text-white font-semibold">{stats.inactive}</div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="text-sm font-medium text-white/90">Tambah produk</div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <div className="text-xs text-white/60">Nama produk</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              placeholder="Seragam INKAI"
            />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-white/60">Harga</div>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              placeholder="Rp 350.000"
            />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-white/60">Link (opsional)</div>
            <input
              value={href}
              onChange={(e) => setHref(e.target.value)}
              className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              placeholder="/dashboard"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-cyan-500"
          />
          Aktif (tampil ke user lain)
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={create}
            disabled={saving || !title.trim() || !price.trim()}
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
          <div className="text-sm font-medium text-white/90">Daftar produk</div>
          {loading && <div className="text-xs text-white/50">Memuat…</div>}
        </div>

        <div className="mt-3 space-y-2">
          {!loading && items.length === 0 && (
            <div className="text-sm text-white/60">Belum ada produk.</div>
          )}

          {items.map((i) => (
            <div
              key={i.id}
              className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-white font-medium truncate">{i.title}</div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border ${
                      i.is_active
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-500/30 bg-slate-500/10 text-slate-200"
                    }`}
                  >
                    {i.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <div className="text-xs text-white/50 mt-1">{fmtDate(i.created_at)}</div>
                <div className="text-sm text-white/70 mt-2">{i.price}</div>
                <div className="text-xs text-white/60 mt-1 truncate" title={i.href}>
                  {i.href}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleActive(i.id, !i.is_active)}
                  className="rounded-md bg-white/10 hover:bg-white/15 px-3 py-2 text-sm text-white/90"
                >
                  {i.is_active ? "Nonaktifkan" : "Aktifkan"}
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

