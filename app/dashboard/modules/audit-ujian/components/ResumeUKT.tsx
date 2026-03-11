"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import JarvisLoader from "@/components/JarvisLoader";
import { renderKwitansiPdf, getKwitansiFilename } from "@/components/kwitansi";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScope } from "@/app/dashboard/components/topbar-premium/context/ScopeContext";
import { useBootstrapStore } from "@/app/dashboard/store/bootstrapStore";

type TahunAjaran = { id: string; nama: string; tahun: number; periode: string };
type RantingOption = { id: string; nama: string };
type PendaftaranItem = {
  id: string;
  profile_id: string;
  ranting_id?: string;
  ranting_nama?: string;
  nama: string;
  nomor: string;
  kyu_dan_terakhir: string;
  status_bayar: string;
  total_bayar: number | null;
  bukti_transfer_path: string | null;
  file_url: string | null;
  dikonfirmasi_at: string | null;
  kwitansi_token?: string | null;
  alasan_tolak_bukti?: string | null;
};
type BatalItem = PendaftaranItem & {
  batal_at: string | null;
  alasan_batal: string | null;
  refund_jumlah: number | null;
  refund_status: string;
  refund_at: string | null;
  refund_catatan: string | null;
  refund_bukti_path: string | null;
  refund_bukti_file_url: string | null;
  ranting_nama?: string;
};
type ResumeData = {
  list: PendaftaranItem[];
  summary: { total: number; belum_bayar: number; lunas: number; total_bayar: number };
  list_batal?: BatalItem[];
};

type PendingMember = {
  profile_id: string;
  nama: string;
  nomor: string;
  kyu_dan_terakhir: string;
};

type Props = {
  tahunId: string;
  rantingId: string;
  resumeVersion: number;
  /** Anggota yang dicentang di kolom kiri (belum disimpan); ditampilkan di tabel dan kolom diaktifkan. */
  pendingSelection?: PendingMember[];
  /** Dipanggil setelah batal ikut berhasil agar kolom kiri bisa refetch status (centang + Batal). */
  onBatalSuccess?: () => void;
};

/** Cabang/PP boleh isi pengembalian dana; Ketua Ranting hanya alasan batal. Level >= 3 = cabang. */
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

/** Hanya Cabang atau PP yang boleh verifikasi & konfirmasi lunas; Ketua Ranting tidak. */
function useCanConfirmLunas(): boolean {
  const { scope } = useScope();
  return useMemo(
    () => !!scope?.is_pp || (scope?.cabang_ids?.length ?? 0) > 0,
    [scope?.is_pp, scope?.cabang_ids]
  );
}

const REPORT_ALL = "all";

