"use client";

import { useEffect, useState } from "react";
import {
  X,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import BlockInput from "./BlockInput";
import BlockSelect from "./BlockSelect";
import { ProfileData } from "../hooks/useProfileData";
import { normalizeIndonesiaPhoneToE164Digits } from "@/app/lib/phone/indonesiaE164";

interface Props {
  profile?: ProfileData | null;
  update: <K extends keyof ProfileData>(
    field: K,
    value: ProfileData[K],
  ) => void;
  step: number;
  errors: Record<string, boolean>;

  // 🔑 dari parent (ProfileModal)
  nikChecking?: boolean;
  nikExists: boolean;
  /** Hanya admin yang boleh mengisi No. Anggota */
  canEditNomor?: boolean;
  onProfileReload?: () => void | Promise<void>;
}

export default function ProfileFormLeft({
  profile,
  update,
  step,
  errors,
  nikChecking = false,
  nikExists,
  canEditNomor = false,
  onProfileReload,
}: Props) {
  const [waOtp, setWaOtp] = useState("");
  const [waSending, setWaSending] = useState(false);
  const [waConfirming, setWaConfirming] = useState(false);
  const [waCooldown, setWaCooldown] = useState(0);
  const [waNotice, setWaNotice] = useState<
    | {
        kind: "twilio_setup" | "success_send" | "success_verify" | "error";
        detail?: string;
      }
    | null
  >(null);

  useEffect(() => {
    if (waCooldown <= 0) return;
    const t = setInterval(() => {
      setWaCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [waCooldown]);

  useEffect(() => {
    if (
      !waNotice ||
      (waNotice.kind !== "success_send" && waNotice.kind !== "success_verify")
    ) {
      return;
    }
    const ms = waNotice.kind === "success_verify" ? 6000 : 8000;
    const t = setTimeout(() => setWaNotice(null), ms);
    return () => clearTimeout(t);
  }, [waNotice]);

  if (step !== 1) return null;

  if (!profile) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-cyan-900/30 rounded" />
        <div className="h-10 bg-cyan-900/30 rounded" />
        <div className="h-10 bg-cyan-900/30 rounded" />
      </div>
    );
  }

  const e164Current = normalizeIndonesiaPhoneToE164Digits(profile.telepon);
  const waVerified =
    Boolean(profile.teleponVerifiedE164) &&
    e164Current != null &&
    e164Current === profile.teleponVerifiedE164;

  return (
    <div className="space-y-4">
      {/* ================= NIK ================= */}
      <BlockInput
        label="NIK"
        value={profile.nik}
        placeholder="16 digit NIK"
        dataField="nik"
        disabled={profile.nikLocked}
        error={errors.nik || nikExists}
        helperText={
          nikChecking
            ? "Memeriksa NIK..."
            : nikExists
              ? "❌ NIK sudah terdaftar"
              : `${profile.nik.length}/16 digit`
        }
        onChange={(v) => {
          const numeric = v.replace(/\D/g, "");
          if (numeric.length <= 16) {
            update("nik", numeric);
          }
        }}
      />

      {/* ================= NAMA LENGKAP ================= */}
      <BlockInput
        label="Nama Lengkap"
        value={profile.nama}
        onChange={(v) => update("nama", v.toUpperCase())}
        error={errors.nama}
        dataField="nama"
        placeholder="Nama lengkap sesuai identitas"
      />

      {/* ================= NO. ANGGOTA (hanya admin yang boleh mengisi) ================= */}
      {canEditNomor && (
        <BlockInput
          label="No. Anggota"
          value={profile.nomor}
          onChange={(v) => update("nomor", v)}
          error={errors.nomor}
          dataField="nomor"
          placeholder="Nomor keanggotaan (hanya admin yang dapat mengisi)"
        />
      )}

      {/* ================= STATUS KEANGGOTAAN (hanya admin yang boleh mengubah) ================= */}
      {canEditNomor && (
        <BlockSelect
          label="Status Keanggotaan"
          value={profile.status}
          onChange={(v) => update("status", v)}
          options={[
            { label: "— Pilih status —", value: "" },
            { label: "Aktif", value: "AKTIF" },
            { label: "Nonaktif", value: "NONAKTIF" },
          ]}
          error={errors.status}
          dataField="status"
          disabled={!canEditNomor}
        />
      )}

      {/* ================= EMAIL ================= */}
      <BlockInput
        label="Email"
        type="email"
        value={profile.email}
        onChange={() => {}}
        error={errors.email}
        dataField="email"
        disabled
      />

      {/* ================= TELEPON ================= */}
      <BlockInput
        label="Nomor Telepon"
        type="tel"
        value={profile.telepon}
        placeholder="Maksimal 15 digit"
        dataField="telepon"
        error={errors.telepon}
        helperText={`${profile.telepon.length}/15 digit`}
        onChange={(v) => {
          const numeric = v.replace(/\D/g, "");
          if (numeric.length <= 15) {
            update("telepon", numeric);
          }
        }}
      />

      <div className="rounded-lg border border-cyan-500/25 bg-cyan-950/20 px-3 py-3 space-y-3">
        {waNotice && (
          <div
            className={
              "relative overflow-hidden rounded-xl border px-3.5 py-3 pr-10 shadow-lg backdrop-blur-sm " +
              (waNotice.kind === "twilio_setup"
                ? "border-cyan-400/25 bg-gradient-to-br from-[#0c1620]/95 via-cyan-950/30 to-[#0a1218]"
                : waNotice.kind === "error"
                  ? "border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-[#0c1418]/90"
                  : "border-emerald-500/25 bg-gradient-to-br from-emerald-950/35 to-[#0c1418]/90")
            }
            role="status"
          >
            <div
              className={
                "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl " +
                (waNotice.kind === "twilio_setup"
                  ? "bg-cyan-500/15"
                  : waNotice.kind === "error"
                    ? "bg-amber-500/10"
                    : "bg-emerald-500/12")
              }
            />
            <button
              type="button"
              aria-label="Tutup pemberitahuan"
              onClick={() => setWaNotice(null)}
              className="absolute right-2 top-2 rounded-md p-1 text-cyan-400/60 transition hover:bg-white/5 hover:text-cyan-200"
            >
              <X size={16} />
            </button>
            <div className="relative flex gap-3">
              <div
                className={
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border " +
                  (waNotice.kind === "twilio_setup"
                    ? "border-cyan-400/35 bg-cyan-500/10 text-cyan-300"
                    : waNotice.kind === "error"
                      ? "border-amber-400/35 bg-amber-500/10 text-amber-200"
                      : "border-emerald-400/35 bg-emerald-500/10 text-emerald-300")
                }
              >
                {waNotice.kind === "twilio_setup" ? (
                  <Sparkles size={20} strokeWidth={1.75} />
                ) : waNotice.kind === "error" ? (
                  <AlertCircle size={20} strokeWidth={1.75} />
                ) : (
                  <CheckCircle2 size={20} strokeWidth={1.75} />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {waNotice.kind === "twilio_setup" && (
                  <>
                    <p className="text-sm font-semibold tracking-tight text-cyan-100">
                      Verifikasi WhatsApp belum tersedia
                    </p>
                    <p className="text-[11px] leading-relaxed text-cyan-200/80">
                      Saat ini kode verifikasi tidak bisa dikirim lewat WhatsApp.
                      Nomor telepon Anda tetap bisa disimpan seperti biasa. Jika
                      Anda butuh verifikasi, hubungi pengurus atau tunggu hingga
                      layanan ini diaktifkan di sistem.
                    </p>
                    <details className="mt-2 rounded-lg border border-cyan-500/15 bg-black/20 px-2 py-1.5 text-[10px] text-cyan-300/70">
                      <summary className="cursor-pointer select-none text-cyan-400/90 hover:text-cyan-300">
                        Untuk administrator / pengembang
                      </summary>
                      <p className="mt-2 leading-relaxed text-cyan-200/60">
                        Set env:{" "}
                        <code className="rounded bg-black/40 px-1 py-0.5 text-cyan-300/80">
                          TWILIO_ACCOUNT_SID
                        </code>
                        ,{" "}
                        <code className="rounded bg-black/40 px-1 py-0.5 text-cyan-300/80">
                          TWILIO_AUTH_TOKEN
                        </code>
                        ,{" "}
                        <code className="rounded bg-black/40 px-1 py-0.5 text-cyan-300/80">
                          TWILIO_WHATSAPP_FROM
                        </code>
                        ,{" "}
                        <code className="rounded bg-black/40 px-1 py-0.5 text-cyan-300/80">
                          PHONE_OTP_PEPPER
                        </code>
                        . Dokumentasi di repositori:{" "}
                        <code className="text-cyan-400/70">
                          docs/WHATSAPP-OTP.md
                        </code>
                      </p>
                    </details>
                  </>
                )}
                {waNotice.kind === "success_send" && (
                  <>
                    <p className="text-sm font-semibold text-emerald-100">
                      Kode terkirim
                    </p>
                    <p className="text-[11px] leading-relaxed text-emerald-200/80">
                      Periksa WhatsApp di nomor yang Anda masukkan. Kode berlaku
                      ±10 menit.
                    </p>
                  </>
                )}
                {waNotice.kind === "success_verify" && (
                  <>
                    <p className="text-sm font-semibold text-emerald-100">
                      Nomor berhasil diverifikasi
                    </p>
                    <p className="text-[11px] text-emerald-200/80">
                      Terima kasih — nomor Anda sudah terhubung dengan akun ini.
                    </p>
                  </>
                )}
                {waNotice.kind === "error" && waNotice.detail && (
                  <>
                    <p className="text-sm font-semibold text-amber-100">
                      Tidak dapat memproses
                    </p>
                    <p className="text-[11px] leading-relaxed text-amber-200/80">
                      {waNotice.detail}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs text-cyan-300/90 flex items-center gap-1.5">
            <MessageCircle size={14} className="text-cyan-400/70" />
            Verifikasi WhatsApp
          </span>
          {waVerified ? (
            <span className="text-[11px] font-medium text-emerald-400">
              Terverifikasi
            </span>
          ) : (
            <span className="text-[11px] text-amber-300/90">Belum terverifikasi</span>
          )}
        </div>
        {!waVerified && (
          <>
            <p className="text-[11px] text-cyan-200/70 leading-relaxed">
              Pastikan nomor ini aktif di WhatsApp. Kirim kode, lalu masukkan 6
              digit dari pesan yang diterima.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={
                  waSending ||
                  waCooldown > 0 ||
                  !e164Current ||
                  profile.telepon.length < 10
                }
                onClick={async () => {
                  setWaSending(true);
                  try {
                    const res = await fetch("/api/profile/verify-phone/send", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ telepon: profile.telepon }),
                    });
                    const j = (await res.json()) as { message?: string };
                    const msg = j.message ?? "";
                    if (!res.ok) {
                      if (
                        res.status === 503 &&
                        (msg.includes("TWILIO") ||
                          msg.includes("belum dikonfigurasi") ||
                          msg.includes("WhatsApp OTP") ||
                          msg.includes("PHONE_OTP_PEPPER"))
                      ) {
                        setWaNotice({ kind: "twilio_setup" });
                      } else {
                        setWaNotice({
                          kind: "error",
                          detail: msg || "Gagal mengirim kode. Coba lagi.",
                        });
                      }
                      return;
                    }
                    setWaNotice({ kind: "success_send" });
                    setWaCooldown(60);
                  } catch {
                    setWaNotice({
                      kind: "error",
                      detail: "Koneksi gagal. Periksa jaringan lalu coba lagi.",
                    });
                  } finally {
                    setWaSending(false);
                  }
                }}
                className="rounded-md border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-medium text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {waSending
                  ? "Mengirim…"
                  : waCooldown > 0
                    ? `Tunggu ${waCooldown}s`
                    : "Kirim kode ke WhatsApp"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Kode 6 digit"
                value={waOtp}
                onChange={(e) =>
                  setWaOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="w-28 rounded-md border border-cyan-500/30 bg-[#0A0F14] px-2 py-1.5 text-xs text-cyan-100 placeholder:text-cyan-600"
              />
              <button
                type="button"
                disabled={waConfirming || waOtp.length !== 6}
                onClick={async () => {
                  setWaConfirming(true);
                  try {
                    const res = await fetch("/api/profile/verify-phone/confirm", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        telepon: profile.telepon,
                        code: waOtp,
                      }),
                    });
                    const j = (await res.json()) as { message?: string };
                    if (!res.ok) {
                      setWaNotice({
                        kind: "error",
                        detail: j.message ?? "Kode tidak valid atau sudah kadaluarsa.",
                      });
                      return;
                    }
                    setWaNotice({ kind: "success_verify" });
                    setWaOtp("");
                    await onProfileReload?.();
                  } catch {
                    setWaNotice({
                      kind: "error",
                      detail: "Verifikasi gagal. Periksa jaringan lalu coba lagi.",
                    });
                  } finally {
                    setWaConfirming(false);
                  }
                }}
                className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-40"
              >
                {waConfirming ? "Memverifikasi…" : "Verifikasi"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ================= JENIS KELAMIN ================= */}
      <BlockSelect
        label="Jenis Kelamin"
        value={profile.jenisKelamin}
        onChange={(v) => update("jenisKelamin", v)}
        options={[
          { label: "Laki-laki", value: "L" },
          { label: "Perempuan", value: "P" },
        ]}
        error={errors.jenisKelamin}
        dataField="jenisKelamin"
      />

      {/* ================= TANGGAL LAHIR ================= */}
      <BlockInput
        label="Tanggal Lahir"
        type="date"
        value={profile.tanggalLahir}
        onChange={(v) => update("tanggalLahir", v)}
        error={errors.tanggalLahir}
        dataField="tanggalLahir"
      />
    </div>
  );
}
