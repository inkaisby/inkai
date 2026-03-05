"use client";

import { useEffect, useState } from "react";
import {
  getProvinces,
  getRegencies,
  getDistricts,
} from "../../services/wilayahService";
import { FileText, MessageCircle } from "lucide-react";
import jsPDF from "jspdf";
import useProfileModal from "../../../topbar-premium/profile/useProfileModal";

/* ===============================
   TYPES
================================ */
type Wilayah = {
  id: string;
  name: string;
};

/** Bentuk baris dari API/DB pengajuan_pindah_ranting */
export type RiwayatItem = {
  id: string;
  asal: string;
  tujuan: string;
  alasan?: string;
  tanggal: string;
  status: "DIAJUKAN" | "DISETUJUI" | "DITOLAK";
};

type FormState = {
  provId: string;
  kabId: string;
  kecId: string;
  alasan: string;
};

const EMPTY_FORM: FormState = {
  provId: "",
  kabId: "",
  kecId: "",
  alasan: "",
};

const API_PINDAH_RANTING = "/api/keanggotaan/pindah-ranting";

/* ===============================
   PROPS (identitas dari parent / session)
================================ */
type TabPindahRantingProps = {
  /** Data anggota dari useMyKeanggotaan; bila ada dipakai untuk identitas. */
  anggota?: {
    nama: string;
    nomor?: string;
    ranting: { id: string; nama: string };
  } | null;
};

