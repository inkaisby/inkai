"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Lock, RefreshCw, Settings2, X } from "lucide-react";
import { useBootstrapStore } from "@/app/dashboard/store/bootstrapStore";

const STORAGE_KEY_UKT_PENDING = "ukt_pending_selection";

function getStoredSelection(tahunId: string, rantingId: string): string[] {
  if (typeof window === "undefined" || !tahunId || !rantingId) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UKT_PENDING);
    if (!raw) return [];
    const obj = JSON.parse(raw) as Record<string, string[]>;
    const key = `${tahunId}|${rantingId}`;
    return Array.isArray(obj[key]) ? obj[key] : [];
  } catch {
    return [];
  }
}

function setStoredSelection(
  tahunId: string,
  rantingId: string,
  profileIds: string[],
) {
  if (typeof window === "undefined" || !tahunId || !rantingId) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UKT_PENDING);
    const obj: Record<string, string[]> = raw
      ? (JSON.parse(raw) as Record<string, string[]>)
      : {};
    obj[`${tahunId}|${rantingId}`] = profileIds;
    localStorage.setItem(STORAGE_KEY_UKT_PENDING, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}
import { toast } from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { useScope } from "@/app/dashboard/components/topbar-premium/context/ScopeContext";
import JarvisLoader from "@/components/JarvisLoader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import KelolaUKTCabang from "./KelolaUKTCabang";

type TahunAjaran = {
  id: string;
  nama: string;
  tahun: number;
  periode: string;
  cabang_id?: string | null;
  tanggal?: string | null;
  tempat?: string | null;
  ditutup_at?: string | null;
  biaya_per_kyu?: Record<string, number> | null;
  qris_content?: string | null;
};
type RantingOption = { id: string; nama: string };

/** Nilai khusus dropdown Ranting: tampilkan opsi "Semua Ranting" (hanya level 3+). Saat dipilih, tabel menampilkan anggota dari semua ranting dengan kolom Ranting. */
const RANTING_ALL = "all";
type AnggotaAktif = {
  profile_id: string;
  nama: string;
  nomor: string;
  kyu_dan_terakhir: string;
  sudah_daftar: boolean;
  sudah_batal?: boolean;
  ranting_id?: string | null;
  ranting_nama?: string | null;
};

/** Satu baris pendaftaran UKT. */
type PendaftaranRow = {
  id: string;
  profile_id: string;
  status_bayar: string;
  total_bayar: number | null;
  file_url: string | null;
  kwitansi_token: string | null;
  alasan_tolak_bukti: string | null;
  /** Kyu/Dan saat daftar (dari API); dipakai untuk hitung Total dari biaya_per_kyu */
  kyu_dan_terakhir?: string;
  /** Untuk baris batal: refund_status dari API */
  refund_status?: string;
  refund_jumlah?: number | null;
  /** Lulus ujian (untuk laporan PP) */
  lulus?: boolean;
  tingkat_lulus?: number | null;
};

/** Default biaya per Kyu/Dan (Rp) jika tahun ajaran belum diset cabang — agar kolom Total tetap menampilkan nominal. */
const DEFAULT_BIAYA_KYU: Record<string, number> = {
  "1": 345000,
  "2": 345000,
  "3": 345000,
  "4": 315000,
  "5": 315000,
  "6": 305000,
  "7": 295000,
  "8": 295000,
  "9": 285000,
  "10": 285000,
  dan_1: 0,
  dan_2: 0,
  dan_3: 0,
};

