"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { ChevronDown, Trash2 } from "lucide-react";
import {
  MARKETPLACE_CATEGORY_PRESETS,
  categoryFormFromStored,
  categoryStoredFromForm,
} from "@/app/lib/marketplaceCategories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MARKETPLACE_IMAGE_MAX_BYTES,
  MARKETPLACE_IMAGE_MAX_EDGE_PX,
  formatImageSizeLabel,
  prepareMarketplaceUploadFile,
} from "@/app/lib/marketplaceImageUpload";
import {
  displayRupiah,
  formatRupiahFromDigits,
  rupiahDigitsOnly,
  digitsFromPriceString,
} from "@/app/lib/formatRupiah";

const CAT_NONE = "__none__";

function CategorySelect({
  value,
  onChange,
  triggerClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  triggerClassName?: string;
}) {
  const radixValue = value === "" ? CAT_NONE : value;
  return (
    <Select
      value={radixValue}
      onValueChange={(v) => onChange(v === CAT_NONE ? "" : v)}
    >
      <SelectTrigger
        className={triggerClassName ?? "w-full min-w-[160px] h-9 text-sm"}
      >
        <SelectValue placeholder="Tanpa kategori" />
      </SelectTrigger>
      <SelectContent className="border-white/10 bg-[#121214] text-white/90 shadow-xl">
        <SelectItem
          value={CAT_NONE}
          className="text-sm focus:bg-white/[0.07] focus:text-white data-[highlighted]:bg-white/[0.07] data-[state=checked]:bg-teal-500/15"
        >
          Tanpa kategori
        </SelectItem>
        {MARKETPLACE_CATEGORY_PRESETS.map((p) => (
          <SelectItem
            key={p}
            value={p}
            className="text-sm focus:bg-white/[0.07] focus:text-white data-[highlighted]:bg-white/[0.07] data-[state=checked]:bg-teal-500/15"
          >
            {p}
          </SelectItem>
        ))}
        <SelectItem
          value="lainnya"
          className="text-sm focus:bg-white/[0.07] focus:text-white data-[highlighted]:bg-white/[0.07] data-[state=checked]:bg-teal-500/15"
        >
          Lainnya…
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

type Item = {
  id: string;
  title: string;
  price: string;
  href: string;
  image_path?: string | null;
  description?: string | null;
  category?: string | null;
  is_active: boolean;
  created_at: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function MarketplaceItemRow({
  item: i,
  fmtDate: fmt,
  onToggleActive,
  onRemove,
  onDetailSaved,
}: {
  item: Item;
  fmtDate: (iso: string | null) => string;
  onToggleActive: (id: string, next: boolean) => void;
  onRemove: (id: string) => void;
  onDetailSaved: () => void;
}) {
  const [img, setImg] = useState(i.image_path ?? "");
  const [desc, setDesc] = useState(i.description ?? "");
  const initCat = categoryFormFromStored(i.category);
  const [catSel, setCatSel] = useState(initCat.select);
  const [catCustom, setCatCustom] = useState(initCat.custom);
  const [savingDetail, setSavingDetail] = useState(false);
  const [uploadRowLoading, setUploadRowLoading] = useState(false);
  const [uploadRowError, setUploadRowError] = useState<string | null>(null);
  const [rowPreviewBroken, setRowPreviewBroken] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setImg(i.image_path ?? "");
    setDesc(i.description ?? "");
    setRowPreviewBroken(false);
    const c = categoryFormFromStored(i.category);
    setCatSel(c.select);
    setCatCustom(c.custom);
  }, [i.id, i.image_path, i.description, i.category]);

  const saveDetail = async () => {
    setSavingDetail(true);
    try {
      const res = await fetch(`/api/konten/marketplace/${i.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_path: img.trim() || null,
          description: desc.trim() || null,
          category: categoryStoredFromForm(catSel, catCustom),
        }),
      });
      if (res.ok) await onDetailSaved();
    } finally {
      setSavingDetail(false);
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 sm:p-3">
      {/* Satu baris ringkas */}
      <div className="flex gap-3 items-center">
        <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-md overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
          {i.image_path ? (
            <Image src={i.image_path} alt="" fill className="object-cover" sizes="56px" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30">
              —
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-white truncate max-w-[12rem] sm:max-w-none">
              {i.title}
            </span>
            <span className="text-xs text-amber-300/90">{displayRupiah(i.price)}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                i.is_active
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-500/30 text-slate-300"
              }`}
            >
              {i.is_active ? "Aktif" : "Off"}
            </span>
            {i.category ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-teal-500/25 text-teal-200/90 shrink-0">
                {i.category}
              </span>
            ) : null}
          </div>
          <div className="text-[10px] text-white/40 truncate" title={i.href}>
            {i.href}
          </div>
          {i.description ? (
            <p className="text-[10px] text-white/35 line-clamp-1 mt-0.5">{i.description}</p>
          ) : null}
        </div>
        <div className="flex flex-col sm:flex-row gap-1.5 flex-shrink-0 items-stretch sm:items-center">
          <button
            type="button"
            onClick={() => setEditOpen((o) => !o)}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-white/15 bg-white/[0.06] px-2 py-1.5 text-[11px] text-white/85 hover:bg-white/10"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${editOpen ? "rotate-180" : ""}`}
            />
            {editOpen ? "Tutup" : "Ubah"}
          </button>
          <button
            type="button"
            onClick={() => onToggleActive(i.id, !i.is_active)}
            className="rounded-md bg-white/10 hover:bg-white/15 px-2 py-1.5 text-[11px] text-white/90 whitespace-nowrap"
          >
            {i.is_active ? "Nonaktif" : "Aktifkan"}
          </button>
          <button
            type="button"
            onClick={() => onRemove(i.id)}
            className="rounded-md bg-red-600/75 hover:bg-red-600 px-2 py-1.5 text-[11px] text-white"
          >
            Hapus
          </button>
        </div>
      </div>
      <div className="text-[9px] text-white/30 mt-1 pl-[3.75rem] sm:pl-[4.25rem]">{fmt(i.created_at)}</div>

      {/* Form edit: hanya saat dibuka */}
      {editOpen ? (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
            <CategorySelect
              value={catSel}
              onChange={setCatSel}
              triggerClassName="min-w-[130px] h-8 text-xs border-white/10 bg-black/25"
            />
            {catSel === "lainnya" ? (
              <input
                value={catCustom}
                onChange={(e) => setCatCustom(e.target.value)}
                className="flex-1 min-w-[100px] max-w-xs rounded-md bg-black/30 border border-white/10 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500/50"
                placeholder="Kategori"
              />
            ) : null}
          </div>
          <input
            value={img}
            onChange={(e) => {
              setImg(e.target.value);
              setRowPreviewBroken(false);
            }}
            className="w-full rounded-md bg-black/30 border border-white/10 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500/50"
            placeholder="URL gambar"
          />
          <div className="flex flex-wrap gap-3 items-start">
            {img.trim() && /^https?:\/\//i.test(img.trim()) ? (
              <div className="relative w-20 h-20 rounded border border-white/10 bg-black/40 overflow-hidden flex-shrink-0">
                {rowPreviewBroken ? (
                  <div className="w-full h-full flex items-center justify-center p-1 text-center text-[9px] text-amber-200/80">
                    Gagal muat
                  </div>
                ) : (
                  <Image
                    src={img.trim()}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized
                    onError={() => setRowPreviewBroken(true)}
                  />
                )}
              </div>
            ) : null}
            <div className="flex-1 min-w-0 space-y-1">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploadRowLoading}
                className="text-[10px] text-white/60 file:mr-2 file:rounded file:border-0 file:bg-cyan-700 file:px-2 file:py-0.5 file:text-white file:text-[10px]"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setUploadRowError(null);
                  setRowPreviewBroken(false);
                  setUploadRowLoading(true);
                  try {
                    const prep = await prepareMarketplaceUploadFile(f);
                    if (prep.ok === false) {
                      setUploadRowError(prep.message);
                      return;
                    }
                    const fd = new FormData();
                    fd.append("file", prep.file);
                    const res = await fetch("/api/konten/marketplace/upload", {
                      method: "POST",
                      credentials: "include",
                      body: fd,
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setUploadRowError(
                        typeof data?.message === "string" ? data.message : "Unggah gagal.",
                      );
                      return;
                    }
                    if (data?.url) {
                      setImg(data.url as string);
                      setRowPreviewBroken(false);
                    }
                  } finally {
                    setUploadRowLoading(false);
                  }
                }}
              />
              <p className="text-[9px] text-white/35">
                Maks. {formatImageSizeLabel(MARKETPLACE_IMAGE_MAX_BYTES)} · max {MARKETPLACE_IMAGE_MAX_EDGE_PX}px
              </p>
              {uploadRowLoading ? (
                <span className="text-[10px] text-white/45">Mengunggah…</span>
              ) : null}
              {uploadRowError ? (
                <p className="text-[10px] text-amber-300/90">{uploadRowError}</p>
              ) : null}
            </div>
          </div>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            className="w-full rounded-md bg-black/30 border border-white/10 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500/50 resize-y min-h-[44px]"
            placeholder="Deskripsi"
          />
          <button
            type="button"
            disabled={savingDetail}
            onClick={() => void saveDetail()}
            className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-3 py-1.5 text-xs text-white"
          >
            {savingDetail ? "Menyimpan…" : "Simpan perubahan"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function MarketplaceSayaModule() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [href, setHref] = useState("/dashboard");
  const [imagePath, setImagePath] = useState("");
  const [description, setDescription] = useState("");
  const [categorySelect, setCategorySelect] = useState("");
  const [categoryCustom, setCategoryCustom] = useState("");
  const [uploadCreateLoading, setUploadCreateLoading] = useState(false);
  const [uploadCreateError, setUploadCreateError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [imagePreviewBroken, setImagePreviewBroken] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const stats = useMemo(() => {
    const active = items.filter((i) => i.is_active).length;
    const inactive = items.length - active;
    return { total: items.length, active, inactive };
  }, [items]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/konten/marketplace", {
        cache: "no-store",
        credentials: "include",
      });
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
    if (!title.trim() || !digitsFromPriceString(price)) return;
    setCreateError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/konten/marketplace", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          price: formatRupiahFromDigits(digitsFromPriceString(price)),
          href: href.trim() || "/dashboard",
          image_path: imagePath.trim() || null,
          description: description.trim() || null,
          category: categoryStoredFromForm(categorySelect, categoryCustom),
          is_active: isActive,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof json?.message === "string"
            ? json.message
            : res.status === 401
              ? "Sesi habis. Login ulang lalu coba lagi."
              : `Gagal menyimpan (${res.status}).`;
        setCreateError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Produk berhasil ditambahkan.");
      setTitle("");
      setPrice("");
      setHref("/dashboard");
      setImagePath("");
      setDescription("");
      setCategorySelect("");
      setCategoryCustom("");
      setIsActive(true);
      setImagePreviewBroken(false);
      await load();
    } catch {
      const msg = "Jaringan bermasalah. Coba lagi.";
      setCreateError(msg);
      toast.error(msg);
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

  const openDeleteConfirm = (id: string) => setDeleteConfirmId(id);

  const confirmDeleteProduct = async () => {
    if (!deleteConfirmId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/konten/marketplace/${deleteConfirmId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Produk dihapus.");
        setDeleteConfirmId(null);
        await load();
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j?.message === "string" ? j.message : "Gagal menghapus.");
      }
    } catch {
      toast.error("Jaringan bermasalah.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteTarget = deleteConfirmId
    ? items.find((x) => x.id === deleteConfirmId)
    : null;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-wide">
            Marketplace Saya
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Buat produk sendiri. User lain hanya melihat yang <span className="font-semibold">Aktif</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/marketplace-saya/pesanan"
            className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 px-3 py-1.5 text-xs sm:text-sm text-amber-100 transition-colors"
          >
            Pesanan masuk
          </Link>
          <Link
            href="/dashboard/marketplace"
            className="inline-flex items-center rounded-md bg-cyan-600/90 hover:bg-cyan-500 px-3 py-1.5 text-xs sm:text-sm text-white transition-colors"
          >
            Lihat katalog
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs sm:text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            Kembali ke Home
          </Link>
        </div>
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

        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-2 min-w-[160px] flex-1 max-w-xs">
            <div className="text-xs text-white/60">Kategori</div>
            <CategorySelect
              value={categorySelect}
              onChange={setCategorySelect}
              triggerClassName="w-full h-9 text-sm border-white/10 bg-black/25 text-white/90"
            />
          </div>
          {categorySelect === "lainnya" ? (
            <div className="space-y-2 flex-1 min-w-[160px]">
              <div className="text-xs text-white/60">Nama kategori</div>
              <input
                value={categoryCustom}
                onChange={(e) => setCategoryCustom(e.target.value)}
                className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
                placeholder="Mis. Merchandise"
              />
            </div>
          ) : null}
        </div>

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
              inputMode="numeric"
              value={price}
              onChange={(e) => {
                const d = rupiahDigitsOnly(e.target.value);
                setPrice(d === "" ? "" : formatRupiahFromDigits(d));
              }}
              className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              placeholder="Ketik angka, mis. 200000"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2 sm:col-span-2">
            <div className="text-xs text-white/60">URL gambar (opsional)</div>
            <input
              value={imagePath}
              onChange={(e) => {
                setImagePath(e.target.value);
                setUploadCreateError(null);
                setCreateError(null);
                setImagePreviewBroken(false);
              }}
              className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              placeholder="https://… atau unggah di bawah"
            />
            {imagePath.trim() && /^https?:\/\//i.test(imagePath.trim()) ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-black/30 overflow-hidden max-w-xs">
                <div className="text-[10px] text-white/45 px-2 py-1 border-b border-white/10">
                  Pratinjau gambar
                </div>
                <div className="relative aspect-square w-full max-h-56 bg-black/50">
                  {imagePreviewBroken ? (
                    <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-amber-200/80">
                      URL tidak memuat gambar. Periksa link atau unggah file.
                    </div>
                  ) : (
                    <Image
                      src={imagePath.trim()}
                      alt="Pratinjau produk"
                      fill
                      className="object-contain"
                      sizes="256px"
                      unoptimized
                      onError={() => setImagePreviewBroken(true)}
                      onLoadingComplete={() => setImagePreviewBroken(false)}
                    />
                  )}
                </div>
              </div>
            ) : null}
            <p className="text-[11px] text-white/45">
              Unggah: maks. <strong className="text-white/70">{formatImageSizeLabel(MARKETPLACE_IMAGE_MAX_BYTES)}</strong>
              . Gambar besar otomatis diperkecil (sisi terpanjang max.{" "}
              {MARKETPLACE_IMAGE_MAX_EDGE_PX}px, JPEG/PNG/WebP). GIF maks. sama, tanpa resize.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploadCreateLoading}
                className="text-xs text-white/70 file:mr-2 file:rounded file:border-0 file:bg-cyan-600 file:px-2 file:py-1 file:text-white file:text-xs"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setUploadCreateError(null);
                  setUploadCreateLoading(true);
                  try {
                    const prep = await prepareMarketplaceUploadFile(f);
                    if (prep.ok === false) {
                      setUploadCreateError(prep.message);
                      return;
                    }
                    const fd = new FormData();
                    fd.append("file", prep.file);
                    const res = await fetch("/api/konten/marketplace/upload", {
                      method: "POST",
                      credentials: "include",
                      body: fd,
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setUploadCreateError(
                        typeof data?.message === "string" ? data.message : "Unggah gagal.",
                      );
                      return;
                    }
                    if (data?.url) {
                      setImagePath(data.url as string);
                      setImagePreviewBroken(false);
                    }
                  } finally {
                    setUploadCreateLoading(false);
                  }
                }}
              />
              {uploadCreateLoading ? (
                <span className="text-xs text-white/50">Mengunggah…</span>
              ) : null}
            </div>
            {uploadCreateError ? (
              <p className="text-xs text-amber-300/90">{uploadCreateError}</p>
            ) : null}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <div className="text-xs text-white/60">Deskripsi singkat (opsional)</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 resize-y min-h-[60px]"
              placeholder="Ukuran, warna, cara order…"
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

        {createError ? (
          <p className="text-sm text-amber-300/90 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2">
            {createError}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void create()}
            disabled={saving || !title.trim() || !digitsFromPriceString(price)}
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
            <MarketplaceItemRow
              key={i.id}
              item={i}
              fmtDate={fmtDate}
              onToggleActive={toggleActive}
              onRemove={openDeleteConfirm}
              onDetailSaved={load}
            />
          ))}
        </div>
      </div>

      {deleteConfirmId ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-[6px]"
          role="presentation"
          onClick={() => !deleteLoading && setDeleteConfirmId(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-marketplace-title"
            aria-describedby="delete-marketplace-desc"
            className="w-full max-w-[420px] rounded-2xl border border-white/[0.08] bg-[#0f1419]/95 shadow-[0_24px_64px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04] p-6 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-red-900/10 border border-red-500/20"
                aria-hidden
              >
                <Trash2 className="h-5 w-5 text-red-400" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2
                  id="delete-marketplace-title"
                  className="text-base font-semibold text-white tracking-wide"
                >
                  Hapus produk ini?
                </h2>
                <p
                  id="delete-marketplace-desc"
                  className="mt-2 text-sm text-white/50 leading-relaxed"
                >
                  {deleteTarget ? (
                    <>
                      <span className="text-teal-300/90 font-medium">{deleteTarget.title}</span>
                      {" · "}
                      <span className="text-white/40">{displayRupiah(deleteTarget.price)}</span>
                      <br />
                      <span className="text-white/40 text-[13px] mt-1 inline-block">
                        Dihapus permanen dari marketplace. Tidak dapat dikembalikan.
                      </span>
                    </>
                  ) : (
                    "Produk akan dihapus permanen."
                  )}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm text-white/85 hover:bg-white/[0.09] hover:text-white transition-colors disabled:opacity-40"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => void confirmDeleteProduct()}
                className="rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-red-950/40 transition-colors disabled:opacity-50 sm:min-w-[8rem]"
              >
                {deleteLoading ? "Menghapus…" : "Ya, hapus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