export default function TabPindahRanting({ anggota }: TabPindahRantingProps) {
  /* ===============================
     IDENTITAS ANGGOTA (dari DB / session atau fallback mock)
  =============================== */
  const user = {
    noAnggota: anggota?.nomor ?? ":-",
    nama: anggota?.nama ?? "HABIBUR RAHMAN",
    cabangAsal: anggota?.ranting?.nama ?? "Cakra Koarmatim",
  };

  /* ===============================
     STATE (riwayat dari DB via API)
  =============================== */
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [riwayat, setRiwayat] = useState<RiwayatItem[]>([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [provinces, setProvinces] = useState<Wilayah[]>([]);
  const [regencies, setRegencies] = useState<Wilayah[]>([]);
  const [districts, setDistricts] = useState<Wilayah[]>([]);

  const [provLabel, setProvLabel] = useState("");
  const [kabLabel, setKabLabel] = useState("");
  const [kecLabel, setKecLabel] = useState("");

  const [editWilayah, setEditWilayah] = useState(true);

  /* ===============================
     LOAD PROVINCES
  =============================== */
  useEffect(() => {
    getProvinces().then(setProvinces);
  }, []);

  /* ===============================
     LOAD RIWAYAT PINDAH RANTING DARI API
  =============================== */
  async function loadRiwayat(showLoading = true) {
    if (showLoading) setLoadingRiwayat(true);
    try {
      const res = await fetch(API_PINDAH_RANTING);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.message || "Gagal memuat riwayat";
        setError(msg);
        setRiwayat([]);
        if (res.status === 404 && String(msg).toLowerCase().includes("profile tidak ditemukan")) {
          useProfileModal.getState().openForced();
        }
        return;
      }
      const data = await res.json();
      setRiwayat(Array.isArray(data.riwayat) ? data.riwayat : []);
      setError(null);
    } catch {
      setError("Gagal memuat riwayat");
      setRiwayat([]);
    } finally {
      setLoadingRiwayat(false);
    }
  }

  useEffect(() => {
    loadRiwayat();
  }, []);

  /* ===============================
     HANDLERS
  =============================== */
  async function handleProvChange(id: string) {
    const p = provinces.find((x) => x.id === id);
    setProvLabel(p?.name || "");
    setKabLabel("");
    setKecLabel("");
    setEditWilayah(true);

    setForm({ ...form, provId: id, kabId: "", kecId: "" });
    setRegencies(await getRegencies(id));
    setDistricts([]);
  }

  async function handleKabChange(id: string) {
    const r = regencies.find((x) => x.id === id);
    setKabLabel(r?.name || "");
    setKecLabel("");
    setEditWilayah(true);

    setForm((f) => ({ ...f, kabId: id, kecId: "" }));
    setDistricts(await getDistricts(id));
  }

  function handleKecChange(id: string) {
    const d = districts.find((x) => x.id === id);
    setKecLabel(d?.name || "");
    setForm((f) => ({ ...f, kecId: id }));

    // AUTO HIDE FORM (Drive-style)
    setEditWilayah(false);
  }

  async function handleSubmit() {
    if (!form.provId || !form.kabId || !form.kecId || !form.alasan) {
      setError("Semua field wajib diisi");
      return;
    }

    const tujuan = `${provLabel} / ${kabLabel} / ${kecLabel}`;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(API_PINDAH_RANTING, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asal: user.cabangAsal,
          tujuan,
          alasan: form.alasan,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Gagal mengajukan pindah ranting");
        return;
      }

      setForm(EMPTY_FORM);
      setProvLabel("");
      setKabLabel("");
      setKecLabel("");
      setEditWilayah(true);
      await loadRiwayat(false);
    } catch {
      setError("Gagal mengajukan pindah ranting");
    } finally {
      setSubmitting(false);
    }
  }

  /* ===============================
     PDF & WHATSAPP
  =============================== */
  function generatePDF(item: RiwayatItem) {
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text("SURAT PERPINDAHAN RANTING INKAI", 20, 20);

    doc.setFontSize(11);
    doc.text(`No Anggota : ${user.noAnggota}`, 20, 35);
    doc.text(`Nama       : ${user.nama}`, 20, 42);
    doc.text(`Asal       : ${item.asal}`, 20, 49);
    doc.text(`Tujuan     : ${item.tujuan}`, 20, 56);
    doc.text(`Tanggal    : ${item.tanggal}`, 20, 63);
    doc.text(`Status     : ${item.status}`, 20, 70);

    doc.text(
      "Dokumen ini dihasilkan secara digital dan sah tanpa tanda tangan.",
      20,
      90,
    );

    doc.save(`Pindah-Ranting-${user.noAnggota}.pdf`);
  }

  function sendWhatsApp(item: RiwayatItem) {
    const approvalLink = `https://inkai.or.id/approval/${item.id}`;

    const message = `
Permohonan Perpindahan Ranting INKAI

Nama    : ${user.nama}
Asal    : ${item.asal}
Tujuan  : ${item.tujuan}
Tanggal : ${item.tanggal}

Link Approval:
${approvalLink}
    `.trim();

    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  }

  /* ===============================
     RENDER
  =============================== */
  return (
    <div className="space-y-4 mt-4">
      {/* IDENTITAS */}
      <div
        className="rounded-xl p-4 border border-cyan-400/30
                      bg-gradient-to-br from-indigo-600/30 to-cyan-500/20"
      >
        <p className="text-xs font-bold text-cyan-200 mb-2">
          IDENTITAS ANGGOTA
        </p>
        <div className="text-xs text-white space-y-1">
          <div>No Anggota : {user.noAnggota}</div>
          <div>Nama : {user.nama}</div>
          <div>Asal : {user.cabangAsal}</div>
        </div>
      </div>

      {/* TUJUAN */}
      <div
        className="rounded-xl p-4 border border-fuchsia-500/30
                      bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 space-y-3"
      >
        <p className="text-xs font-bold text-fuchsia-300">TUJUAN PERPINDAHAN</p>

        {/* SUMMARY LINK */}
        {!editWilayah && provLabel && kabLabel && kecLabel && (
          <button
            onClick={() => setEditWilayah(true)}
            className="w-full text-left text-xs px-3 py-2 rounded-lg
                       bg-gradient-to-r from-indigo-600/30 to-cyan-500/20
                       border border-cyan-400/30 text-cyan-100"
          >
            Tujuan dipilih:
            <span className="font-semibold">
              {" "}
              {provLabel} / {kabLabel} / {kecLabel}
            </span>
            <span className="ml-2 text-[10px] underline">ubah</span>
          </button>
        )}

        {/* FORM */}
        {editWilayah && (
          <>
            <select
              value={form.provId}
              onChange={(e) => handleProvChange(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-fuchsia-500/30
                         px-3 py-2 text-sm text-white"
            >
              <option value="">-- pilih provinsi --</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={form.kabId}
              disabled={!form.provId}
              onChange={(e) => handleKabChange(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-fuchsia-500/30
                         px-3 py-2 text-sm text-white disabled:opacity-40"
            >
              <option value="">-- pilih kota / kabupaten --</option>
              {regencies.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <select
              value={form.kecId}
              disabled={!form.kabId}
              onChange={(e) => handleKecChange(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-fuchsia-500/30
                         px-3 py-2 text-sm text-white disabled:opacity-40"
            >
              <option value="">-- pilih kecamatan / ranting --</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </>
        )}

        {/* ALASAN */}
        <textarea
          rows={3}
          value={form.alasan}
          onChange={(e) => setForm((f) => ({ ...f, alasan: e.target.value }))}
          placeholder="Alasan perpindahan"
          className="w-full rounded-lg bg-slate-900 border border-fuchsia-500/30
                     px-3 py-2 text-sm text-white"
        />

        {error && (
          <p
            className="text-xs text-red-300 bg-red-500/10
                        border border-red-500/30 rounded px-2 py-1"
          >
            ⚠ {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-2 rounded-lg text-xs font-semibold
                     bg-gradient-to-r from-cyan-400 to-emerald-400
                     text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Mengirim…" : "Ajukan"}
        </button>
      </div>

      {/* RIWAYAT PENGAJUAN PINDAH RANTING (dari DB) */}
      <div className="rounded-xl p-4 border border-cyan-500/30 bg-slate-900">
        <p className="text-xs font-bold text-cyan-300 mb-2">
          RIWAYAT PENGAJUAN PINDAH RANTING
        </p>

        {loadingRiwayat ? (
          <p className="text-xs text-slate-500 py-2">Memuat riwayat…</p>
        ) : riwayat.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">
            Belum ada riwayat pengajuan. Isi form di atas lalu klik Ajukan.
          </p>
        ) : (
          <div className="space-y-2 text-xs">
            {riwayat.map((r) => (
              <div
                key={r.id}
                className="flex justify-between items-start gap-2
                              border border-slate-700/60 rounded px-2 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white">
                    {r.asal}
                    <span className="text-cyan-400"> → </span>
                    {r.tujuan}
                  </div>
                  {r.alasan && (
                    <div
                      className="text-slate-500 mt-0.5 truncate max-w-md"
                      title={r.alasan}
                    >
                      {r.alasan}
                    </div>
                  )}
                  <div className="text-slate-400 mt-0.5">{r.tanggal}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generatePDF(r)}
                    className="p-1.5 rounded-md bg-red-500/15 text-red-400"
                    title="Cetak PDF"
                  >
                    <FileText size={16} />
                  </button>

                  <button
                    onClick={() => sendWhatsApp(r)}
                    className="p-1.5 rounded-md bg-emerald-500/15 text-emerald-400"
                    title="Kirim WhatsApp"
                  >
                    <MessageCircle size={16} />
                  </button>

                  <span
                    className="px-2 py-0.5 rounded-full text-[10px]
                                   bg-amber-400/20 text-amber-300"
                  >
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