function formatTanggal(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Map kyu_dan_terakhir (e.g. "Kyu 5", "Dan 1", "5") ke key biaya_per_kyu ("5", "dan_1"). */
function kyuDanToBiayaKey(kyuDan: string): string | null {
  const s = (kyuDan ?? "").trim();
  if (!s || s === "—") return null;
  const kyuMatch = /^Kyu\s*(\d+)$/i.exec(s);
  if (kyuMatch) return kyuMatch[1];
  const danMatch = /^Dan\s*(\d+)$/i.exec(s);
  if (danMatch) return "dan_" + danMatch[1];
  if (/^\d+$/.test(s)) return s;
  return null;
}

/** Ambil nominal biaya (Rp) berdasarkan kyu_dan_terakhir dan biaya_per_kyu yang diset cabang. */
function getBiayaFromKyu(
  biayaPerKyu: Record<string, number> | null | undefined,
  kyuDanTerakhir: string
): number | null {
  if (!biayaPerKyu || typeof biayaPerKyu !== "object") return null;
  const key = kyuDanToBiayaKey(kyuDanTerakhir);
  if (!key) return null;
  const val = biayaPerKyu[key];
  return val != null && Number.isFinite(val) ? Number(val) : null;
}

export type AnggotaAktifSelected = {
  profile_id: string;
  nama: string;
  nomor: string;
  kyu_dan_terakhir: string;
};

type Props = {
  onFilterChange?: (tahunId: string, rantingId: string) => void;
  onRegistrationSuccess?: () => void;
  onSelectionChange?: (members: AnggotaAktifSelected[]) => void;
  /** Jika berubah, daftar anggota di-refetch (mis. setelah batal ikut). */
  refreshTrigger?: number;
};

function useIsLevel3OrAbove(): boolean {
  const user = useBootstrapStore((s) => s.data?.user);
  return useMemo(() => {
    const scope = user?.scope;
    if (scope?.is_pp) return true;
    const appRole = (user?.app_role as string)?.toUpperCase();
    if (appRole === "SUPERADMIN") return true;
    const roles = (user?.structural_roles ?? []) as { structural_level?: number; active?: boolean }[];
    const fromRoles = roles.filter((r) => r.active !== false).map((r) => r.structural_level ?? 0);
    const fromProfile = user?.profile_structural_level != null ? [user.profile_structural_level] : [];
    const maxLevel = Math.max(0, ...fromRoles, ...fromProfile);
    return maxLevel >= 3;
  }, [user]);
}

/** Cabang/PP boleh verifikasi lunas & tolak bukti. */
function useCanConfirmLunas(): boolean {
  const { scope } = useScope();
  return useMemo(
    () => !!scope?.is_pp || (scope?.cabang_ids?.length ?? 0) > 0,
    [scope?.is_pp, scope?.cabang_ids]
  );
}

/** Level >= 3 boleh isi pengembalian dana di form batal. */
function useCanEditRefund(): boolean {
  const { scope } = useScope();
  const user = useBootstrapStore((s) => s.data?.user);
  const structuralRoles = user?.structural_roles as { structural_level?: number; active?: boolean }[] | undefined;
  const profileLevel = user?.profile_structural_level ?? null;
  return useMemo(() => {
    if (scope?.is_pp) return true;
    const fromRoles = (structuralRoles ?? []).filter((r) => r.active !== false).map((r) => r.structural_level ?? 0);
    const allLevels = profileLevel != null ? [...fromRoles, profileLevel] : fromRoles;
    const maxLevel = allLevels.length ? Math.max(...allLevels) : 0;
    return maxLevel >= 3;
  }, [scope?.is_pp, structuralRoles, profileLevel]);
}

export default function PendaftaranUKT({
  onFilterChange,
  onRegistrationSuccess,
  onSelectionChange,
  refreshTrigger,
}: Props) {
  const { scope, selectedContext, app_role } = useScope();
  const user = useBootstrapStore((s) => s.data?.user);
  const isSuperAdmin = (app_role ?? "").toUpperCase() === "SUPERADMIN";
  const hasBendaharaRole = useMemo(() => {
    const roles = (user?.functional_roles ?? []) as Array<{ role_name?: string; active?: boolean }>;
    return roles.some((r) => (r.active ?? true) && (r.role_name ?? "").toUpperCase() === "BENDAHARA");
  }, [user?.functional_roles]);
  const canFinance = isSuperAdmin || hasBendaharaRole;
  const isLevel3OrAbove = useIsLevel3OrAbove();
  const canConfirmLunas = useCanConfirmLunas() && canFinance;
  const canEditRefund = useCanEditRefund() && canFinance;
  const canShowKelola =
    app_role === "SUPERADMIN" ||
    scope?.is_pp === true ||
    (scope?.cabang_ids?.length ?? 0) > 0;
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [rantingList, setRantingList] = useState<RantingOption[]>([]);
  const [tahunId, setTahunId] = useState("");
  const [rantingId, setRantingId] = useState("");
  const [anggota, setAnggota] = useState<AnggotaAktif[]>([]);
  const [pendaftaranList, setPendaftaranList] = useState<PendaftaranRow[]>([]);
  const [loadingTahun, setLoadingTahun] = useState(true);
  const [loadingRanting, setLoadingRanting] = useState(true);
  const [loadingAnggota, setLoadingAnggota] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  // Collapse per grup: "Sudah daftar" dan "Belum daftar" terbuka, "Batal" tertutup secara default
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(["batal"]),
  );
  // Aksi level 3+: tolak bukti, batal ikut, cetak kwitansi
  const [tolakModal, setTolakModal] = useState<{ id: string; nama: string } | null>(null);
  const [tolakAlasan, setTolakAlasan] = useState("");
  const [tolakSubmitting, setTolakSubmitting] = useState(false);
  const [lulusModal, setLulusModal] = useState<{ id: string; nama: string } | null>(null);
  const [lulusTingkat, setLulusTingkat] = useState("1");
  const [lulusSubmitting, setLulusSubmitting] = useState(false);
  const [batalModal, setBatalModal] = useState<{ id: string; nama: string } | null>(null);
  const [batalSubmitting, setBatalSubmitting] = useState(false);
  const [batalForm, setBatalForm] = useState({
    alasan_batal: "",
    refund_status: "tidak_ada" as "tidak_ada" | "pending" | "dikembalikan",
    refund_jumlah: "",
    refund_catatan: "",
  });
  const [printingKwitansiId, setPrintingKwitansiId] = useState<string | null>(null);
  const [syncingKyuId, setSyncingKyuId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadIdRef = useRef<string | null>(null);
  const [showKelolaModal, setShowKelolaModal] = useState(false);

  useEffect(() => {
    fetch("/api/ukt/tahun-ajaran", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setTahunList(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0 && !tahunId)
          setTahunId(data[0].id);
      })
      .catch(() => setTahunList([]))
      .finally(() => setLoadingTahun(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: init tahun list once
  }, []);

  useEffect(() => {
    queueMicrotask(() => setLoadingRanting(true));
    fetch("/api/ranting", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setRantingList(list);
        const ctxRanting =
          selectedContext && selectedContext !== "all"
            ? list.find((r: RantingOption) => r.id === selectedContext)
            : null;
        if (list.length === 0 && rantingId === RANTING_ALL) setRantingId("");
        else if (!rantingId) {
          if (isLevel3OrAbove && list.length > 0) setRantingId(RANTING_ALL);
          else if (ctxRanting) setRantingId(ctxRanting.id);
          else if (list.length > 0) setRantingId(list[0].id);
        }
      })
      .catch(() => setRantingList([]))
      .finally(() => setLoadingRanting(false));
  }, [selectedContext, isLevel3OrAbove]);

  useEffect(() => {
    onFilterChange?.(tahunId, rantingId);
  }, [tahunId, rantingId, onFilterChange]);

  useEffect(() => {
    if (!rantingId) {
      queueMicrotask(() => setAnggota([]));
      return;
    }
    queueMicrotask(() => setLoadingAnggota(true));
    const params = new URLSearchParams({ ranting_id: rantingId });
    if (tahunId) params.set("tahun_ajaran_id", tahunId);
    fetch(`/api/ukt/anggota-aktif?${params}`, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setAnggota(Array.isArray(data) ? data : []))
      .catch(() => setAnggota([]))
      .finally(() => setLoadingAnggota(false));
  }, [rantingId, tahunId, refreshTrigger]);

  const refetchPendaftaran = useCallback(async () => {
    if (!tahunId || !rantingId) return;
    const url = `/api/ukt/pendaftaran?tahun_ajaran_id=${encodeURIComponent(tahunId)}&ranting_id=${encodeURIComponent(rantingId)}&include_batal=true`;
    try {
      const d = await fetch(url, { credentials: "include", cache: "no-store" }).then((r) => r.json());
        const main = (d?.list && Array.isArray(d.list))
          ? d.list.map((r: { id: string; profile_id: string; status_bayar?: string; total_bayar?: number | null; file_url?: string | null; kwitansi_token?: string | null; alasan_tolak_bukti?: string | null; kyu_dan_terakhir?: string | null; lulus?: boolean; tingkat_lulus?: number | null }) => ({
              id: String(r.id),
              profile_id: String(r.profile_id),
              status_bayar: r.status_bayar ?? "menunggu_bayar",
              total_bayar: r.total_bayar != null ? Number(r.total_bayar) : null,
              file_url: r.file_url ?? null,
              kwitansi_token: r.kwitansi_token ?? null,
              alasan_tolak_bukti: r.alasan_tolak_bukti ?? null,
              kyu_dan_terakhir: r.kyu_dan_terakhir != null ? String(r.kyu_dan_terakhir) : undefined,
              lulus: r.lulus === true,
              tingkat_lulus: r.tingkat_lulus != null ? Number(r.tingkat_lulus) : null,
            }))
          : [];
        const batal = (d?.list_batal && Array.isArray(d.list_batal))
          ? d.list_batal.map((r: { id: string; profile_id: string; status_bayar?: string; total_bayar?: number | null; file_url?: string | null; kwitansi_token?: string | null; alasan_tolak_bukti?: string | null; refund_status?: string; refund_jumlah?: number | null; kyu_dan_terakhir?: string | null }) => ({
              id: String(r.id),
              profile_id: String(r.profile_id),
              status_bayar: "batal",
              total_bayar: r.total_bayar != null ? Number(r.total_bayar) : null,
              file_url: r.file_url ?? null,
              kwitansi_token: r.kwitansi_token ?? null,
              alasan_tolak_bukti: r.alasan_tolak_bukti ?? null,
              refund_status: r.refund_status ?? "tidak_ada",
              refund_jumlah: r.refund_jumlah != null ? Number(r.refund_jumlah) : null,
              kyu_dan_terakhir: r.kyu_dan_terakhir != null ? String(r.kyu_dan_terakhir) : undefined,
            }))
          : [];
        setPendaftaranList([...main, ...batal]);
    } catch {
      setPendaftaranList([]);
    }
  }, [tahunId, rantingId]);

  // Data pendaftaran UKT untuk kolom Status Bayar / Total / Bukti / Aksi (semua role, aksi hanya level 3+)
  useEffect(() => {
    if (!tahunId || !rantingId) {
      setPendaftaranList([]);
      return;
    }
    const url = `/api/ukt/pendaftaran?tahun_ajaran_id=${encodeURIComponent(tahunId)}&ranting_id=${encodeURIComponent(rantingId)}&include_batal=true`;
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const main = (d?.list && Array.isArray(d.list))
          ? d.list.map((r: { id: string; profile_id: string; status_bayar?: string; total_bayar?: number | null; file_url?: string | null; kwitansi_token?: string | null; alasan_tolak_bukti?: string | null; kyu_dan_terakhir?: string | null; lulus?: boolean; tingkat_lulus?: number | null }) => ({
              id: String(r.id),
              profile_id: String(r.profile_id),
              status_bayar: r.status_bayar ?? "menunggu_bayar",
              total_bayar: r.total_bayar != null ? Number(r.total_bayar) : null,
              file_url: r.file_url ?? null,
              kwitansi_token: r.kwitansi_token ?? null,
              alasan_tolak_bukti: r.alasan_tolak_bukti ?? null,
              kyu_dan_terakhir: r.kyu_dan_terakhir != null ? String(r.kyu_dan_terakhir) : undefined,
              lulus: r.lulus === true,
              tingkat_lulus: r.tingkat_lulus != null ? Number(r.tingkat_lulus) : null,
            }))
          : [];
        const batal = (d?.list_batal && Array.isArray(d.list_batal))
          ? d.list_batal.map((r: { id: string; profile_id: string; total_bayar?: number | null; file_url?: string | null; kwitansi_token?: string | null; alasan_tolak_bukti?: string | null; refund_status?: string; refund_jumlah?: number | null; kyu_dan_terakhir?: string | null }) => ({
              id: String(r.id),
              profile_id: String(r.profile_id),
              status_bayar: "batal",
              total_bayar: r.total_bayar != null ? Number(r.total_bayar) : null,
              file_url: r.file_url ?? null,
              kwitansi_token: r.kwitansi_token ?? null,
              alasan_tolak_bukti: r.alasan_tolak_bukti ?? null,
              refund_status: r.refund_status ?? "tidak_ada",
              refund_jumlah: r.refund_jumlah != null ? Number(r.refund_jumlah) : null,
              kyu_dan_terakhir: r.kyu_dan_terakhir != null ? String(r.kyu_dan_terakhir) : undefined,
            }))
          : [];
        setPendaftaranList([...main, ...batal]);
      })
      .catch(() => setPendaftaranList([]));
  }, [tahunId, rantingId, refreshTrigger]);

  const pendaftaranByProfileId = useMemo(() => {
    const m = new Map<string, PendaftaranRow>();
    pendaftaranList.forEach((p) => m.set(p.profile_id, p));
    return m;
  }, [pendaftaranList]);

  // Restore centang dari localStorage setelah anggota load (agar tetap ada setelah refresh)
  useEffect(() => {
    if (!tahunId || !rantingId || anggota.length === 0) return;
    const stored = getStoredSelection(tahunId, rantingId);
    const valid = stored.filter((id) =>
      anggota.some((a) => a.profile_id === id && !a.sudah_daftar),
    );
    if (valid.length > 0) {
      queueMicrotask(() => {
        setSelected((prev) => {
          const next = new Set(valid);
          if (prev.size === next.size && valid.every((id) => prev.has(id)))
            return prev;
          return next;
        });
      });
    }
  }, [tahunId, rantingId, anggota]);

  // Simpan centang ke localStorage saat berubah
  useEffect(() => {
    if (!tahunId || !rantingId) return;
    const ids = Array.from(selected);
    setStoredSelection(tahunId, rantingId, ids);
  }, [tahunId, rantingId, selected]);

  useEffect(() => {
    if (!onSelectionChange) return;
    if (selected.size === 0) {
      onSelectionChange([]);
      return;
    }
    const list = anggota
      .filter((a) => selected.has(a.profile_id))
      .map((a) => ({
        profile_id: a.profile_id,
        nama: a.nama,
        nomor: a.nomor ?? "",
        kyu_dan_terakhir: a.kyu_dan_terakhir ?? "",
      }));
    onSelectionChange(list);
  }, [selected, anggota, onSelectionChange]);

  const filtered = useMemo(
    () =>
      anggota.filter(
        (a) =>
          !search.trim() ||
          a.nama.toLowerCase().includes(search.toLowerCase()) ||
          (a.nomor && a.nomor.includes(search)) ||
          (a.ranting_nama && a.ranting_nama.toLowerCase().includes(search.toLowerCase())),
      ),
    [anggota, search],
  );

  const groups = useMemo(() => {
    const sudahDaftar = filtered.filter((a) => a.sudah_daftar);
    const batal = filtered.filter((a) => !a.sudah_daftar && a.sudah_batal);
    const belum = filtered.filter((a) => !a.sudah_daftar && !a.sudah_batal);
    return [
      { key: "sudah_daftar", label: "Sudah daftar", items: sudahDaftar },
      { key: "batal", label: "Batal", items: batal },
      { key: "belum", label: "Belum daftar", items: belum },
    ] as const;
  }, [filtered]);

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggle = (profileId: string) => {
    const a = anggota.find((x) => x.profile_id === profileId);
    if (a?.sudah_daftar) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  };

  const handleSimpan = async () => {
    if (!tahunId || !rantingId || selected.size === 0) return;
    setSaving(true);
    let ok = 0;
    const selectedIds = Array.from(selected);
    const effectiveRantingId = rantingId === RANTING_ALL ? null : rantingId;
    for (const profileId of selectedIds) {
      const a = anggota.find((x) => x.profile_id === profileId);
      const rantingForPost = effectiveRantingId ?? a?.ranting_id ?? null;
      if (!rantingForPost) {
        toast.error("Ranting tidak diketahui untuk peserta ini. Pilih satu ranting untuk daftar.");
        continue;
      }
      const res = await fetch("/api/ukt/pendaftaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tahun_ajaran_id: tahunId,
          profile_id: profileId,
          ranting_id: rantingForPost,
          kyu_dan_terakhir: a?.kyu_dan_terakhir ?? "",
        }),
      });
      if (res.ok) ok++;
      else {
        const j = await res.json().catch(() => ({}));
        toast.error((j.message as string) || "Gagal mendaftarkan");
      }
    }
    setSaving(false);
    if (ok > 0) {
      setSelected(new Set());
      onRegistrationSuccess?.();
      toast.success(`${ok} peserta didaftarkan.`);
      const params = new URLSearchParams({ ranting_id: rantingId });
      if (tahunId) params.set("tahun_ajaran_id", tahunId);
      fetch(`/api/ukt/anggota-aktif?${params}`, { credentials: "include", cache: "no-store" })
        .then((r) => r.json())
        .then((data) => setAnggota(Array.isArray(data) ? data : []));
    }
  };

  const handleKonfirmasiLunas = useCallback(
    async (id: string, nama: string) => {
      if (
        !confirm(
          `Verifikasi bukti transfer untuk ${nama}?\n\nSetelah diverifikasi, status berubah menjadi Lunas.`
        )
      )
        return;
      const res = await fetch(`/api/ukt/pendaftaran/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status_bayar: "lunas" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error((j.message as string) || "Gagal konfirmasi");
        return;
      }
      refetchPendaftaran();
      onRegistrationSuccess?.();
      toast.success("Status Lunas berhasil disimpan.");
    },
    [refetchPendaftaran, onRegistrationSuccess]
  );

  const handleTolakOpen = useCallback((id: string, nama: string) => {
    setTolakModal({ id, nama });
    setTolakAlasan("");
  }, []);

  const handleTolakSubmit = useCallback(async () => {
    if (!tolakModal || !tolakAlasan.trim()) {
      toast.error("Alasan penolakan wajib diisi.");
      return;
    }
    setTolakSubmitting(true);
    try {
      const res = await fetch(`/api/ukt/pendaftaran/${tolakModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status_bayar: "ditolak", alasan_tolak_bukti: tolakAlasan.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error((j.message as string) || "Gagal menolak bukti");
        return;
      }
      setTolakModal(null);
      setTolakAlasan("");
      refetchPendaftaran();
      onRegistrationSuccess?.();
      toast.success("Bukti ditolak.");
    } finally {
      setTolakSubmitting(false);
    }
  }, [tolakModal, tolakAlasan, refetchPendaftaran, onRegistrationSuccess]);

  const handleCetakKwitansi = useCallback(
    async (pend: PendaftaranRow) => {
      if (pend.status_bayar !== "lunas") return;
      setPrintingKwitansiId(pend.id);
      try {
        let token = pend.kwitansi_token ?? null;
        if (!token) {
          const ensureRes = await fetch(`/api/ukt/pendaftaran/${pend.id}/ensure-kwitansi-token`, {
            method: "POST",
            credentials: "include",
          });
          if (!ensureRes.ok) {
            toast.error("Gagal membuat token kwitansi");
            return;
          }
          const ensureData = await ensureRes.json();
          token = ensureData?.kwitansi_token ?? null;
          if (!token) {
            toast.error("Token kwitansi tidak tersedia");
            return;
          }
          refetchPendaftaran();
        }
        const printUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/kwitansi?token=${encodeURIComponent(token)}`
            : "";
        window.open(printUrl, "_blank", "noopener,noreferrer");
      } finally {
        setPrintingKwitansiId(null);
      }
    },
    [refetchPendaftaran]
  );

  const handleUploadBukti = useCallback(
    async (id: string, file: File) => {
      setUploadingId(id);
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch(`/api/ukt/pendaftaran/${id}/upload`, {
          method: "POST",
          credentials: "include",
          body: form,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          toast.error((j.message as string) || "Gagal upload bukti");
          return;
        }
        refetchPendaftaran();
        onRegistrationSuccess?.();
        toast.success("Bukti berhasil diunggah. Menunggu verifikasi Cabang.");
      } finally {
        setUploadingId(null);
      }
    },
    [refetchPendaftaran, onRegistrationSuccess]
  );

  const triggerUploadInput = useCallback((pendId: string) => {
    pendingUploadIdRef.current = pendId;
    queueMicrotask(() => uploadInputRef.current?.click());
  }, []);

  const handleUploadFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      const id = pendingUploadIdRef.current;
      if (f && id) {
        await handleUploadBukti(id, f);
      }
      pendingUploadIdRef.current = null;
      e.target.value = "";
    },
    [handleUploadBukti]
  );

  const handleBatalkanOpen = useCallback((id: string, nama: string) => {
    setBatalModal({ id, nama });
    setBatalForm({ alasan_batal: "", refund_status: "tidak_ada", refund_jumlah: "", refund_catatan: "" });
  }, []);

  const handleBatalkanSubmit = useCallback(async () => {
    if (!batalModal) return;
    setBatalSubmitting(true);
    try {
      const body: { status_bayar: string; alasan_batal?: string | null; refund_status?: string; refund_jumlah?: number | null; refund_catatan?: string | null } = {
        status_bayar: "batal",
        alasan_batal: batalForm.alasan_batal.trim() || null,
      };
      if (canEditRefund) {
        body.refund_status = batalForm.refund_status;
        if (batalForm.refund_status !== "tidak_ada") {
          const num = parseFloat(batalForm.refund_jumlah.replace(/,/g, "."));
          body.refund_jumlah = Number.isNaN(num) ? null : num;
          body.refund_catatan = batalForm.refund_catatan.trim() || null;
        }
      }
      const res = await fetch(`/api/ukt/pendaftaran/${batalModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error((j.message as string) || "Gagal membatalkan");
        return;
      }
      setBatalModal(null);
      refetchPendaftaran();
      onRegistrationSuccess?.();
      toast.success("Pendaftaran dibatalkan.");
    } finally {
      setBatalSubmitting(false);
    }
  }, [batalModal, batalForm, canEditRefund, refetchPendaftaran, onRegistrationSuccess]);

  const handlePerbaruiKyu = useCallback(
    async (pend: PendaftaranRow) => {
      setSyncingKyuId(pend.id);
      try {
        const res = await fetch(`/api/ukt/pendaftaran/${pend.id}/sync-kyu`, {
          method: "POST",
          credentials: "include",
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error((j.message as string) || "Gagal memperbarui Kyu");
          return;
        }
        refetchPendaftaran();
        onRegistrationSuccess?.();
        toast.success("Kyu berhasil diperbarui dari Keanggotaan.");
      } finally {
        setSyncingKyuId(null);
      }
    },
    [refetchPendaftaran, onRegistrationSuccess]
  );

  const handleTandaiLulusOpen = useCallback((pend: PendaftaranRow, nama: string) => {
    setLulusModal({ id: pend.id, nama });
    setLulusTingkat(pend.tingkat_lulus != null ? String(pend.tingkat_lulus) : "1");
  }, []);

  const handleTandaiLulusSubmit = useCallback(async () => {
    if (!lulusModal) return;
    const tingkat = Math.min(10, Math.max(1, parseInt(lulusTingkat, 10) || 1));
    setLulusSubmitting(true);
    try {
      const res = await fetch(`/api/ukt/pendaftaran/${lulusModal.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lulus: true, tingkat_lulus: tingkat }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((j.message as string) || "Gagal menandai lulus");
        return;
      }
      setLulusModal(null);
      refetchPendaftaran();
      onRegistrationSuccess?.();
      toast.success("Peserta ditandai lulus. Muncul di Laporan Ringkasan.");
    } finally {
      setLulusSubmitting(false);
    }
  }, [lulusModal, lulusTingkat, refetchPendaftaran, onRegistrationSuccess]);

  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-sm sm:p-6">
      <input
        ref={uploadInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleUploadFileChange}
      />
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-100">Pendaftaran UKT</h2>
      </div>

      <div className="flex flex-wrap gap-4 sm:gap-6">
        <div className="flex min-w-0 flex-col gap-2 sm:min-w-[180px]">
          <label className="text-xs font-medium text-zinc-400">
            Tahun Ajaran
          </label>
          {loadingTahun ? (
            <span className="text-sm text-zinc-500">Memuat…</span>
          ) : (
            <Select
              value={tahunId || undefined}
              onValueChange={(v) => setTahunId(v ?? "")}
            >
              <SelectTrigger className="w-full min-w-0 sm:w-[180px]">
                <SelectValue placeholder="— Pilih —" />
              </SelectTrigger>
              <SelectContent position="popper">
                {tahunList.map((t) => {
                  const badge = t.cabang_id ? " (Cabang)" : " (Global)";
                  const detail =
                    t.tanggal || t.tempat
                      ? ` — ${t.tanggal ? formatTanggal(t.tanggal) : ""}${t.tanggal && t.tempat ? ", " : ""}${t.tempat ?? ""}`.trim()
                      : "";
                  const tutupLabel = t.ditutup_at
                    ? ` — Ditutup ${formatTanggal(t.ditutup_at)}`
                    : "";
                  const label = `${t.nama}${badge}${detail}${tutupLabel}`;
                  return (
                    <SelectItem key={t.id} value={t.id}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:min-w-[200px]">
          <label className="text-xs font-medium text-zinc-400">Ranting</label>
          {loadingRanting ? (
            <span className="text-sm text-zinc-500">Memuat…</span>
          ) : (
            <Select
              value={rantingId || undefined}
              onValueChange={(v) => setRantingId(v ?? "")}
            >
              <SelectTrigger className="w-full min-w-0 sm:w-[200px]">
                <SelectValue placeholder="— Pilih —" />
              </SelectTrigger>
              <SelectContent position="popper">
                {isLevel3OrAbove && rantingList.length > 0 && (
                  <SelectItem key={RANTING_ALL} value={RANTING_ALL}>
                    Semua Ranting
                  </SelectItem>
                )}
                {rantingList.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {canShowKelola && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setShowKelolaModal(true)}
              className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-200/90 hover:bg-violet-500/20 transition-colors"
            >
              <Settings2 className="h-4 w-4 shrink-0" />
              Kelola UKT
            </button>
          </div>
        )}

        <div className="flex items-end">
          <button
            type="button"
            disabled={!tahunId || !rantingId || manualRefreshing}
            onClick={async () => {
              if (!tahunId || !rantingId) return;
              setManualRefreshing(true);
              try {
                await refetchPendaftaran();
              } finally {
                setManualRefreshing(false);
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/[0.06] disabled:opacity-50"
            title="Refresh tabel pendaftaran (manual)"
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${manualRefreshing ? "animate-spin" : ""}`} />
            Refresh tabel
          </button>
        </div>
      </div>

      {tahunId && (() => {
        const selectedTahun = tahunList.find((t) => t.id === tahunId);
        if (selectedTahun?.ditutup_at) {
          return (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
              <Lock className="h-5 w-5 shrink-0 text-amber-400/90" />
              <div>
                <p className="text-sm font-medium text-amber-200/90">
                  Tahun ajaran ini sudah ditutup
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Tidak ada pendaftaran baru atau daftar ulang. Cabang/PP dapat membuka kembali di Kelola UKT.
                </p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {tahunId &&
        (() => {
          const selectedTahun = tahunList.find((t) => t.id === tahunId);
          const qris = selectedTahun?.qris_content?.trim();
          if (!qris) return null;
          return (
            <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-medium text-zinc-200">
                Bayar via QRIS — {selectedTahun.nama}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Scan QR di bawah untuk transfer/pembayaran UKT.
              </p>
              <div className="mt-3 flex items-start gap-4">
                <div className="rounded-lg border border-white/10 bg-white p-2">
                  <QRCodeSVG value={qris} size={140} level="M" />
                </div>
              </div>
            </div>
          );
        })()}

      <div className="mt-6 flex flex-col gap-2">
        <label className="text-xs font-medium text-zinc-400">
          Cari anggota (nama / no. anggota)
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ketik untuk filter…"
          className="w-full min-w-0 max-w-xs rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/50"
        />
      </div>

      {selected.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <span className="text-sm text-zinc-300">
            <span className="font-medium text-amber-400/90">
              {selected.size}
            </span>{" "}
            peserta terpilih
          </span>
          <button
            type="button"
            onClick={handleSimpan}
            disabled={saving}
            className="rounded-lg bg-amber-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : `Daftarkan ${selected.size} peserta`}
          </button>
        </div>
      )}

      {loadingAnggota ? (
        <div className="mt-6">
          <JarvisLoader label="Memuat anggota aktif…" />
        </div>
      ) : (
        <>
          <div className="mt-6 -mx-4 overflow-x-auto rounded-lg border border-white/10 sm:mx-0">
            <table className="w-full text-sm table-auto min-w-[880px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-left text-zinc-400">
                  <th className="whitespace-nowrap px-2 py-2 sm:w-12 sm:px-4 sm:py-3">Daftar</th>
                  {rantingId === RANTING_ALL && (
                    <th className="min-w-[100px] whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">Ranting</th>
                  )}
                  <th className="min-w-[120px] whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">Nama</th>
                  <th className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">No. Anggota</th>
                  <th className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">Kyu/Dan</th>
                  <th className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">Status</th>
                  <th className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">Total</th>
                  <th className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">Bukti</th>
                  <th className="min-w-[140px] whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(({ key, label, items }) => {
                  if (items.length === 0) return null;
                  const isOpen = !collapsed.has(key);
                  return (
                    <React.Fragment key={key}>
                      <tr className="border-b border-white/10 bg-white/[0.04]">
                        <td colSpan={8 + (rantingId === RANTING_ALL ? 1 : 0)} className="px-2 py-2 sm:px-4">
                          <button
                            type="button"
                            onClick={() => toggleCollapse(key)}
                            className="flex w-full items-center gap-2 text-left text-sm font-medium text-zinc-300 hover:text-zinc-100"
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0" />
                            )}
                            {label}
                            <span className="text-zinc-500 font-normal">
                              ({items.length})
                            </span>
                          </button>
                        </td>
                      </tr>
                      {isOpen &&
                        items.map((a) => (
                          <tr
                            key={a.profile_id}
                            className="border-b border-white/5 hover:bg-white/[0.02]"
                          >
                            <td className="px-2 py-2 sm:px-4 sm:py-3">
                              {a.sudah_daftar ? (
                                <span className="text-xs text-zinc-500">
                                  Terdaftar
                                </span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={selected.has(a.profile_id)}
                                  onChange={() => toggle(a.profile_id)}
                                  className="rounded border-white/20"
                                />
                              )}
                            </td>
                            {rantingId === RANTING_ALL && (
                              <td className="whitespace-nowrap px-2 py-2 text-zinc-400 sm:px-4 sm:py-3">
                                {a.ranting_nama ?? a.ranting_id ?? "—"}
                              </td>
                            )}
                            <td className="min-w-[120px] px-2 py-2 text-zinc-200 sm:px-4 sm:py-3">
                              {a.nama}
                            </td>
                            <td className="whitespace-nowrap px-2 py-2 text-zinc-400 sm:px-4 sm:py-3">
                              {a.nomor}
                            </td>
                            <td className="whitespace-nowrap px-2 py-2 text-zinc-400 sm:px-4 sm:py-3">
                              {(() => {
                                const pend = a.sudah_daftar ? pendaftaranByProfileId.get(a.profile_id) : null;
                                const kyuDan = (pend?.kyu_dan_terakhir?.trim() || a.kyu_dan_terakhir?.trim() || "").trim();
                                return kyuDan || "—";
                              })()}
                            </td>
                            {(() => {
                              const pend = a.sudah_daftar ? pendaftaranByProfileId.get(a.profile_id) : null;
                              if (!pend) {
                                return (
                                  <>
                                    <td className="px-2 py-2 sm:px-4 sm:py-3">
                                      {a.sudah_batal ? (
                                        <span className="text-amber-400/90 text-xs font-medium">Batal</span>
                                      ) : (
                                        <span className="text-zinc-500">—</span>
                                      )}
                                    </td>
                                    <td className="px-2 py-2 text-zinc-500 sm:px-4 sm:py-3">—</td>
                                    <td className="px-2 py-2 text-zinc-500 sm:px-4 sm:py-3">—</td>
                                    <td className="px-2 py-2 text-zinc-500 sm:px-4 sm:py-3">
                                      —
                                    </td>
                                  </>
                                );
                              }
                              const sb = pend.status_bayar;
                              const statusLabel =
                                sb === "batal"
                                  ? (pend.refund_status === "dikembalikan"
                                      ? "Refund"
                                      : pend.refund_status === "pending"
                                        ? "Refund: Pending"
                                        : "Batal")
                                  : sb === "lunas"
                                    ? "Lunas"
                                    : sb === "ditolak"
                                      ? "Upload ulang"
                                      : sb === "bukti_uploaded" || (pend.file_url && sb !== "ditolak")
                                        ? "Menunggu verifikasi"
                                        : "Menunggu pembayaran";
                              const statusColor =
                                statusLabel === "Lunas"
                                  ? "text-emerald-400"
                                  : statusLabel === "Batal" || statusLabel === "Refund" || statusLabel === "Refund: Pending"
                                    ? statusLabel === "Refund"
                                      ? "text-emerald-400/90"
                                      : statusLabel === "Refund: Pending"
                                        ? "text-amber-400/90"
                                        : "text-amber-400/90"
                                    : statusLabel === "Upload ulang"
                                      ? "text-amber-400/90"
                                      : statusLabel === "Menunggu verifikasi"
                                        ? "text-amber-400/90"
                                        : "text-zinc-500";
                              return (
                                <>
                                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">
                                    <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                                  </td>
                                  <td className="whitespace-nowrap px-2 py-2 text-zinc-400 sm:px-4 sm:py-3">
                                    {(() => {
                                      const selectedTahun = tahunList.find((t) => t.id === tahunId);
                                      const bpk = selectedTahun?.biaya_per_kyu;
                                      const biayaSource =
                                        bpk && typeof bpk === "object" && Object.keys(bpk).length > 0
                                          ? bpk
                                          : DEFAULT_BIAYA_KYU;
                                      const kyuDan = (pend.kyu_dan_terakhir ?? a.kyu_dan_terakhir) ?? "";
                                      const biayaKyu = getBiayaFromKyu(biayaSource, kyuDan);
                                      const totalValue = biayaKyu ?? (pend.total_bayar != null && pend.total_bayar > 0 ? pend.total_bayar : null);
                                      return totalValue != null
                                        ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(totalValue)
                                        : "—";
                                    })()}
                                  </td>
                                  <td className="px-2 py-2 sm:px-4 sm:py-3">
                                    {pend.file_url ? (
                                      <a href={pend.file_url} target="_blank" rel="noopener noreferrer" className="text-amber-400/90 hover:underline text-xs">
                                        Lihat
                                      </a>
                                    ) : (
                                      <span className="text-zinc-500">—</span>
                                    )}
                                  </td>
                                  <td className="min-w-[140px] px-2 py-2 sm:px-4 sm:py-3">
                                    {isLevel3OrAbove ? (
                                      <div className="flex flex-col gap-1">
                                        {sb === "lunas" ? (
                                          <>
                                            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400/90">
                                              ✓ Lunas (sudah diverifikasi)
                                            </span>
                                            {pend.lulus ? (
                                              <span className="text-xs text-emerald-400/90">
                                                Lulus — Kyu {pend.tingkat_lulus ?? "—"}
                                              </span>
                                            ) : canFinance ? (
                                              <button
                                                type="button"
                                                onClick={() => handleTandaiLulusOpen(pend, a.nama)}
                                                className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 w-fit"
                                                title="Tandai lulus ujian (muncul di Laporan Ringkasan)"
                                              >
                                                Tandai Lulus
                                              </button>
                                            ) : null}
                                            {canFinance ? (
                                              <button
                                                type="button"
                                                disabled={printingKwitansiId === pend.id}
                                                onClick={() => handleCetakKwitansi(pend)}
                                                className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-white/15 disabled:opacity-50 w-fit"
                                              >
                                                {printingKwitansiId === pend.id ? "Membuka…" : "Cetak kwitansi"}
                                              </button>
                                            ) : (
                                              <span className="text-xs text-zinc-500">Aksi cetak: Bendahara</span>
                                            )}
                                          </>
                                        ) : sb === "bukti_uploaded" || (pend.file_url && sb !== "ditolak") ? (
                                          canConfirmLunas ? (
                                            <span className="flex flex-wrap items-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() => handleKonfirmasiLunas(pend.id, a.nama)}
                                                className="rounded-md bg-emerald-600/80 px-2 py-1 text-xs text-white hover:bg-emerald-500/80 w-fit"
                                              >
                                                Verifikasi Lunas
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleTolakOpen(pend.id, a.nama)}
                                                className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-400/90 hover:bg-red-500/10 w-fit"
                                              >
                                                Tolak
                                              </button>
                                            </span>
                                          ) : (
                                            <span className="text-xs text-amber-400/90">Menunggu verifikasi Cabang</span>
                                          )
                                        ) : sb === "ditolak" ? (
                                          <>
                                            {pend.alasan_tolak_bukti ? (
                                              <span className="text-xs text-zinc-500">Ditolak: {pend.alasan_tolak_bukti}</span>
                                            ) : (
                                              <span className="text-xs text-red-400/90">Ditolak</span>
                                            )}
                                            <button
                                              type="button"
                                              disabled={uploadingId === pend.id}
                                              onClick={() => triggerUploadInput(pend.id)}
                                              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 disabled:opacity-50 w-fit"
                                            >
                                              {uploadingId === pend.id ? "Mengunggah…" : "Upload bukti ulang"}
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <span className="text-xs text-zinc-500">Upload bukti terlebih dahulu</span>
                                            <button
                                              type="button"
                                              disabled={uploadingId === pend.id}
                                              onClick={() => triggerUploadInput(pend.id)}
                                              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 disabled:opacity-50 w-fit"
                                            >
                                              {uploadingId === pend.id ? "Mengunggah…" : "Upload bukti"}
                                            </button>
                                          </>
                                        )}
                                        {!(pend.kyu_dan_terakhir?.trim()) && (
                                          <button
                                            type="button"
                                            disabled={syncingKyuId === pend.id}
                                            onClick={() => handlePerbaruiKyu(pend)}
                                            className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 w-fit"
                                            title="Sync Kyu dari Keanggotaan ke pendaftaran UKT"
                                          >
                                            {syncingKyuId === pend.id ? "Memperbarui…" : "Perbarui Kyu"}
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleBatalkanOpen(pend.id, a.nama)}
                                          className="rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-400/90 hover:bg-red-500/10 w-fit"
                                        >
                                          Batalkan ikut
                                        </button>
                                      </div>
                                    ) : sb === "lunas" ? (
                                      <div className="flex flex-col gap-1">
                                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400/90">
                                          ✓ Lunas (sudah diverifikasi)
                                        </span>
                                        {pend.lulus ? (
                                          <span className="text-xs text-emerald-400/90">
                                            Lulus — Kyu {pend.tingkat_lulus ?? "—"}
                                          </span>
                                        ) : canFinance ? (
                                          <button
                                            type="button"
                                            onClick={() => handleTandaiLulusOpen(pend, a.nama)}
                                            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 w-fit"
                                            title="Tandai lulus ujian (muncul di Laporan Ringkasan)"
                                          >
                                            Tandai Lulus
                                          </button>
                                        ) : null}
                                        {canFinance ? (
                                          <button
                                            type="button"
                                            disabled={printingKwitansiId === pend.id}
                                            onClick={() => handleCetakKwitansi(pend)}
                                            className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-white/15 disabled:opacity-50 w-fit"
                                          >
                                            {printingKwitansiId === pend.id ? "Membuka…" : "Cetak kwitansi"}
                                          </button>
                                        ) : (
                                          <span className="text-xs text-zinc-500">Aksi cetak: Bendahara</span>
                                        )}
                                        {!(pend.kyu_dan_terakhir?.trim()) && (
                                          <button
                                            type="button"
                                            disabled={syncingKyuId === pend.id}
                                            onClick={() => handlePerbaruiKyu(pend)}
                                            className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 w-fit"
                                            title="Sync Kyu dari Keanggotaan"
                                          >
                                            {syncingKyuId === pend.id ? "Memperbarui…" : "Perbarui Kyu"}
                                          </button>
                                        )}
                                      </div>
                                    ) : sb === "batal" ? (
                                      <span className="text-xs text-zinc-500">
                                        {pend.refund_status === "dikembalikan"
                                          ? "Refund sudah dikembalikan"
                                          : pend.refund_status === "pending"
                                            ? "Refund pending"
                                            : "Batal — menunggu Cabang"}
                                      </span>
                                    ) : (
                                      <div className="flex flex-col gap-1">
                                        {sb === "ditolak" ? (
                                          <>
                                            {pend.alasan_tolak_bukti ? (
                                              <span className="text-xs text-red-400/90">Ditolak: {pend.alasan_tolak_bukti}</span>
                                            ) : (
                                              <span className="text-xs text-red-400/90">Ditolak</span>
                                            )}
                                            <button
                                              type="button"
                                              disabled={uploadingId === pend.id}
                                              onClick={() => triggerUploadInput(pend.id)}
                                              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 disabled:opacity-50 w-fit"
                                            >
                                              {uploadingId === pend.id ? "Mengunggah…" : "Upload bukti ulang"}
                                            </button>
                                          </>
                                        ) : sb === "bukti_uploaded" || (pend.file_url && sb !== "ditolak") ? (
                                          <span className="text-xs text-amber-400/90">Menunggu verifikasi Cabang</span>
                                        ) : (
                                          <>
                                            <span className="text-xs text-zinc-500">Menunggu pembayaran</span>
                                            <button
                                              type="button"
                                              disabled={uploadingId === pend.id}
                                              onClick={() => triggerUploadInput(pend.id)}
                                              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 disabled:opacity-50 w-fit"
                                            >
                                              {uploadingId === pend.id ? "Mengunggah…" : "Upload bukti"}
                                            </button>
                                          </>
                                        )}
                                        {!(pend.kyu_dan_terakhir?.trim()) && (
                                          <button
                                            type="button"
                                            disabled={syncingKyuId === pend.id}
                                            onClick={() => handlePerbaruiKyu(pend)}
                                            className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 w-fit"
                                            title="Sync Kyu dari Keanggotaan"
                                          >
                                            {syncingKyuId === pend.id ? "Memperbarui…" : "Perbarui Kyu"}
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleBatalkanOpen(pend.id, a.nama)}
                                          className="rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-400/90 hover:bg-red-500/10 w-fit"
                                        >
                                          Batalkan ikut
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </>
                              );
                            })()}
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="mt-4 text-sm text-zinc-500">
              Tidak ada anggota aktif di ranting ini.
            </p>
          )}
        </>
      )}

      {lulusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !lulusSubmitting && setLulusModal(null)}>
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-zinc-100">Tandai Lulus UKT</h3>
            <p className="mt-1 text-sm text-zinc-500">Peserta: {lulusModal.nama}</p>
            <div className="mt-4">
              <label className="block text-xs font-medium text-zinc-400">Tingkat lulus (Kyu 1–10)</label>
              <select
                value={lulusTingkat}
                onChange={(e) => setLulusTingkat(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={String(n)}>Kyu {n}</option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => !lulusSubmitting && setLulusModal(null)}
                disabled={lulusSubmitting}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTandaiLulusSubmit}
                disabled={lulusSubmitting}
                className="rounded-lg bg-emerald-600/90 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {lulusSubmitting ? "Menyimpan…" : "Tandai Lulus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tolakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !tolakSubmitting && setTolakModal(null)}>
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-zinc-100">Tolak bukti transfer</h3>
            <p className="mt-1 text-sm text-zinc-500">Peserta: {tolakModal.nama}</p>
            <div className="mt-4">
              <label className="block text-xs font-medium text-zinc-400">Alasan penolakan (wajib)</label>
              <textarea
                value={tolakAlasan}
                onChange={(e) => setTolakAlasan(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200"
                placeholder="Contoh: bukti tidak terbaca, nominal tidak sesuai"
              />
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => !tolakSubmitting && setTolakModal(null)}
                disabled={tolakSubmitting}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTolakSubmit}
                disabled={tolakSubmitting || !tolakAlasan.trim()}
                className="rounded-lg bg-red-600/90 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50"
              >
                {tolakSubmitting ? "Menyimpan…" : "Tolak bukti"}
              </button>
            </div>
          </div>
        </div>
      )}

      {batalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !batalSubmitting && setBatalModal(null)}>
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-zinc-100">Batalkan ikut UKT</h3>
            <p className="mt-1 text-sm text-zinc-500">Peserta: {batalModal.nama}</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400">Alasan batal (opsional)</label>
                <textarea
                  value={batalForm.alasan_batal}
                  onChange={(e) => setBatalForm((f) => ({ ...f, alasan_batal: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200"
                  placeholder="Contoh: tidak bisa hadir, pindah ranting"
                />
              </div>
              {canEditRefund && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Pengembalian dana (diisi cabang)</label>
                    <Select
                      value={batalForm.refund_status}
                      onValueChange={(v) => setBatalForm((f) => ({ ...f, refund_status: v as "tidak_ada" | "pending" | "dikembalikan" }))}
                    >
                      <SelectTrigger className="mt-1 w-full border-white/10 bg-white/5 text-zinc-200 focus:border-zinc-500 focus:ring-zinc-500/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-zinc-900">
                        <SelectItem value="tidak_ada" className="text-zinc-200 focus:bg-white/10 focus:text-zinc-100 data-[highlighted]:bg-white/10 data-[highlighted]:text-zinc-100">
                          Tidak ada pengembalian
                        </SelectItem>
                        <SelectItem value="pending" className="text-zinc-200 focus:bg-white/10 focus:text-zinc-100 data-[highlighted]:bg-white/10 data-[highlighted]:text-zinc-100">
                          Pending (akan dikembalikan)
                        </SelectItem>
                        <SelectItem value="dikembalikan" className="text-zinc-200 focus:bg-white/10 focus:text-zinc-100 data-[highlighted]:bg-white/10 data-[highlighted]:text-zinc-100">
                          Sudah dikembalikan
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(batalForm.refund_status === "pending" || batalForm.refund_status === "dikembalikan") && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400">Nominal (Rp)</label>
                        <input
                          type="text"
                          value={batalForm.refund_jumlah}
                          onChange={(e) => setBatalForm((f) => ({ ...f, refund_jumlah: e.target.value }))}
                          placeholder="0"
                          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400">Catatan (opsional)</label>
                        <input
                          type="text"
                          value={batalForm.refund_catatan}
                          onChange={(e) => setBatalForm((f) => ({ ...f, refund_catatan: e.target.value }))}
                          placeholder="Rekening, tanggal transfer"
                          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
              {!canEditRefund && (
                <p className="text-xs text-zinc-500">Pengembalian dana diisi oleh cabang di riwayat peserta batal.</p>
              )}
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setBatalModal(null)}
                disabled={batalSubmitting}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBatalkanSubmit}
                disabled={batalSubmitting}
                className="rounded-lg bg-red-600/90 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50"
              >
                {batalSubmitting ? "Menyimpan…" : "Batalkan ikut UKT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showKelolaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowKelolaModal(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-violet-400/80" />
                Kelola UKT
              </h3>
              <button
                type="button"
                onClick={() => setShowKelolaModal(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition-colors"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              Atur tahun ajaran, biaya per kyu, dan tutup tahun.
            </p>
            <KelolaUKTCabang
              onCreated={() => {
                fetch("/api/ukt/tahun-ajaran", { credentials: "include" })
                  .then((r) => r.json())
                  .then((data) => {
                    if (Array.isArray(data)) setTahunList(data);
                  })
                  .catch(() => {});
                onRegistrationSuccess?.();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
