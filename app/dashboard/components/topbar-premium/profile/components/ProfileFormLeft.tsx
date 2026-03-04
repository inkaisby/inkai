"use client";

import BlockInput from "./BlockInput";
import BlockSelect from "./BlockSelect";
import { ProfileData } from "../hooks/useProfileData";

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
}

export default function ProfileFormLeft({
  profile,
  update,
  step,
  errors,
  nikChecking = false,
  nikExists,
  canEditNomor = false,
}: Props) {
  if (step !== 1) return null;

  // ⛔ guard data async
  if (!profile) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-cyan-900/30 rounded" />
        <div className="h-10 bg-cyan-900/30 rounded" />
        <div className="h-10 bg-cyan-900/30 rounded" />
      </div>
    );
  }

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

      {/* ================= NAMA ================= */}
      <BlockInput
        label="Nama Lengkap"
        value={profile.nama}
        onChange={(v) => update("nama", v)}
        error={errors.nama}
        dataField="nama"
      />

      {/* ================= NO. ANGGOTA (hanya admin yang boleh mengisi) ================= */}
      <BlockInput
        label="No. Anggota"
        value={profile.nomor}
        onChange={(v) => update("nomor", v)}
        error={errors.nomor}
        dataField="nomor"
        placeholder="Nomor keanggotaan (hanya admin yang dapat mengisi)"
        disabled={!canEditNomor}
      />

      {/* ================= STATUS KEANGGOTAAN ================= */}
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
      />

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

      {/* ================= ORANG TUA ================= */}
      <BlockInput
        label="Nama Ayah"
        value={profile.namaAyah}
        onChange={(v) => update("namaAyah", v)}
        error={errors.namaAyah}
        dataField="namaAyah"
      />

      <BlockInput
        label="Nama Ibu"
        value={profile.namaIbu}
        onChange={(v) => update("namaIbu", v)}
        error={errors.namaIbu}
        dataField="namaIbu"
      />

      <BlockInput
        label="Pekerjaan Orang Tua"
        value={profile.pekerjaanOrtu}
        onChange={(v) => update("pekerjaanOrtu", v)}
        error={errors.pekerjaanOrtu}
        dataField="pekerjaanOrtu"
      />
    </div>
  );
}
