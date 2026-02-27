"use client";

import { useEffect, useState } from "react";
import { UserRow } from "./EmailList";

/* ===============================
 * TYPES
 * =============================== */
type ProfileForm = {
  nama: string;
  nik: string;
  email: string;
  telepon: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  nama_ayah: string;
  nama_ibu: string;
  pekerjaan_ortu: string;
  province_id: number | null;
  regency_id: number | null;
  district_id: number | null;
  village_id: string | null;
  ranting_id: string | null;
  app_role: string | null;
  structural_level: number | null;
  structural_role: string | null;
  email_allowed: boolean;
  status: string;
};

interface ProfilePanelProps {
  user: UserRow | null;
}

export default function ProfilePanel({ user }: ProfilePanelProps) {
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [dirty, setDirty] = useState(false);

  /* ===============================
   * INIT FORM FROM SQL (1:1)
   * =============================== */
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync form from selected user */
    if (!user) {
      setForm(null);
      setDirty(false);
      return;
    }

    setForm({
      nama: user.nama ?? "",
      nik: user.nik ?? "",
      email: user.email ?? "",
      telepon: user.telepon ?? "",
      jenis_kelamin: user.jenis_kelamin ?? "",
      tanggal_lahir: user.tanggal_lahir
        ? user.tanggal_lahir.slice(0, 10) // aman untuk input date
        : "",
      nama_ayah: user.nama_ayah ?? "",
      nama_ibu: user.nama_ibu ?? "",
      pekerjaan_ortu: user.pekerjaan_ortu ?? "",
      province_id: user.province_id,
      regency_id: user.regency_id,
      district_id: user.district_id,
      village_id: user.village_id,
      ranting_id: user.ranting_id,
      app_role: user.app_role,
      structural_level: user.structural_level ?? null,
      structural_role: user.structural_role ?? null,
      email_allowed: user.email_allowed ?? true,
      status: user.status ?? "pending",
    });

    setDirty(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [user]);

  if (!user || !form) {
    return <div className="text-sm text-white/40">Pilih pengguna</div>;
  }

  const update = <K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K],
  ) => {
    setForm((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
    setDirty(true);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-lg font-semibold">EDIT PROFIL PENGGUNA</h2>
        <div className="text-sm text-white/50 font-mono">{user.email}</div>
      </div>

      {/* IDENTITAS UTAMA */}
      <section className="border border-white/10 rounded-lg p-4 space-y-3">
        <h3 className="font-medium">Identitas Utama</h3>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Input
            label="Nama Lengkap"
            value={form.nama}
            onChange={(v) => update("nama", v)}
          />
          <Input
            label="NIK"
            value={form.nik}
            onChange={(v) => update("nik", v)}
          />
          <Input label="Email" value={form.email} readOnly />
          <Input
            label="Telepon"
            value={form.telepon}
            onChange={(v) => update("telepon", v)}
          />

          <Select
            label="Jenis Kelamin"
            value={form.jenis_kelamin}
            options={["L", "P"]}
            onChange={(v) => update("jenis_kelamin", v)}
          />

          <Input
            label="Tanggal Lahir"
            type="date"
            value={form.tanggal_lahir}
            onChange={(v) => update("tanggal_lahir", v)}
          />
        </div>
      </section>

      {/* DATA KELUARGA */}
      <section className="border border-white/10 rounded-lg p-4 space-y-3">
        <h3 className="font-medium">Data Keluarga</h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Input
            label="Nama Ayah"
            value={form.nama_ayah}
            onChange={(v) => update("nama_ayah", v)}
          />
          <Input
            label="Nama Ibu"
            value={form.nama_ibu}
            onChange={(v) => update("nama_ibu", v)}
          />
          <Input
            label="Pekerjaan Ortu"
            value={form.pekerjaan_ortu}
            onChange={(v) => update("pekerjaan_ortu", v)}
          />
        </div>
      </section>

      {/* WILAYAH & ORGANISASI */}
      <section className="border border-white/10 rounded-lg p-4 space-y-3">
        <h3 className="font-medium">Wilayah & Organisasi</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Input label="Provinsi ID" value={form.province_id ?? ""} readOnly />
          <Input label="Kab/Kota ID" value={form.regency_id ?? ""} readOnly />

          <Select
            label="Role"
            value={form.app_role}
            options={["SUPERADMIN", "ADMIN", "USER"]}
            onChange={(v) => update("app_role", v)}
          />

          <Select
            label="Status Akun"
            value={form.status}
            options={["active", "pending", "suspended"]}
            onChange={(v) => update("status", v)}
          />
          <Select
            label="Structural Level"
            value={form.structural_level?.toString() ?? ""}
            options={["1", "2", "3", "4", "5"]}
            onChange={(v) => update("structural_level", Number(v))}
          />

          <Input
            label="Structural Role"
            value={form.structural_role ?? ""}
            onChange={(v) => update("structural_role", v)}
          />

          <Select
            label="Email Allowed"
            value={form.email_allowed ? "true" : "false"}
            options={["true", "false"]}
            onChange={(v) => update("email_allowed", v === "true")}
          />
        </div>
      </section>

      {/* METADATA */}
      <section className="border border-white/10 rounded-lg p-4 text-sm text-white/50">
        <div>Dibuat: {new Date(user.created_at).toLocaleString()}</div>
        <div>Update Terakhir: {new Date(user.updated_at).toLocaleString()}</div>
      </section>

      {/* ACTIONS */}
      <div className="flex gap-3">
        <button
          disabled={!dirty}
          className="px-4 py-2 bg-blue-600 rounded disabled:opacity-40"
        >
          Simpan Perubahan
        </button>
        <button
          onClick={() => {
            setDirty(false);
            setForm(null);
          }}
          className="px-4 py-2 bg-white/10 rounded"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

/* ===============================
 * MINI UI
 * =============================== */
function Input({
  label,
  value,
  onChange,
  readOnly = false,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-white/50">{label}</span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className="px-2 py-1 rounded bg-white/5 border border-white/10"
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange?: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-white/50">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="px-2 py-1 rounded bg-white/5 border border-white/10"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