export default function ResumeUKT({ tahunId, rantingId, resumeVersion, pendingSelection = [], onBatalSuccess }: Props) {
  const canEditRefund = useCanEditRefund();
  const canConfirmLunas = useCanConfirmLunas();
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [rantingList, setRantingList] = useState<RantingOption[]>([]);
  const [reportRantingId, setReportRantingId] = useState<string>(REPORT_ALL);
  const [data, setData] = useState<ResumeData | null>(null);
  const [loadingResume, setLoadingResume] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [batalModal, setBatalModal] = useState<{ id: string; nama: string } | null>(null);
  const [batalSubmitting, setBatalSubmitting] = useState(false);
  const [batalForm, setBatalForm] = useState({ alasan_batal: "", refund_status: "tidak_ada" as "tidak_ada" | "pending" | "dikembalikan", refund_jumlah: "", refund_catatan: "" });
  const [refundModal, setRefundModal] = useState<BatalItem | null>(null);
  const [refundForm, setRefundForm] = useState({ refund_status: "tidak_ada" as "tidak_ada" | "pending" | "dikembalikan", refund_jumlah: "", refund_catatan: "", refund_bukti_path: "" as string });
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundUploading, setRefundUploading] = useState(false);
  const refundFileInputRef = useRef<HTMLInputElement | null>(null);
  const [printingKwitansiId, setPrintingKwitansiId] = useState<string | null>(null);
  const [tolakModal, setTolakModal] = useState<{ id: string; nama: string } | null>(null);
  const [tolakAlasan, setTolakAlasan] = useState("");
  const [tolakSubmitting, setTolakSubmitting] = useState(false);
  const [showPesertaBatal, setShowPesertaBatal] = useState(false);
  const [searchLaporan, setSearchLaporan] = useState("");
  const [ketuaRanting] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const refetchResumeRef = useRef<() => void>(() => {});

  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/api/ukt/tahun-ajaran", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTahunList(Array.isArray(d) ? d : []))
      .catch(() => setTahunList([]));
  }, []);

  useEffect(() => {
    fetch("/api/ranting", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRantingList(Array.isArray(d) ? d : []))
      .catch(() => setRantingList([]));
  }, []);

  // Sinkronkan filter laporan dengan ranting yang dipilih di panel kiri (Pendaftaran UKT)
  useEffect(() => {
    if (rantingId) setReportRantingId(rantingId);
    else setReportRantingId(REPORT_ALL);
  }, [rantingId]);

  const effectiveReportRanting = reportRantingId === REPORT_ALL ? REPORT_ALL : reportRantingId;
  const canFetchReport = Boolean(tahunId) && (effectiveReportRanting === REPORT_ALL || Boolean(effectiveReportRanting));

  useEffect(() => {
    if (!canFetchReport) {
      setData(null);
      return;
    }
    setLoadingResume(true);
    const url = `/api/ukt/pendaftaran?tahun_ajaran_id=${encodeURIComponent(tahunId)}&ranting_id=${encodeURIComponent(effectiveReportRanting)}&include_batal=true`;
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.list && d.summary) setData(d);
        else setData(null);
      })
      .catch(() => setData(null))
      .finally(() => setLoadingResume(false));
  }, [canFetchReport, tahunId, effectiveReportRanting, resumeVersion]);

  const refetchResume = () => {
    if (!canFetchReport) return;
    setLoadingResume(true);
    const url = `/api/ukt/pendaftaran?tahun_ajaran_id=${encodeURIComponent(tahunId)}&ranting_id=${encodeURIComponent(effectiveReportRanting)}&include_batal=true`;
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => (d.list && d.summary ? setData(d) : setData(null)))
      .finally(() => setLoadingResume(false));
  };
  refetchResumeRef.current = refetchResume;

  // Realtime: ketika ranting/cabang lain mengubah pendaftaran (daftar, batal, refund), data ikut ter-update (hanya saat laporan per ranting)
  useEffect(() => {
    if (effectiveReportRanting === REPORT_ALL) return;
    const channel = supabase
      .channel(`ukt_pendaftaran:${effectiveReportRanting}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ukt_pendaftaran",
          filter: `ranting_id=eq.${effectiveReportRanting}`,
        },
        () => refetchResumeRef.current()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveReportRanting]);

  const handleUploadBukti = async (id: string, file: File) => {
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
        alert(j.message || "Gagal upload bukti");
        return;
      }
      refetchResume();
    } finally {
      setUploadingId(null);
    }
  };

  const canSelectForBulk = (r: PendaftaranItem) =>
    r.status_bayar === "menunggu_bayar" || r.status_bayar === "ditolak";
  const selectableList = useMemo(
    () => (data?.list ?? []).filter(canSelectForBulk),
    [data?.list]
  );

  const handleBulkUpload = async (file: File) => {
    const ids = Array.from(selectedForBulk);
    if (ids.length === 0) return;
    setUploadingBulk(true);
    const form = new FormData();
    form.append("file", file);
    form.append("ids", ids.join(","));
    try {
      const res = await fetch("/api/ukt/pendaftaran/upload-bulk", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j.message || "Gagal upload bukti sekaligus");
        return;
      }
      setSelectedForBulk(new Set());
      refetchResume();
      alert(`Bukti berhasil diunggah untuk ${ids.length} peserta. Menunggu verifikasi Cabang.`);
    } finally {
      setUploadingBulk(false);
    }
  };

  const handleBatalkanOpen = (id: string, nama: string) => {
    setBatalModal({ id, nama });
    setBatalForm({ alasan_batal: "", refund_status: "tidak_ada", refund_jumlah: "", refund_catatan: "" });
  };

  const handleBatalkanSubmit = async () => {
    if (!batalModal) return;
    setBatalSubmitting(true);
    try {
      const body: Record<string, unknown> = {
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
        alert((j.message as string) || "Gagal membatalkan");
        return;
      }
      setBatalModal(null);
      refetchResume();
      onBatalSuccess?.();
    } finally {
      setBatalSubmitting(false);
    }
  };

  const handleRefundOpen = (b: BatalItem) => {
    setRefundModal(b);
    setRefundForm({
      refund_status: (b.refund_status as "tidak_ada" | "pending" | "dikembalikan") || "tidak_ada",
      refund_jumlah: b.refund_jumlah != null ? String(b.refund_jumlah) : "",
      refund_catatan: b.refund_catatan ?? "",
      refund_bukti_path: b.refund_bukti_path ?? "",
    });
  };

  const handleRefundUpload = async (id: string, file: File) => {
    setRefundUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/ukt/pendaftaran/${id}/upload-refund`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert((j.message as string) || "Gagal upload bukti");
        return;
      }
      const d = await res.json();
      setRefundForm((f) => ({ ...f, refund_bukti_path: d.path ?? "" }));
      refetchResume();
    } finally {
      setRefundUploading(false);
    }
  };

  const handleRefundSubmit = async () => {
    if (!refundModal) return;
    setRefundSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        refund_status: refundForm.refund_status,
      };
      if (refundForm.refund_status !== "tidak_ada") {
        const num = parseFloat(refundForm.refund_jumlah.replace(/,/g, "."));
        body.refund_jumlah = Number.isNaN(num) ? null : num;
        body.refund_catatan = refundForm.refund_catatan.trim() || null;
      }
      const res = await fetch(`/api/ukt/pendaftaran/${refundModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert((j.message as string) || "Gagal menyimpan pengembalian dana");
        return;
      }
      setRefundModal(null);
      refetchResume();
    } finally {
      setRefundSubmitting(false);
    }
  };

  const handleKonfirmasiLunas = async (id: string, nama: string) => {
    if (
      !confirm(
        `Verifikasi bukti transfer untuk ${nama}?\n\nSetelah diverifikasi, status berubah menjadi Lunas dan keterangan di kolom Aksi akan diperbarui.`
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
      alert((j.message as string) || "Gagal konfirmasi");
      return;
    }
    refetchResume();
  };

  const handleTolakBuktiOpen = (id: string, nama: string) => {
    setTolakModal({ id, nama });
    setTolakAlasan("");
  };

  const handleTolakBuktiSubmit = async () => {
    if (!tolakModal || !tolakAlasan.trim()) {
      alert("Alasan penolakan wajib diisi.");
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
        alert((j.message as string) || "Gagal menolak bukti");
        return;
      }
      setTolakModal(null);
      setTolakAlasan("");
      refetchResume();
    } finally {
      setTolakSubmitting(false);
    }
  };

  const handleCetakKwitansi = async (r: PendaftaranItem) => {
    if (r.status_bayar !== "lunas") return;
    setPrintingKwitansiId(r.id);
    try {
      let token = r.kwitansi_token ?? null;
      if (!token) {
        const ensureRes = await fetch(`/api/ukt/pendaftaran/${r.id}/ensure-kwitansi-token`, {
          method: "POST",
          credentials: "include",
        });
        if (!ensureRes.ok) {
          alert("Gagal membuat token kwitansi");
          return;
        }
        const ensureData = await ensureRes.json();
        token = ensureData?.kwitansi_token ?? null;
        if (!token) {
          alert("Token kwitansi tidak tersedia");
          return;
        }
        refetchResume();
      }
      const verifyRes = await fetch(`/api/kwitansi/verify?token=${encodeURIComponent(token)}`, {
        credentials: "include",
      });
      if (!verifyRes.ok) {
        alert("Data kwitansi tidak ditemukan");
        return;
      }
      const data = await verifyRes.json() as {
        id: string;
        token: string;
        no_kwitansi: string;
        nama: string;
        nomor: string;
        jenis: string;
        event: string;
        ranting: string;
        nominal: number;
        tanggal: string;
      };
      const printUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/kwitansi?token=${encodeURIComponent(token)}`
          : "";

      const [qrRes, { default: jsPDF }] = await Promise.all([
        fetch(`/api/qr?url=${encodeURIComponent(printUrl)}`, { credentials: "include" }),
        import("jspdf"),
      ]);
      if (!qrRes.ok) throw new Error("Gagal generate QR");
      const { dataUrl: qrDataUrl } = (await qrRes.json()) as { dataUrl: string };
      const doc = new jsPDF();
      const kwitansiData = {
        id: data.id,
        token: data.token,
        no_kwitansi: data.no_kwitansi,
        nama: data.nama,
        nomor: data.nomor,
        jenis: data.jenis ?? "Ujian Kenaikan Tingkat (UKT)",
        event: data.event,
        ranting: data.ranting,
        nominal: data.nominal,
        tanggal: data.tanggal,
      };
      renderKwitansiPdf(doc, kwitansiData, qrDataUrl);
      doc.save(getKwitansiFilename(kwitansiData));
    } catch (e) {
      console.error(e);
      alert("Gagal membuat PDF kwitansi");
    } finally {
      setPrintingKwitansiId(null);
    }
  };

  const reportRantingNama =
    effectiveReportRanting === REPORT_ALL
      ? "Semua Ranting"
      : rantingList.find((r) => r.id === effectiveReportRanting)?.nama ?? "—";
  const tahunNama = tahunList.find((t) => t.id === tahunId)?.nama ?? "—";
  const isReportAll = effectiveReportRanting === REPORT_ALL;

  const savedProfileIds = useMemo(
    () => new Set((data?.list ?? []).map((r) => r.profile_id)),
    [data?.list]
  );
  const pendingRows = useMemo(() => {
    if (effectiveReportRanting !== rantingId) return [];
    return pendingSelection.filter((p) => !savedProfileIds.has(p.profile_id));
  }, [effectiveReportRanting, rantingId, pendingSelection, savedProfileIds]);
  const hasPending = pendingRows.length > 0;

  const searchLower = searchLaporan.trim().toLowerCase();
  const filteredList = useMemo(() => {
    if (!searchLower) return data?.list ?? [];
    const list = data?.list ?? [];
    return list.filter(
      (r) =>
        (r.nama ?? "").toLowerCase().includes(searchLower) ||
        (r.nomor ?? "").toLowerCase().includes(searchLower) ||
        (r.kyu_dan_terakhir ?? "").toLowerCase().includes(searchLower) ||
        ((r as PendaftaranItem & { ranting_nama?: string }).ranting_nama ?? "").toLowerCase().includes(searchLower)
    );
  }, [data?.list, searchLower]);
  const filteredPendingRows = useMemo(() => {
    if (!searchLower) return pendingRows;
    return pendingRows.filter(
      (p) =>
        (p.nama ?? "").toLowerCase().includes(searchLower) ||
        (p.nomor ?? "").toLowerCase().includes(searchLower) ||
        (p.kyu_dan_terakhir ?? "").toLowerCase().includes(searchLower)
    );
  }, [pendingRows, searchLower]);

  const totalRows = filteredList.length + filteredPendingRows.length;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-100">Laporan Pendaftaran UKT</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Ringkasan peserta untuk tahun ajaran & ranting yang dipilih; upload bukti & konfirmasi lunas.
        </p>
        {tahunId && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">Tampilkan laporan:</span>
            <Select
              value={reportRantingId || undefined}
              onValueChange={(v) => setReportRantingId(v ?? REPORT_ALL)}
            >
              <SelectTrigger className="w-[220px] border-white/10 bg-white/5 text-zinc-200 focus:border-zinc-500 focus:ring-zinc-500/30">
                <SelectValue placeholder="Semua Ranting" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-zinc-900">
                <SelectItem value={REPORT_ALL} className="text-zinc-200 focus:bg-white/10 focus:text-zinc-100 data-[highlighted]:bg-white/10 data-[highlighted]:text-zinc-100">
                  Semua Ranting
                </SelectItem>
                {rantingList.map((r) => (
                  <SelectItem
                    key={r.id}
                    value={r.id}
                    className="text-zinc-200 focus:bg-white/10 focus:text-zinc-100 data-[highlighted]:bg-white/10 data-[highlighted]:text-zinc-100"
                  >
                    {r.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!tahunId ? (
        <p className="text-sm text-zinc-500">
          Pilih tahun ajaran di kolom Pendaftaran (kiri) untuk menampilkan laporan.
        </p>
      ) : !canFetchReport ? (
        <p className="text-sm text-zinc-500">
          Pilih &quot;Semua Ranting&quot; atau satu ranting di atas untuk menampilkan laporan.
        </p>
      ) : loadingResume ? (
        <div className="mt-6"><JarvisLoader label="Memuat resume…" /></div>
      ) : data || hasPending ? (
        <>
          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-medium text-zinc-200">
              Ranting: {reportRantingNama} — Tahun Ajaran: {tahunNama}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              <span>Total peserta: {data?.summary?.total ?? 0}{hasPending ? ` (+ ${pendingRows.length} akan didaftarkan)` : ""}</span>
              <span>Belum bayar: {data?.summary?.belum_bayar ?? 0}</span>
              <span>Lunas: {data?.summary?.lunas ?? 0}</span>
              {(data?.summary?.total_bayar ?? 0) > 0 && (
                <span>Total bayar: Rp {(data!.summary.total_bayar).toLocaleString("id-ID")}</span>
              )}
              {ketuaRanting && (
                <span className="ml-auto text-zinc-300">Ketua Ranting: {ketuaRanting}</span>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label htmlFor="search-laporan" className="text-xs text-zinc-500 sr-only">
              Cari peserta
            </label>
            <input
              id="search-laporan"
              type="search"
              placeholder="Cari nama, no. anggota, kyu/dan, ranting…"
              value={searchLaporan}
              onChange={(e) => setSearchLaporan(e.target.value)}
              className="w-full min-w-[200px] max-w-sm rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
            {searchLaporan.trim() && (
              <span className="text-xs text-zinc-500">
                {filteredList.length + filteredPendingRows.length} dari {(data?.list?.length ?? 0) + pendingRows.length} peserta
              </span>
            )}
            {selectableList.length > 0 && (
              <>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleBulkUpload(f);
                    e.target.value = "";
                  }}
                />
                {selectedForBulk.size > 0 ? (
                  <span className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={uploadingBulk}
                      onClick={() => bulkFileInputRef.current?.click()}
                      className="rounded-lg border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
                    >
                      {uploadingBulk ? "Mengunggah…" : `Upload bukti untuk ${selectedForBulk.size} yang dipilih`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedForBulk(new Set())}
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      Batal pilih
                    </button>
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">
                    Centang peserta lalu gunakan &quot;Upload bukti untuk X yang dipilih&quot; untuk bayar sekaligus.
                  </span>
                )}
              </>
            )}
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-left text-zinc-400">
                  {selectableList.length > 0 && (
                    <th className="px-4 py-3 w-10">Pilih</th>
                  )}
                  {isReportAll && <th className="px-4 py-3">Ranting</th>}
                  <th className="px-4 py-3">Peserta</th>
                  <th className="px-4 py-3">No. Anggota</th>
                  <th className="px-4 py-3">Kyu/Dan</th>
                  <th className="px-4 py-3">Status Bayar</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Bukti</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    {selectableList.length > 0 && (
                      <td className="px-4 py-3">
                        {canSelectForBulk(r) ? (
                          <input
                            type="checkbox"
                            checked={selectedForBulk.has(r.id)}
                            onChange={(e) => {
                              setSelectedForBulk((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(r.id);
                                else next.delete(r.id);
                                return next;
                              });
                            }}
                            className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/40"
                            aria-label={`Pilih ${r.nama} untuk upload bukti sekaligus`}
                          />
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    )}
                    {isReportAll && (
                      <td className="px-4 py-3 text-zinc-400">{r.ranting_nama ?? r.ranting_id ?? "—"}</td>
                    )}
                    <td className="px-4 py-3 text-zinc-200">{r.nama}</td>
                    <td className="px-4 py-3 text-zinc-400">{r.nomor}</td>
                    <td className="px-4 py-3 text-zinc-400">{r.kyu_dan_terakhir}</td>
                    <td className="px-4 py-3">
                      {r.status_bayar === "lunas" ? (
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400/90">
                          Lunas
                        </span>
                      ) : r.status_bayar === "bukti_uploaded" ? (
                        <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400/90">
                          Bukti diupload — menunggu verifikasi Cabang
                        </span>
                      ) : r.status_bayar === "ditolak" ? (
                        <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-xs text-red-400/90">
                          Ditolak oleh Cabang
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-xs">Menunggu bayar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {r.total_bayar != null
                        ? "Rp " + Number(r.total_bayar).toLocaleString("id-ID")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.status_bayar === "lunas" ? (
                        "—"
                      ) : (
                        <span className="flex items-center gap-2 flex-wrap">
                          {r.file_url && (
                            <a
                              href={r.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-400/90 text-xs underline hover:text-amber-300/90"
                            >
                              Lihat bukti
                            </a>
                          )}
                          {(r.status_bayar === "menunggu_bayar" || r.status_bayar === "ditolak") && (
                            <>
                              <input
                                ref={(el) => { fileInputRefs.current[r.id] = el; }}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleUploadBukti(r.id, f);
                                  e.target.value = "";
                                }}
                              />
                              <button
                                type="button"
                                disabled={uploadingId === r.id}
                                onClick={() => fileInputRefs.current[r.id]?.click()}
                                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 disabled:opacity-50"
                              >
                                {uploadingId === r.id ? "Mengunggah…" : r.status_bayar === "ditolak" ? "Upload bukti ulang" : "Upload bukti"}
                              </button>
                            </>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {r.status_bayar === "lunas" ? (
                          <>
                            <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400/90">
                              ✓ Lunas (sudah diverifikasi)
                            </span>
                            <button
                              type="button"
                              disabled={printingKwitansiId === r.id}
                              onClick={() => handleCetakKwitansi(r)}
                              className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-white/15 disabled:opacity-50 w-fit"
                            >
                              {printingKwitansiId === r.id ? "Membuat PDF…" : "Cetak kwitansi"}
                            </button>
                          </>
                        ) : r.status_bayar === "bukti_uploaded" || (r.file_url && r.status_bayar !== "ditolak") ? (
                          canConfirmLunas ? (
                            <span className="flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleKonfirmasiLunas(r.id, r.nama)}
                                className="rounded-md bg-emerald-600/80 px-2 py-1 text-xs text-white hover:bg-emerald-500/80 w-fit"
                              >
                                Verifikasi Lunas
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTolakBuktiOpen(r.id, r.nama)}
                                className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-400/90 hover:bg-red-500/10 w-fit"
                              >
                                Tolak
                              </button>
                            </span>
                          ) : (
                            <span className="text-xs text-amber-400/90">
                              Bukti diupload — menunggu verifikasi Cabang
                            </span>
                          )
                        ) : r.status_bayar === "ditolak" ? (
                          <span className="block text-xs">
                            <span className="text-red-400/90 font-medium">Ditolak oleh Cabang</span>
                            {r.alasan_tolak_bukti && (
                              <span className="mt-1 block text-zinc-500">Alasan: {r.alasan_tolak_bukti}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            Upload bukti terlebih dahulu
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleBatalkanOpen(r.id, r.nama)}
                          className="rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-400/90 hover:bg-red-500/10 w-fit"
                        >
                          Batalkan ikut
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPendingRows.map((p) => (
                  <tr key={`pending-${p.profile_id}`} className="border-b border-white/5 bg-amber-500/5 hover:bg-amber-500/10">
                    {selectableList.length > 0 && <td className="px-4 py-3">—</td>}
                    {isReportAll && <td className="px-4 py-3 text-zinc-500">—</td>}
                    <td className="px-4 py-3 text-zinc-200">{p.nama}</td>
                    <td className="px-4 py-3 text-zinc-400">{p.nomor}</td>
                    <td className="px-4 py-3 text-zinc-400">{p.kyu_dan_terakhir}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400/90">
                        Menunggu simpan
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">—</td>
                    <td className="px-4 py-3 text-zinc-500">—</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      Belum tersimpan. Klik tombol &quot;Daftarkan X peserta&quot; di bawah tabel kiri untuk menyimpan.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalRows === 0 && (
            <p className="mt-4 text-sm text-zinc-500">
              {searchLaporan.trim()
                ? "Tidak ada peserta yang cocok dengan pencarian."
                : "Belum ada peserta. Centang anggota di kolom kiri lalu klik Daftarkan."}
            </p>
          )}

          {(data?.list_batal?.length ?? 0) > 0 && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowPesertaBatal((v) => !v)}
                className="text-sm font-medium text-zinc-400 hover:text-zinc-200"
              >
                {showPesertaBatal ? "▼" : "▶"} Riwayat peserta batal ({data!.list_batal!.length})
              </button>
              {showPesertaBatal && (
                <div className="mt-3 overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-left text-zinc-400">
                        {isReportAll && <th className="px-4 py-3">Ranting</th>}
                        <th className="px-4 py-3">Peserta</th>
                        <th className="px-4 py-3">No. Anggota</th>
                        <th className="px-4 py-3">Batal pada</th>
                        <th className="px-4 py-3">Alasan</th>
                        <th className="px-4 py-3">Refund</th>
                        <th className="px-4 py-3">Dikembalikan</th>
                        <th className="px-4 py-3">Bukti transfer</th>
                        {canEditRefund && <th className="px-4 py-3">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data!.list_batal!.map((b) => (
                        <tr key={b.id} className="border-b border-white/5 text-zinc-400">
                          {isReportAll && (
                            <td className="px-4 py-3 text-zinc-400">{b.ranting_nama ?? b.ranting_id ?? "—"}</td>
                          )}
                          <td className="px-4 py-3 text-zinc-200">{b.nama}</td>
                          <td className="px-4 py-3">{b.nomor}</td>
                          <td className="px-4 py-3">
                            {b.batal_at
                              ? new Date(b.batal_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
                              : "—"}
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate" title={b.alasan_batal ?? ""}>{b.alasan_batal || "—"}</td>
                          <td className="px-4 py-3">
                            {b.refund_status === "dikembalikan"
                              ? `Rp ${(b.refund_jumlah ?? 0).toLocaleString("id-ID")}`
                              : b.refund_status === "pending"
                                ? `Pending ${b.refund_jumlah != null ? `Rp ${b.refund_jumlah.toLocaleString("id-ID")}` : ""}`
                                : "Tidak ada"}
                          </td>
                          <td className="px-4 py-3">
                            {b.refund_at
                              ? new Date(b.refund_at).toLocaleString("id-ID", { dateStyle: "short" })
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {b.refund_bukti_file_url
                              ? (
                                  <a href={b.refund_bukti_file_url} target="_blank" rel="noopener noreferrer" className="text-amber-400/90 hover:underline">
                                    Lihat bukti
                                  </a>
                                )
                              : "—"}
                          </td>
                          {canEditRefund && (
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleRefundOpen(b)}
                                className="rounded-md border border-amber-500/30 px-2 py-1 text-xs text-amber-400/90 hover:bg-amber-500/10"
                              >
                                Isi pengembalian dana
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="mt-6 text-sm text-zinc-500">Belum ada peserta untuk filter ini. Centang anggota di kolom kiri lalu klik Daftarkan (untuk satu ranting).</p>
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

      {tolakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !tolakSubmitting && setTolakModal(null)}>
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-zinc-100">Tolak bukti transfer</h3>
            <p className="mt-1 text-sm text-zinc-500">Peserta: {tolakModal.nama}</p>
            <p className="mt-2 text-xs text-zinc-500">Berikan alasan penolakan (wajib), misalnya: bukti TF kurang jelas, nominal tidak sesuai, dll.</p>
            <textarea
              value={tolakAlasan}
              onChange={(e) => setTolakAlasan(e.target.value)}
              rows={3}
              placeholder="Contoh: Bukti transfer kurang jelas, nominal tidak sesuai"
              className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTolakModal(null)}
                disabled={tolakSubmitting}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTolakBuktiSubmit}
                disabled={tolakSubmitting || !tolakAlasan.trim()}
                className="rounded-lg bg-red-600/90 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50"
              >
                {tolakSubmitting ? "Menyimpan…" : "Tolak bukti"}
              </button>
            </div>
          </div>
        </div>
      )}

      {refundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !refundSubmitting && setRefundModal(null)}>
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-zinc-100">Pengembalian dana (cabang)</h3>
            <p className="mt-1 text-sm text-zinc-500">Peserta: {refundModal.nama}</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400">Status pengembalian dana</label>
                <Select
                  value={refundForm.refund_status}
                  onValueChange={(v) => setRefundForm((f) => ({ ...f, refund_status: v as "tidak_ada" | "pending" | "dikembalikan" }))}
                >
                  <SelectTrigger className="mt-1 w-full border-white/10 bg-white/5 text-zinc-200 focus:border-zinc-500 focus:ring-zinc-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-zinc-900">
                    <SelectItem value="tidak_ada" className="text-zinc-200 focus:bg-white/10 focus:text-zinc-100 data-[highlighted]:bg-white/10 data-[highlighted]:text-zinc-100">Tidak ada pengembalian</SelectItem>
                    <SelectItem value="pending" className="text-zinc-200 focus:bg-white/10 focus:text-zinc-100 data-[highlighted]:bg-white/10 data-[highlighted]:text-zinc-100">Pending (akan dikembalikan)</SelectItem>
                    <SelectItem value="dikembalikan" className="text-zinc-200 focus:bg-white/10 focus:text-zinc-100 data-[highlighted]:bg-white/10 data-[highlighted]:text-zinc-100">Sudah dikembalikan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(refundForm.refund_status === "pending" || refundForm.refund_status === "dikembalikan") && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Nominal (Rp)</label>
                    <input
                      type="text"
                      value={refundForm.refund_jumlah}
                      onChange={(e) => setRefundForm((f) => ({ ...f, refund_jumlah: e.target.value }))}
                      placeholder="0"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Catatan (opsional)</label>
                    <input
                      type="text"
                      value={refundForm.refund_catatan}
                      onChange={(e) => setRefundForm((f) => ({ ...f, refund_catatan: e.target.value }))}
                      placeholder="Rekening, tanggal transfer"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Bukti transfer pengembalian dana</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        ref={refundFileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f && refundModal) handleRefundUpload(refundModal.id, f);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => refundFileInputRef.current?.click()}
                        disabled={refundUploading}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 disabled:opacity-50"
                      >
                        {refundUploading ? "Mengunggah…" : "Pilih file (PDF/gambar)"}
                      </button>
                      {(refundModal?.refund_bukti_file_url || refundForm.refund_bukti_path) && (
                        <span className="text-xs text-emerald-400">
                          {refundForm.refund_bukti_path ? "Terunggah" : "Ada bukti"}
                          {refundModal?.refund_bukti_file_url && !refundForm.refund_bukti_path && (
                            <a href={refundModal.refund_bukti_file_url} target="_blank" rel="noopener noreferrer" className="ml-1 underline">Lihat</a>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button type="button" onClick={() => setRefundModal(null)} disabled={refundSubmitting} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 disabled:opacity-50">Batal</button>
              <button type="button" onClick={handleRefundSubmit} disabled={refundSubmitting} className="rounded-lg bg-amber-600/90 px-4 py-2 text-sm text-white hover:bg-amber-500 disabled:opacity-50">{refundSubmitting ? "Menyimpan…" : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
