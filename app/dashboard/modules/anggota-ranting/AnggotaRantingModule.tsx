"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users, Building2, User, FileText, ExternalLink, Pencil, UserX, ChevronDown, ChevronRight, Activity, BarChart3, FileCheck } from "lucide-react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

import JarvisLoader from "@/components/JarvisLoader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TOAST_DURATION_MS = 3500;

type AnggotaRow = {
  profile_id: string;
  user_id?: string | null;
  nama: string;
  nik?: string;
  nomor: string;
  status: string;
  kyu_dan_terakhir: string;
  avatar_url?: string | null;
};

type RantingOption = { id: string; nama: string };

type SummaryItem = {
  ranting_id: string;
  ranting_nama: string;
  count_aktif: number;
  count_nonaktif: number;
};

export default function AnggotaRantingModule() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rantingId = searchParams.get("ranting_id") ?? "";
  const rantingNamaParam = searchParams.get("ranting_nama") ?? "";

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnggotaRow[]>([]);
  const [search, setSearch] = useState("");
  const [showSingleForm, setShowSingleForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [singleForm, setSingleForm] = useState({
    nik: "",
    nomor: "",
    nama: "",
    kyu_level: 0,
    dan: 0,
  });
  const [bulkText, setBulkText] = useState("");

  const [showEditForm, setShowEditForm] = useState(false);
  const [editingMember, setEditingMember] = useState<AnggotaRow | null>(null);
  const [editForm, setEditForm] = useState({
    nik: "",
    nomor: "",
    nama: "",
    status: "AKTIF",
    kyu_level: 0,
    dan: 0,
  });
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [singleNameConfirmed, setSingleNameConfirmed] = useState(false);
  const [editNameConfirmed, setEditNameConfirmed] = useState(false);

  const [rantingList, setRantingList] = useState<RantingOption[]>([]);
  const [rantingListLoading, setRantingListLoading] = useState(true);

  const [dataNonAktif, setDataNonAktif] = useState<AnggotaRow[]>([]);
  const [loadingNonAktif, setLoadingNonAktif] = useState(false);
  const [showNonAktifPanel, setShowNonAktifPanel] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const [summaryData, setSummaryData] = useState<{
    items: SummaryItem[];
    total_aktif: number;
    total_nonaktif: number;
  }>({ items: [], total_aktif: 0, total_nonaktif: 0 });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [searchRanting, setSearchRanting] = useState("");

  type PrestasiRow = {
    id: string;
    kategori: string;
    namaKejuaraan: string;
    tahun: string;
    tingkat: string;
    kelasPertandingan: string;
    fileUrl?: string;
    verifiedAt?: string;
    verifiedBy?: string;
  };
  const [memberPrestasi, setMemberPrestasi] = useState<PrestasiRow[]>([]);
  const [memberPrestasiLoading, setMemberPrestasiLoading] = useState(false);
  const [verifyingPrestasiId, setVerifyingPrestasiId] = useState<string | null>(null);
  const [pendingPrestasiCount, setPendingPrestasiCount] = useState<number>(0);

  const loadData = useCallback(async () => {
    if (!rantingId) return;
    setLoading(true);
    const params = new URLSearchParams({ ranting_id: rantingId });
    try {
      const res = await fetch(`/api/ukt/anggota-aktif?${params.toString()}`, {
        credentials: "include",
      });
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [rantingId]);

  const loadNonAktif = useCallback(async () => {
    if (!rantingId) return;
    setLoadingNonAktif(true);
    try {
      const params = new URLSearchParams({ ranting_id: rantingId, status: "NONAKTIF" });
      const res = await fetch(`/api/ukt/anggota-aktif?${params.toString()}`, { credentials: "include" });
      const d = await res.json();
      setDataNonAktif(Array.isArray(d) ? d : []);
    } catch {
      setDataNonAktif([]);
    } finally {
      setLoadingNonAktif(false);
    }
  }, [rantingId]);

  useEffect(() => {
    loadData();
    loadNonAktif();
  }, [loadData, loadNonAktif]);

  useEffect(() => {
    if (!rantingId) {
      setPendingPrestasiCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/keanggotaan/prestasi/pending?ranting_id=${encodeURIComponent(rantingId)}`,
          { credentials: "include" }
        );
        if (cancelled || !res.ok) return;
        const json = (await res.json()) as { count?: number };
        if (!cancelled) setPendingPrestasiCount(typeof json.count === "number" ? json.count : 0);
      } catch {
        if (!cancelled) setPendingPrestasiCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rantingId]);

  const setAktif = useCallback(
    async (row: AnggotaRow) => {
      setActivatingId(row.profile_id);
      try {
        const res = await fetch("/api/anggota-ranting/member", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            profile_id: row.profile_id,
            ranting_id: rantingId,
            status: "AKTIF",
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err?.message || "Gagal mengaktifkan.", { duration: TOAST_DURATION_MS });
          return;
        }
        toast.success(`${row.nama} kembali aktif.`, { duration: TOAST_DURATION_MS });
        await loadData();
        await loadNonAktif();
      } catch {
        toast.error("Gagal mengaktifkan.", { duration: TOAST_DURATION_MS });
      } finally {
        setActivatingId(null);
      }
    },
    [rantingId, loadData, loadNonAktif]
  );

  /* ESC menutup modal form */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSingleForm) setShowSingleForm(false);
        if (showBulkForm) setShowBulkForm(false);
        if (showEditForm) setShowEditForm(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSingleForm, showBulkForm, showEditForm]);

  const openEditForm = useCallback(
    async (row: AnggotaRow) => {
      setEditingMember(row);
      setMemberPrestasi([]);
      setEditForm({
        nama: row.nama ?? "",
        nik: row.nik ?? "",
        nomor: row.nomor ?? "",
        status: (row.status ?? "AKTIF").toUpperCase() === "NONAKTIF" ? "NONAKTIF" : "AKTIF",
        kyu_level: 0,
        dan: 0,
      });
      setShowEditForm(true);
      setEditFormLoading(true);
      setMemberPrestasiLoading(true);
      try {
        const [memberRes, riwayatRes] = await Promise.all([
          fetch(
            `/api/anggota-ranting/member?profile_id=${encodeURIComponent(row.profile_id)}&ranting_id=${encodeURIComponent(rantingId)}`,
            { credentials: "include" }
          ),
          fetch(
            `/api/keanggotaan/riwayat?profile_id=${encodeURIComponent(row.profile_id)}`,
            { credentials: "include" }
          ),
        ]);
        if (!memberRes.ok) {
          toast.error("Gagal memuat data anggota.", { duration: TOAST_DURATION_MS });
          setShowEditForm(false);
          return;
        }
        const d = (await memberRes.json()) as {
          nama?: string;
          nik?: string;
          nomor?: string;
          status?: string;
          kyu_level?: number;
          dan?: number;
        };
        const statusVal = (d.status ?? "AKTIF").toString().toUpperCase();
        setEditForm((prev) => ({
          ...prev,
          nama: d.nama ?? prev.nama,
          nik: d.nik ?? prev.nik,
          nomor: d.nomor ?? prev.nomor,
          status: statusVal === "NONAKTIF" ? "NONAKTIF" : "AKTIF",
          kyu_level: typeof d.kyu_level === "number" ? d.kyu_level : 0,
          dan: typeof d.dan === "number" ? d.dan : 0,
        }));

        if (riwayatRes.ok) {
          const riwayat = (await riwayatRes.json()) as { prestasi?: PrestasiRow[] };
          setMemberPrestasi(Array.isArray(riwayat.prestasi) ? riwayat.prestasi : []);
        }
      } catch {
        setMemberPrestasi([]);
        toast.error("Gagal memuat data anggota.", { duration: TOAST_DURATION_MS });
        setShowEditForm(false);
      } finally {
        setEditFormLoading(false);
        setMemberPrestasiLoading(false);
      }
    },
    [rantingId]
  );

  const loadMemberPrestasi = useCallback(async () => {
    if (!editingMember?.profile_id) return;
    setMemberPrestasiLoading(true);
    try {
      const res = await fetch(
        `/api/keanggotaan/riwayat?profile_id=${encodeURIComponent(editingMember.profile_id)}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const json = (await res.json()) as { prestasi?: PrestasiRow[] };
        setMemberPrestasi(Array.isArray(json.prestasi) ? json.prestasi : []);
      }
    } finally {
      setMemberPrestasiLoading(false);
    }
  }, [editingMember?.profile_id]);

  const loadPendingPrestasiCount = useCallback(async () => {
    if (!rantingId) return;
    try {
      const res = await fetch(
        `/api/keanggotaan/prestasi/pending?ranting_id=${encodeURIComponent(rantingId)}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const json = (await res.json()) as { count?: number };
        setPendingPrestasiCount(typeof json.count === "number" ? json.count : 0);
      }
    } catch {
      setPendingPrestasiCount(0);
    }
  }, [rantingId]);

  const handleVerifyPrestasi = useCallback(
    async (prestasiId: string) => {
      setVerifyingPrestasiId(prestasiId);
      try {
        const res = await fetch(
          `/api/keanggotaan/riwayat/prestasi/${prestasiId}/verify`,
          { method: "POST", credentials: "include" }
        );
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        if (!res.ok) {
          toast.error(json.message || "Gagal memverifikasi prestasi.", { duration: TOAST_DURATION_MS });
          return;
        }
        toast.success("Prestasi telah diverifikasi.", { duration: TOAST_DURATION_MS });
        await loadMemberPrestasi();
        await loadPendingPrestasiCount();
      } catch {
        toast.error("Gagal memverifikasi prestasi.", { duration: TOAST_DURATION_MS });
      } finally {
        setVerifyingPrestasiId(null);
      }
    },
    [loadMemberPrestasi, loadPendingPrestasiCount]
  );

  const handleEditSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!editingMember) return;
      setEditFormLoading(true);
      try {
        const res = await fetch("/api/anggota-ranting/member", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            profile_id: editingMember.profile_id,
            ranting_id: rantingId,
            nama: editForm.nama || null,
            nik: editForm.nik || null,
            nomor: editForm.nomor || null,
            status: editForm.status,
            kyu_level: editForm.kyu_level > 0 ? editForm.kyu_level : undefined,
            dan: editForm.dan,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err?.message || "Gagal menyimpan perubahan.", { duration: TOAST_DURATION_MS });
          return;
        }
        toast.success("Data anggota berhasil diperbarui.", { duration: TOAST_DURATION_MS });
        setShowEditForm(false);
        setEditingMember(null);
        await loadData();
        await loadNonAktif();
      } catch {
        toast.error("Gagal menyimpan perubahan.", { duration: TOAST_DURATION_MS });
      } finally {
        setEditFormLoading(false);
      }
    },
    [editingMember, rantingId, editForm, loadData, loadNonAktif]
  );

  const handleSingleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      try {
        const res = await fetch("/api/anggota-ranting/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            entries: [
              {
                nik: singleForm.nik || null,
                nomor: singleForm.nomor || null,
                nama: singleForm.nama || null,
                ranting_id: rantingId,
              },
            ],
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err?.message || "Gagal menyimpan data anggota.", {
            duration: TOAST_DURATION_MS,
          });
          return;
        }
        const json = await res.json();
        const first =
          Array.isArray(json.entries) && json.entries.length > 0
            ? json.entries[0]
            : null;
        const profileId = first && typeof (first as { id?: string }).id === "string" ? (first as { id: string }).id : null;
        if (profileId && (singleForm.kyu_level > 0 || singleForm.dan > 0)) {
          const patchRes = await fetch("/api/anggota-ranting/member", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              profile_id: profileId,
              ranting_id: rantingId,
              kyu_level: singleForm.kyu_level > 0 ? singleForm.kyu_level : undefined,
              dan: singleForm.dan,
            }),
          });
          if (!patchRes.ok) {
            const err = await patchRes.json().catch(() => ({}));
            toast.error(err?.message || "Profil tersimpan, Kyu/Dan gagal.", { duration: TOAST_DURATION_MS });
          }
        }
        const label =
          first?.nama ||
          singleForm.nama ||
          singleForm.nomor ||
          singleForm.nik ||
          "baru";
        toast.success(`Data anggota ${label} sudah tersimpan.`, {
          duration: TOAST_DURATION_MS,
        });
        setSingleForm({ nik: "", nomor: "", nama: "", kyu_level: 0, dan: 0 });
        setShowSingleForm(false);
        await loadData();
        await loadNonAktif();
      } catch {
        toast.error("Gagal menyimpan data anggota.", {
          duration: TOAST_DURATION_MS,
        });
      }
    },
    [rantingId, singleForm.nik, singleForm.nomor, singleForm.nama, singleForm.kyu_level, singleForm.dan, loadData, loadNonAktif]
  );

  // Tanpa ranting_id: muat daftar ranting (scope user). Satu ranting → redirect; banyak → pilih.
  useEffect(() => {
    if (rantingId) return;
    let mounted = true;
    setRantingListLoading(true);
    fetch("/api/ranting", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((list: { id?: string; nama?: string }[]) => {
        if (!mounted) return;
        const opts: RantingOption[] = (Array.isArray(list) ? list : []).map((r) => ({
          id: String(r.id ?? ""),
          nama: String(r.nama ?? "—"),
        }));
        setRantingList(opts);
        if (opts.length === 1) {
          router.replace(
            `/dashboard/anggota-ranting?ranting_id=${encodeURIComponent(opts[0].id)}&ranting_nama=${encodeURIComponent(opts[0].nama)}`
          );
        }
      })
      .catch(() => {
        if (mounted) setRantingList([]);
      })
      .finally(() => {
        if (mounted) setRantingListLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [rantingId, router]);

  // Ringkasan per ranting untuk dashboard (saat pilih ranting)
  useEffect(() => {
    if (rantingId || rantingList.length <= 1) return;
    setSummaryLoading(true);
    const ids = rantingList.map((r) => r.id).join(",");
    fetch(`/api/ukt/anggota-aktif/summary?ranting_ids=${encodeURIComponent(ids)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : { items: [], total_aktif: 0, total_nonaktif: 0 }))
      .then((d: { items?: SummaryItem[]; total_aktif?: number; total_nonaktif?: number }) => {
        setSummaryData({
          items: Array.isArray(d.items) ? d.items : [],
          total_aktif: Number(d.total_aktif) || 0,
          total_nonaktif: Number(d.total_nonaktif) || 0,
        });
      })
      .catch(() => setSummaryData({ items: [], total_aktif: 0, total_nonaktif: 0 }))
      .finally(() => setSummaryLoading(false));
  }, [rantingId, rantingList]);

  const filtered = useMemo(
    () =>
      data.filter((a) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          a.nama.toLowerCase().includes(q) ||
          (a.nik && a.nik.toLowerCase().includes(q)) ||
          (a.nomor && a.nomor.toLowerCase().includes(q))
        );
      }),
    [data, search],
  );

  const totalAktif = data.length;
  const totalNonAktif = dataNonAktif.length;
  const totalAnggota = totalAktif + totalNonAktif;
  const lengkapanData = useMemo(
    () => data.filter((a) => (a.nik ?? "").trim() !== "" && (a.nomor ?? "").trim() !== "").length,
    [data],
  );

  const duplicateLookup = useMemo(() => {
    const nikMap = new Map<string, AnggotaRow>();
    const nomorMap = new Map<string, AnggotaRow>();
    const normalizeName = (s: string) =>
      s
        .trim()
        .replace(/[^a-z0-9\s]/gi, " ")
        .replace(/\s+/g, " ")
        .toLowerCase();
    const nameMap = new Map<string, AnggotaRow[]>();
    for (const a of [...data, ...dataNonAktif]) {
      const nik = (a.nik ?? "").trim();
      if (nik) nikMap.set(nik, a);
      const nomor = (a.nomor ?? "").trim();
      if (nomor) nomorMap.set(nomor, a);
      const key = normalizeName(a.nama ?? "");
      if (key) {
        const arr = nameMap.get(key) ?? [];
        arr.push(a);
        nameMap.set(key, arr);
      }
    }
    return { nikMap, nomorMap, nameMap, normalizeName };
  }, [data, dataNonAktif]);

  const singleNikDup = useMemo(() => {
    const nik = singleForm.nik.trim();
    if (!nik) return null;
    return duplicateLookup.nikMap.get(nik) ?? null;
  }, [singleForm.nik, duplicateLookup]);
  const singleNomorDup = useMemo(() => {
    const nomor = singleForm.nomor.trim();
    if (!nomor) return null;
    return duplicateLookup.nomorMap.get(nomor) ?? null;
  }, [singleForm.nomor, duplicateLookup]);
  const singleNamaDup = useMemo(() => {
    const key = duplicateLookup.normalizeName(singleForm.nama ?? "");
    if (!key) return null;
    const list = duplicateLookup.nameMap.get(key) ?? [];
    return list.length > 0 ? list[0] : null;
  }, [singleForm.nama, duplicateLookup]);

  const editNikDup = useMemo(() => {
    const nik = editForm.nik.trim();
    if (!nik) return null;
    const found = duplicateLookup.nikMap.get(nik) ?? null;
    if (!found) return null;
    if (editingMember?.profile_id && found.profile_id === editingMember.profile_id) return null;
    return found;
  }, [editForm.nik, duplicateLookup, editingMember?.profile_id]);
  const editNomorDup = useMemo(() => {
    const nomor = editForm.nomor.trim();
    if (!nomor) return null;
    const found = duplicateLookup.nomorMap.get(nomor) ?? null;
    if (!found) return null;
    if (editingMember?.profile_id && found.profile_id === editingMember.profile_id) return null;
    return found;
  }, [editForm.nomor, duplicateLookup, editingMember?.profile_id]);
  const editNamaDup = useMemo(() => {
    const key = duplicateLookup.normalizeName(editForm.nama ?? "");
    if (!key) return null;
    const list = duplicateLookup.nameMap.get(key) ?? [];
    const found = list.find((a) => a.profile_id !== editingMember?.profile_id) ?? null;
    return found;
  }, [editForm.nama, duplicateLookup, editingMember?.profile_id]);

  useEffect(() => {
    setSingleNameConfirmed(false);
  }, [singleForm.nama]);
  useEffect(() => {
    setEditNameConfirmed(false);
  }, [editForm.nama, editingMember?.profile_id, showEditForm]);

  const disableSingleSubmit = !!(singleNikDup || singleNomorDup || (singleNamaDup && !singleNameConfirmed));
  const disableEditSubmit = !!(editNikDup || editNomorDup || (editNamaDup && !editNameConfirmed));

  const statusChartData = useMemo(
    () => [
      { name: "Aktif", value: totalAktif, fill: "rgb(52 211 153)" },
      { name: "Nonaktif", value: totalNonAktif, fill: "rgb(251 191 36)" },
    ].filter((d) => d.value > 0),
    [totalAktif, totalNonAktif],
  );

  const kyuDanChartData = useMemo(() => {
    const all = [...data, ...dataNonAktif];
    const map = new Map<string, number>();
    for (const a of all) {
      const label = (a.kyu_dan_terakhir || "").trim() || "Belum diisi";
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [data, dataNonAktif]);

  if (!rantingId) {
    const totalRanting = rantingList.length;
    const sumTotalAnggota = summaryData.total_aktif + summaryData.total_nonaktif;
    const summaryChartData = summaryData.items.map((i) => ({
      name: i.ranting_nama.length > 20 ? i.ranting_nama.slice(0, 18) + "…" : i.ranting_nama,
      jumlah: i.count_aktif + i.count_nonaktif,
      aktif: i.count_aktif,
      nonaktif: i.count_nonaktif,
    })).sort((a, b) => b.jumlah - a.jumlah).slice(0, 14);
    const overviewPieData = [
      { name: "Aktif", value: summaryData.total_aktif, fill: "rgb(52 211 153)" },
      { name: "Nonaktif", value: summaryData.total_nonaktif, fill: "rgb(251 191 36)" },
    ].filter((d) => d.value > 0);

    return (
      <div className="px-6 py-10" suppressHydrationWarning>
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-300" />
            <h1 className="text-base font-semibold text-emerald-100">
              Anggota Ranting
            </h1>
          </div>

          {rantingListLoading ? (
            <div className="flex justify-center py-12">
              <JarvisLoader label="Memuat ranting Anda…" />
            </div>
          ) : rantingList.length > 1 ? (
            <>
              {/* Dashboard ringkasan semua ranting — full color */}
              <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-5 shadow-lg" suppressHydrationWarning>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/90">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  Ringkasan Semua Ranting
                </h2>
                {summaryLoading ? (
                  <div className="py-8">
                    <JarvisLoader label="Memuat ringkasan…" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" suppressHydrationWarning>
                      <div className="rounded-xl bg-gradient-to-br from-emerald-500/25 to-emerald-600/10 border border-emerald-400/30 p-4 flex items-center gap-3 shadow-sm">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/30 border border-emerald-400/40">
                          <Building2 className="h-6 w-6 text-emerald-200" />
                        </div>
                        <div>
                          <p className="text-[11px] text-emerald-200/80 uppercase tracking-wide font-medium">Total Ranting</p>
                          <p className="text-2xl font-bold text-emerald-100">{totalRanting}</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-sky-500/25 to-sky-600/10 border border-sky-400/30 p-4 flex items-center gap-3 shadow-sm">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/30 border border-sky-400/40">
                          <Users className="h-6 w-6 text-sky-200" />
                        </div>
                        <div>
                          <p className="text-[11px] text-sky-200/80 uppercase tracking-wide font-medium">Anggota aktif</p>
                          <p className="text-2xl font-bold text-sky-100">{summaryData.total_aktif}</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 border border-amber-400/30 p-4 flex items-center gap-3 shadow-sm">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/30 border border-amber-400/40">
                          <UserX className="h-6 w-6 text-amber-200" />
                        </div>
                        <div>
                          <p className="text-[11px] text-amber-200/80 uppercase tracking-wide font-medium">Tidak aktif</p>
                          <p className="text-2xl font-bold text-amber-100">{summaryData.total_nonaktif}</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-violet-500/25 to-violet-600/10 border border-violet-400/30 p-4 flex items-center gap-3 shadow-sm">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/30 border border-violet-400/40">
                          <Activity className="h-6 w-6 text-violet-200" />
                        </div>
                        <div>
                          <p className="text-[11px] text-violet-200/80 uppercase tracking-wide font-medium">Total anggota</p>
                          <p className="text-2xl font-bold text-violet-100">{sumTotalAnggota}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2" suppressHydrationWarning>
                      <div className="rounded-xl bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-400/20 p-4">
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-emerald-200/90">
                          <Activity className="h-4 w-4 text-emerald-400" />
                          Status anggota (semua ranting)
                        </div>
                        {overviewPieData.length === 0 ? (
                          <p className="py-10 text-center text-xs text-white/50">Belum ada data.</p>
                        ) : (
                          <div className="h-[220px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={overviewPieData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={78}
                                  paddingAngle={3}
                                  label={({ name, value }) => `${name}: ${value}`}
                                >
                                  {overviewPieData.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px" }}
                                  formatter={(value: number) => [value, "Orang"]}
                                />
                                <Legend layout="horizontal" align="center" wrapperStyle={{ paddingTop: 6 }} formatter={(value) => <span className="text-xs text-white/80">{value}</span>} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl bg-gradient-to-b from-sky-500/10 to-transparent border border-sky-400/20 p-4">
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-sky-200/90">
                          <BarChart3 className="h-4 w-4 text-sky-400" />
                          Jumlah anggota per ranting
                        </div>
                        {summaryChartData.length === 0 ? (
                          <p className="py-10 text-center text-xs text-white/50">Belum ada data.</p>
                        ) : (
                          <div className="h-[220px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={summaryChartData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fill: "rgba(255,255,255,0.85)", fontSize: 11 }} />
                                <Tooltip
                                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px" }}
                                  formatter={(value: number) => [value, "Orang"]}
                                />
                                <Bar dataKey="jumlah" name="Jumlah" radius={[0, 6, 6, 0]} fill="url(#summaryBarGradient)" />
                                <defs>
                                  <linearGradient id="summaryBarGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#2dd4bf" />
                                    <stop offset="100%" stopColor="#22d3ee" />
                                  </linearGradient>
                                </defs>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </section>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6" suppressHydrationWarning>
                <p className="text-sm text-emerald-50/90 mb-4">
                  Anda mengelola beberapa ranting. Pilih ranting untuk melihat dan mengelola anggota:
                </p>
                <input
                  type="text"
                  value={searchRanting}
                  onChange={(e) => setSearchRanting(e.target.value)}
                  placeholder="Cari nama ranting…"
                  className="mb-4 w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-400/80 focus:outline-none"
                  suppressHydrationWarning
                />
                <ul className="space-y-2">
                  {(() => {
                    const filtered = rantingList.filter(
                      (r) => !searchRanting.trim() || r.nama.toLowerCase().includes(searchRanting.toLowerCase())
                    );
                    if (filtered.length === 0) {
                      return (
                        <li className="py-6 text-center text-sm text-white/50">
                          Tidak ada ranting yang cocok dengan pencarian.
                        </li>
                      );
                    }
                    return filtered.map((r) => {
                      const item = summaryData.items.find((i) => i.ranting_id === r.id);
                      const countAktif = item?.count_aktif ?? 0;
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/anggota-ranting?ranting_id=${encodeURIComponent(r.id)}&ranting_nama=${encodeURIComponent(r.nama)}`
                              )
                            }
                            className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/90 hover:bg-emerald-500/10 hover:border-emerald-400/30"
                            suppressHydrationWarning
                          >
                            <span className="flex items-center gap-3">
                              <Building2 className="h-4 w-4 text-emerald-300 shrink-0" />
                              <span className="font-medium">{r.nama}</span>
                            </span>
                            <span className="shrink-0 rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-200">
                              {countAktif} aktif
                            </span>
                          </button>
                        </li>
                      );
                    });
                  })()}
                </ul>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-emerald-50 space-y-3">
              <p>
                Halaman ini menampilkan daftar anggota aktif di satu ranting. Silakan pilih
                ranting dari <span className="font-semibold">Dashboard</span> (panel Cabang per kabupaten/kota)
                lalu klik <span className="font-semibold">Kelola anggota</span>, atau lengkapi profil Anda dengan ranting.
              </p>
              <button
                type="button"
                onClick={() => router.push("/dashboard/home-base")}
                className="mt-2 inline-flex items-center rounded-lg border border-emerald-400/60 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/10"
              >
                Ke Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8" suppressHydrationWarning>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-3" suppressHydrationWarning>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-400/40">
              <Users className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white/95">
                Anggota Ranting
              </h1>
              <p className="text-xs text-white/60">
                Daftar anggota aktif di ranting{" "}
                <span className="font-semibold text-emerald-200">
                  {rantingNamaParam || "terpilih"}
                </span>
                .
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2" suppressHydrationWarning>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-white/75 hover:bg-white/10"
              suppressHydrationWarning
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                loadData();
              }}
              className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
              suppressHydrationWarning
            >
              Muat ulang
            </button>
          </div>
        </header>

        {/* Dashboard ringkasan & grafik — full color */}
        <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-5 shadow-lg" suppressHydrationWarning>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/90">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            Ringkasan Ranting
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" suppressHydrationWarning>
            <div className="rounded-xl bg-gradient-to-br from-emerald-500/25 to-emerald-600/10 border border-emerald-400/30 p-4 flex items-center gap-3 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/30 border border-emerald-400/40">
                <Users className="h-6 w-6 text-emerald-200" />
              </div>
              <div>
                <p className="text-[11px] text-emerald-200/80 uppercase tracking-wide font-medium">Anggota aktif</p>
                <p className="text-2xl font-bold text-emerald-100">{totalAktif}</p>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 border border-amber-400/30 p-4 flex items-center gap-3 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/30 border border-amber-400/40">
                <UserX className="h-6 w-6 text-amber-200" />
              </div>
              <div>
                <p className="text-[11px] text-amber-200/80 uppercase tracking-wide font-medium">Tidak aktif</p>
                <p className="text-2xl font-bold text-amber-100">{totalNonAktif}</p>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-sky-500/25 to-sky-600/10 border border-sky-400/30 p-4 flex items-center gap-3 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/30 border border-sky-400/40">
                <Activity className="h-6 w-6 text-sky-200" />
              </div>
              <div>
                <p className="text-[11px] text-sky-200/80 uppercase tracking-wide font-medium">Total anggota</p>
                <p className="text-2xl font-bold text-sky-100">{totalAnggota}</p>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-violet-500/25 to-violet-600/10 border border-violet-400/30 p-4 flex items-center gap-3 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/30 border border-violet-400/40">
                <FileCheck className="h-6 w-6 text-violet-200" />
              </div>
              <div>
                <p className="text-[11px] text-violet-200/80 uppercase tracking-wide font-medium">Data lengkap</p>
                <p className="text-2xl font-bold text-violet-100">{lengkapanData}</p>
                <p className="text-[10px] text-violet-200/60">NIK + No. Anggota</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2" suppressHydrationWarning>
            <div className="rounded-xl bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-400/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-emerald-200/90">
                <Activity className="h-4 w-4 text-emerald-400" />
                Status anggota
              </div>
              {statusChartData.length === 0 ? (
                <p className="py-10 text-center text-xs text-white/50">Belum ada data.</p>
              ) : (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={{ stroke: "rgba(255,255,255,0.3)" }}
                      >
                        {statusChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
                        labelStyle={{ color: "rgba(255,255,255,0.95)" }}
                        formatter={(value: number) => [value, "Orang"]}
                      />
                      <Legend layout="horizontal" align="center" wrapperStyle={{ paddingTop: 8 }} formatter={(value) => <span className="text-xs text-white/80">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="rounded-xl bg-gradient-to-b from-sky-500/10 to-transparent border border-sky-400/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-sky-200/90">
                <BarChart3 className="h-4 w-4 text-sky-400" />
                Distribusi Kyu/Dan
              </div>
              {kyuDanChartData.length === 0 ? (
                <p className="py-10 text-center text-xs text-white/50">Belum ada data.</p>
              ) : (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kyuDanChartData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                      <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={88} tick={{ fill: "rgba(255,255,255,0.85)", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
                        formatter={(value: number) => [value, "Orang"]}
                      />
                      <Bar dataKey="count" name="Jumlah" radius={[0, 6, 6, 0]} fill="url(#barGradient)" />
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#2dd4bf" />
                          <stop offset="100%" stopColor="#22d3ee" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
          {pendingPrestasiCount > 0 && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90 flex items-center gap-2">
              <FileCheck className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <span className="font-semibold">{pendingPrestasiCount}</span> prestasi menunggu verifikasi.
                Buka <strong>Edit</strong> pada baris anggota untuk verifikasi.
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-white/60">
              Total anggota aktif:{" "}
              <span className="font-semibold text-emerald-200">{data.length}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2" suppressHydrationWarning>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama / No. Anggota…"
                className="w-56 rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-emerald-400/80 focus:outline-none"
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowSingleForm(true)}
                className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
                suppressHydrationWarning
              >
                Tambah satuan
              </button>
              <button
                type="button"
                onClick={() => setShowBulkForm(true)}
                className="rounded-lg border border-white/20 bg-white/[0.02] px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                suppressHydrationWarning
              >
                Tambah massal
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-4">
              <JarvisLoader label="Memuat anggota ranting…" />
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03] text-left text-white/60">
                    <th className="px-3 py-2 w-14">Foto</th>
                    <th className="px-3 py-2">Nama</th>
                    <th className="px-3 py-2">NIK</th>
                    <th className="px-3 py-2">No. Anggota</th>
                    <th className="px-3 py-2">Kyu/Dan</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-center min-w-[120px]">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr
                      key={a.profile_id}
                      className="border-b border-white/5 hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-2">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                          {a.avatar_url ? (
                            <Image
                              src={a.avatar_url}
                              alt={a.nama}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <User size={20} className="text-white/50" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-white/90">{a.nama}</td>
                      <td className="px-3 py-2 text-white/70">
                        {a.nik || "—"}
                      </td>
                      <td className="px-3 py-2 text-white/70">
                        {a.nomor || "—"}
                      </td>
                      <td className="px-3 py-2 text-white/70">
                        {a.kyu_dan_terakhir}
                      </td>
                      <td className="px-3 py-2 text-emerald-300">
                        {a.status || "AKTIF"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openEditForm(a)}
                            className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10 hover:text-white"
                            title="Edit anggota"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          {a.user_id ? (
                            <a
                              href={`/api/anggota/${encodeURIComponent(a.user_id)}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10 hover:text-white"
                              title="Kartu digital (PDF)"
                            >
                              <FileText size={12} />
                              PDF
                            </a>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/40"
                              title="Belum punya akun login"
                            >
                              <ExternalLink size={12} />
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-white/50">
                  Belum ada anggota aktif yang cocok dengan filter.
                </p>
              )}
            </div>
          )}

          <p className="pt-2 text-[11px] text-white/45">
            Pengelolaan detail anggota (No. Anggota, status, data profil) tetap melalui
            menu <span className="font-semibold">Profil / Keanggotaan</span>. Halaman ini
            hanya ringkasan anggota aktif per ranting.
          </p>
        </div>

        {/* Panel Anggota tidak aktif */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden" suppressHydrationWarning>
          <button
            type="button"
            onClick={() => setShowNonAktifPanel((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
            suppressHydrationWarning
          >
            <span className="flex items-center gap-2 text-sm font-medium text-white/90">
              <UserX className="h-4 w-4 text-amber-400/80" />
              Anggota tidak aktif
              <span className="text-xs font-normal text-white/50">
                ({dataNonAktif.length} orang)
              </span>
            </span>
            {showNonAktifPanel ? (
              <ChevronDown className="h-4 w-4 text-white/50" />
            ) : (
              <ChevronRight className="h-4 w-4 text-white/50" />
            )}
          </button>
          {showNonAktifPanel && (
            <div className="border-t border-white/10 p-4">
              {loadingNonAktif ? (
                <div className="py-4">
                  <JarvisLoader label="Memuat anggota tidak aktif…" />
                </div>
              ) : dataNonAktif.length === 0 ? (
                <p className="py-4 text-center text-xs text-white/50">
                  Tidak ada anggota dengan status tidak aktif.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-left text-white/60">
                        <th className="px-3 py-2 w-14">Foto</th>
                        <th className="px-3 py-2">Nama</th>
                        <th className="px-3 py-2">NIK</th>
                        <th className="px-3 py-2">No. Anggota</th>
                        <th className="px-3 py-2">Kyu/Dan</th>
                        <th className="px-3 py-2 text-center min-w-[100px]">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataNonAktif.map((a) => (
                        <tr
                          key={a.profile_id}
                          className="border-b border-white/5 hover:bg-white/[0.03]"
                        >
                          <td className="px-3 py-2">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                              {a.avatar_url ? (
                                <Image
                                  src={a.avatar_url}
                                  alt={a.nama}
                                  width={40}
                                  height={40}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <User size={20} className="text-white/50" />
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-white/90">{a.nama}</td>
                          <td className="px-3 py-2 text-white/70">{a.nik || "—"}</td>
                          <td className="px-3 py-2 text-white/70">{a.nomor || "—"}</td>
                          <td className="px-3 py-2 text-white/70">{a.kyu_dan_terakhir}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setAktif(a)}
                                disabled={activatingId === a.profile_id}
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/20 px-2 py-1 text-[11px] font-medium text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-50"
                                title="Aktifkan kembali ke daftar anggota aktif"
                              >
                                {activatingId === a.profile_id ? "…" : "Aktifkan"}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditForm(a)}
                                className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10"
                                title="Edit"
                              >
                                <Pencil size={12} />
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {showSingleForm && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
            role="dialog"
            aria-modal="true"
            aria-label="Tambah anggota (satuan)"
            onClick={() => setShowSingleForm(false)}
          >
            <form
              className="w-full max-w-md rounded-xl border border-white/15 bg-zinc-950/95 p-5 text-xs text-white/80 space-y-4"
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSingleSubmit}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  Tambah anggota (satuan)
                </h2>
                <button
                  type="button"
                  onClick={() => setShowSingleForm(false)}
                  className="text-[11px] text-white/60 hover:text-white/90"
                  aria-label="Tutup"
                >
                  Tutup
                </button>
              </div>
              <p className="text-[11px] text-white/55">
                Isian ini akan dipakai untuk membuat / menghubungkan profil anggota di
                ranting <span className="font-semibold">{rantingNamaParam}</span>.{" "}
                <span className="font-semibold">NIK</span> dan{" "}
                <span className="font-semibold">No. Anggota</span> bisa diisi menyusul.
              </p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">NIK</label>
                  <input
                    type="text"
                    value={singleForm.nik}
                    onChange={(e) =>
                      setSingleForm((f) => ({ ...f, nik: e.target.value }))
                    }
                    className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-emerald-400/80 focus:outline-none"
                    placeholder="16 digit NIK"
                  />
                  {singleNikDup && (
                    <p className="text-[11px] text-rose-300/90">
                      NIK sudah dipakai oleh <span className="font-semibold">{singleNikDup.nama}</span>.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">No. Anggota</label>
                  <input
                    type="text"
                    value={singleForm.nomor}
                    onChange={(e) =>
                      setSingleForm((f) => ({ ...f, nomor: e.target.value }))
                    }
                    className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-emerald-400/80 focus:outline-none"
                    placeholder="Nomor keanggotaan (unik)"
                  />
                  {singleNomorDup && (
                    <p className="text-[11px] text-rose-300/90">
                      No. Anggota sudah dipakai oleh{" "}
                      <span className="font-semibold">{singleNomorDup.nama}</span>.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">Nama lengkap</label>
                  <input
                    type="text"
                    value={singleForm.nama}
                    onChange={(e) =>
                      setSingleForm((f) => ({ ...f, nama: e.target.value }))
                    }
                    className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-emerald-400/80 focus:outline-none"
                    placeholder="Nama sesuai identitas"
                  />
                  {singleNamaDup && !singleNameConfirmed && (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-amber-200/90">
                        Nama mirip/sama sudah ada:{" "}
                        <span className="font-semibold">{singleNamaDup.nama}</span>. Tetap simpan?
                      </p>
                      <button
                        type="button"
                        onClick={() => setSingleNameConfirmed(true)}
                        className="shrink-0 rounded-md border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-100 hover:bg-amber-500/20"
                      >
                        Ya, lanjut
                      </button>
                    </div>
                  )}
                  {singleNamaDup && singleNameConfirmed && (
                    <p className="text-[11px] text-emerald-200/80">
                      Duplikat nama sudah dikonfirmasi. Anda bisa lanjut simpan.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">Kyu</label>
                    <Select
                      value={String(singleForm.kyu_level)}
                      onValueChange={(v) =>
                        setSingleForm((f) => ({ ...f, kyu_level: Number(v) }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs bg-white/[0.04] border-white/15 text-white/90 focus:ring-cyan-400/20">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">—</SelectItem>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            Kyu {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/60">Dan</label>
                    <Select
                      value={String(singleForm.dan)}
                      onValueChange={(v) =>
                        setSingleForm((f) => ({ ...f, dan: Number(v) }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs bg-white/[0.04] border-white/15 text-white/90 focus:ring-cyan-400/20">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">—</SelectItem>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            Dan {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-white/50">
                  Submit akan membuat / menghubungkan profil anggota. Kyu/Dan opsional.
                </span>
                <button
                  type="submit"
                  disabled={disableSingleSubmit}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        )}

        {showEditForm && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
            role="dialog"
            aria-modal="true"
            aria-label="Edit anggota"
            onClick={() => setShowEditForm(false)}
          >
            <form
              className="w-full max-w-md rounded-xl border border-white/15 bg-zinc-950/95 p-5 text-xs text-white/80 space-y-4"
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleEditSubmit}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">Edit anggota</h2>
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="text-[11px] text-white/60 hover:text-white/90"
                  aria-label="Tutup"
                >
                  Tutup
                </button>
              </div>
              <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-white/60">NIK</label>
                      <input
                        type="text"
                        value={editForm.nik}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, nik: e.target.value }))
                        }
                        className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-emerald-400/80 focus:outline-none"
                        placeholder="16 digit NIK"
                      />
                      {editNikDup && (
                        <p className="text-[11px] text-rose-300/90">
                          NIK sudah dipakai oleh <span className="font-semibold">{editNikDup.nama}</span>.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-white/60">No. Anggota</label>
                      <input
                        type="text"
                        value={editForm.nomor}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, nomor: e.target.value }))
                        }
                        className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-emerald-400/80 focus:outline-none"
                        placeholder="Nomor keanggotaan"
                      />
                      {editNomorDup && (
                        <p className="text-[11px] text-rose-300/90">
                          No. Anggota sudah dipakai oleh{" "}
                          <span className="font-semibold">{editNomorDup.nama}</span>.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-white/60">Nama lengkap</label>
                      <input
                        type="text"
                        value={editForm.nama}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, nama: e.target.value }))
                        }
                        className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-emerald-400/80 focus:outline-none"
                        placeholder="Nama sesuai identitas"
                      />
                      {editNamaDup && !editNameConfirmed && (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-amber-200/90">
                            Nama mirip/sama sudah ada:{" "}
                            <span className="font-semibold">{editNamaDup.nama}</span>. Tetap simpan?
                          </p>
                          <button
                            type="button"
                            onClick={() => setEditNameConfirmed(true)}
                            className="shrink-0 rounded-md border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-100 hover:bg-amber-500/20"
                          >
                            Ya, lanjut
                          </button>
                        </div>
                      )}
                      {editNamaDup && editNameConfirmed && (
                        <p className="text-[11px] text-emerald-200/80">
                          Duplikat nama sudah dikonfirmasi. Anda bisa lanjut simpan.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-white/60">Status keanggotaan</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={editForm.status === "AKTIF"}
                          aria-label={editForm.status === "AKTIF" ? "Aktif" : "Tidak aktif"}
                          onClick={() =>
                            setEditForm((f) => ({
                              ...f,
                              status: f.status === "AKTIF" ? "NONAKTIF" : "AKTIF",
                            }))
                          }
                          className={`flex rounded-full p-0.5 w-12 flex-shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
                            editForm.status === "AKTIF"
                              ? "justify-end bg-emerald-500/50"
                              : "justify-start bg-white/15"
                          }`}
                        >
                          <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
                        </button>
                        <span className="text-[11px] text-white/70">
                          {editForm.status === "AKTIF" ? "Aktif" : "Tidak aktif"}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-white/60">Kyu</label>
                        <Select
                          value={String(editForm.kyu_level)}
                          onValueChange={(v) =>
                            setEditForm((f) => ({ ...f, kyu_level: Number(v) }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs bg-white/[0.04] border-white/15 text-white/90 focus:ring-cyan-400/20">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">—</SelectItem>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                Kyu {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-white/60">Dan</label>
                        <Select
                          value={String(editForm.dan)}
                          onValueChange={(v) =>
                            setEditForm((f) => ({ ...f, dan: Number(v) }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs bg-white/[0.04] border-white/15 text-white/90 focus:ring-cyan-400/20">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">—</SelectItem>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                Dan {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Prestasi anggota — Ketua Ranting bisa verifikasi */}
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <h3 className="text-[11px] font-medium text-white/70 mb-2">Prestasi (riwayat pertandingan)</h3>
                    {memberPrestasiLoading ? (
                      <p className="text-[11px] text-white/50">Memuat…</p>
                    ) : memberPrestasi.length === 0 ? (
                      <p className="text-[11px] text-white/50">Belum ada prestasi.</p>
                    ) : (
                      <ul className="space-y-2 max-h-40 overflow-y-auto">
                        {memberPrestasi.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-2 py-1.5 text-[11px]"
                          >
                            <span className="min-w-0 truncate text-white/80">
                              {p.namaKejuaraan}
                              {p.tahun ? ` (${p.tahun})` : ""}
                              {p.tingkat ? ` · ${p.tingkat}` : ""}
                            </span>
                            <span className="flex items-center gap-1.5 shrink-0">
                              {p.verifiedAt ? (
                                <span className="text-emerald-400" title="Terverifikasi">
                                  ✓ Terverifikasi
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={verifyingPrestasiId === p.id}
                                  onClick={() => handleVerifyPrestasi(p.id)}
                                  className="rounded border border-cyan-400/50 bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-medium text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
                                >
                                  {verifyingPrestasiId === p.id ? "…" : "Verifikasi"}
                                </button>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={editFormLoading || disableEditSubmit}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {editFormLoading ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        )}

        {showBulkForm && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
            role="dialog"
            aria-modal="true"
            aria-label="Tambah anggota (massal)"
            onClick={() => setShowBulkForm(false)}
          >
            <div
              className="w-full max-w-2xl rounded-xl border border-white/15 bg-zinc-950/95 p-5 text-xs text-white/80 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  Tambah anggota (massal)
                </h2>
                <button
                  type="button"
                  onClick={() => setShowBulkForm(false)}
                  className="text-[11px] text-white/60 hover:text-white/90"
                  aria-label="Tutup"
                >
                  Tutup
                </button>
              </div>
              <p className="text-[11px] text-white/55">
                Tempelkan data anggota dalam format baris per baris. Contoh:{" "}
                <code className="rounded bg-black/60 px-1 py-0.5">
                  NIK;NO_ANGGOTA;NAMA
                </code>
                . Setiap baris akan dihubungkan ke profil di ranting{" "}
                <span className="font-semibold">{rantingNamaParam}</span>.
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-[11px] text-white placeholder:text-white/35 focus:border-emerald-400/80 focus:outline-none font-mono"
                placeholder={"3276xxxxxxxxxxxx;INKAI-0001;Nama Anggota 1\n3276xxxxxxxxxxxx;INKAI-0002;Nama Anggota 2"}
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-white/50">
                  Nanti backend akan mem-parsing tiap baris dan membuat / mengupdate
                  profil beserta ranting_id.
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const lines = bulkText
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean);
                    if (lines.length === 0) {
                      toast.error("Tidak ada baris data untuk diproses.", {
                        duration: TOAST_DURATION_MS,
                      });
                      return;
                    }
                    const entries = lines
                      .map((line) => {
                        const [nik, nomor, nama] = line.split(";");
                        return {
                          nik: (nik || "").trim() || null,
                          nomor: (nomor || "").trim() || null,
                          nama: (nama || "").trim() || null,
                          ranting_id: rantingId,
                        };
                      })
                      .filter((e) => (e.nik || e.nomor) && e.nama);
                    if (entries.length === 0) {
                      toast.error(
                        "Format data tidak valid. Gunakan NIK;NO_ANGGOTA;NAMA.",
                        { duration: TOAST_DURATION_MS }
                      );
                      return;
                    }
                    try {
                      const res = await fetch("/api/anggota-ranting/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ entries }),
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        toast.error(
                          err?.message || "Gagal memproses data anggota.",
                          { duration: TOAST_DURATION_MS }
                        );
                        return;
                      }
                      const json = await res.json();
                      const count =
                        Array.isArray(json.entries) && json.entries.length
                          ? json.entries.length
                          : entries.length;
                      toast.success(
                        `${count} data anggota sudah tersimpan untuk ranting ini.`,
                        { duration: TOAST_DURATION_MS }
                      );
                      setBulkText("");
                      setShowBulkForm(false);
                      await loadData();
                      await loadNonAktif();
                    } catch {
                      toast.error("Gagal memproses data anggota.", {
                        duration: TOAST_DURATION_MS,
                      });
                    }
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  Proses data
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

