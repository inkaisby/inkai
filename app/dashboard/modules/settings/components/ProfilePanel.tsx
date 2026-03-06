"use client";

import { useEffect, useState } from "react";
import { UserRow } from "./EmailList";
import {
  getProvinces,
  getRegencies,
  getDistricts,
  getVillages,
} from "@/app/dashboard/components/topbar-premium/profile/services/wilayahService";
import useRantingOptions from "@/app/dashboard/components/topbar-premium/profile/hooks/useRantingOptions";

type WilayahOption = { label: string; value: string };

function toOptions(
  arr: { id?: unknown; code?: unknown; nama?: string; name?: string }[] | unknown
): WilayahOption[] {
  return Array.isArray(arr)
    ? arr.map((v) => {
        const id = (v as { id?: unknown }).id ?? (v as { code?: unknown }).code;
        const label =
          (v as { nama?: string }).nama ??
          (v as { name?: string }).name ??
          (id != null ? String(id) : "—");
        return { value: String(id ?? ""), label };
      })
    : [];
}

const normalizeId = (x: string | number | null | undefined): string =>
  x == null ? "" : String(x).replace(/\./g, "").trim();

function toNum(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = parseInt(normalizeId(v), 10);
  return Number.isNaN(n) ? null : n;
}

/** Cek apakah nilai ada di opsi (exact atau match 6 digit untuk kecamatan). */
function optionMatchesValue(
  options: WilayahOption[],
  normalizedValue: string
): boolean {
  if (options.some((o) => normalizeId(o.value) === normalizedValue)) return true;
  if (normalizedValue.length >= 6) {
    const prefix6 = normalizedValue.slice(0, 6);
    if (options.some((o) => normalizeId(o.value) === prefix6)) return true;
  }
  return false;
}

/** Nilai tampil di select saat opsi belum ter-load. */
function optionsWithFallback(
  options: WilayahOption[],
  currentValue: string | number | null | undefined,
  loadingLabel: string
): WilayahOption[] {
  const v = normalizeId(currentValue);
  if (!v) return options;
  if (optionMatchesValue(options, v)) return options;
  return [{ value: v, label: loadingLabel }, ...options];
}

/** Value untuk <select> agar cocok dengan opsi (format ID bisa pakai titik atau tidak). */
function selectValueWilayah(
  current: string | number | null | undefined,
  options: WilayahOption[]
): string {
  const v = normalizeId(current);
  if (!v) return "";
  const found = options.find((o) => normalizeId(o.value) === v);
  if (found) return found.value;
  if (v.length >= 6) {
    const prefix6 = v.slice(0, 6);
    const byPrefix = options.find((o) => normalizeId(o.value) === prefix6);
    if (byPrefix) return byPrefix.value;
  }
  return v;
}

/** Label level hirarki INKAI (sama dengan Role Management) */
const LEVEL_LABELS: Record<number, string> = {
  1: "Kohai",
  2: "Ranting",
  3: "Cabang",
  4: "Pengprov",
  5: "PP",
};

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
  alamat: string;
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
  /** Jika true (SUPERADMIN), dropdown Ranting menampilkan semua ranting, bukan hanya yang sesuai wilayah. */
  isSuperAdmin?: boolean;
}

export default function ProfilePanel({ user, isSuperAdmin = false }: ProfilePanelProps) {
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [provinceOptions, setProvinceOptions] = useState<WilayahOption[]>([]);
  const [regencyOptions, setRegencyOptions] = useState<WilayahOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<WilayahOption[]>([]);
  const [villageOptions, setVillageOptions] = useState<WilayahOption[]>([]);
  const [villageNameById, setVillageNameById] = useState<string | null>(null);
  const [provincesLoading, setProvincesLoading] = useState(true);
  const [regenciesLoading, setRegenciesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [villagesLoading, setVillagesLoading] = useState(false);

  const { options: rantingOptions, loading: rantingLoading } = useRantingOptions(
    form
      ? {
          provinceId: isSuperAdmin ? undefined : String(form.province_id ?? ""),
          regencyId: isSuperAdmin ? undefined : String(form.regency_id ?? ""),
          districtId: isSuperAdmin ? undefined : (normalizeId(form.district_id).slice(0, 6) || undefined),
          contextRantingId: form.ranting_id,
        }
      : undefined
  );

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
      alamat: user.alamat ?? "",
      province_id: toNum(user.province_id),
      regency_id: toNum(user.regency_id),
      district_id: toNum(user.district_id),
      village_id: user.village_id != null ? String(user.village_id).replace(/\./g, "") : null,
      ranting_id: user.ranting_id,
      app_role: user.app_role,
      structural_level: user.structural_level ?? null,
      structural_role: user.structural_role ?? null,
      email_allowed: user.email_allowed ?? true,
      status: user.status ?? "pending",
    });

    setDirty(false);
    setVillageNameById(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [user]);

  // Resolve nama kelurahan/kecamatan by ID agar tampil nama (sesuai DB), bukan angka
  useEffect(() => {
    const vid = form?.village_id != null ? normalizeId(form.village_id) : "";
    if (!vid) {
      setVillageNameById(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/wilayah/name?${new URLSearchParams({ id: vid })}`)
      .then((res) => res.json())
      .then((data: { name?: string | null }) => {
        if (!cancelled && data?.name) setVillageNameById(data.name);
        else if (!cancelled) setVillageNameById(null);
      })
      .catch(() => {
        if (!cancelled) setVillageNameById(null);
      });
    return () => {
      cancelled = true;
    };
  }, [form?.village_id]);

  useEffect(() => {
    setProvincesLoading(true);
    getProvinces()
      .then((res) => setProvinceOptions(toOptions(res)))
      .catch(() => setProvinceOptions([]))
      .finally(() => setProvincesLoading(false));
  }, []);

  useEffect(() => {
    if (form?.province_id == null) {
      setRegencyOptions([]);
      setRegenciesLoading(false);
      return;
    }
    setRegenciesLoading(true);
    getRegencies(String(form.province_id))
      .then((res) => setRegencyOptions(toOptions(res)))
      .catch(() => setRegencyOptions([]))
      .finally(() => setRegenciesLoading(false));
  }, [form?.province_id]);

  useEffect(() => {
    if (form?.regency_id == null) {
      setDistrictOptions([]);
      setDistrictsLoading(false);
      return;
    }
    setDistrictsLoading(true);
    const rid = String(form.regency_id).replace(/\./g, "").trim();
    const dottedRegency = rid.length === 4 ? `${rid.slice(0, 2)}.${rid.slice(2)}` : rid;
    const fetchOpts = { refresh: true as const };
    Promise.all([
      getDistricts(rid, undefined, fetchOpts),
      dottedRegency !== rid ? getDistricts(dottedRegency, undefined, fetchOpts) : Promise.resolve([]),
    ])
      .then(([res1, res2]) => {
        const list = (res1.length > 0 ? res1 : res2) as Array<{ id?: unknown; code?: unknown; name?: string; nama?: string }>;
        setDistrictOptions(toOptions(list));
      })
      .catch(() => setDistrictOptions([]))
      .finally(() => setDistrictsLoading(false));
  }, [form?.regency_id]);

  useEffect(() => {
    if (form?.district_id == null) {
      setVillageOptions([]);
      setVillagesLoading(false);
      return;
    }
    setVillagesLoading(true);
    // Pakai full district_id agar daftar kelurahan sesuai kecamatan (jangan slice(0,6) → kelurahan salah → tampil "-")
    const districtKey = normalizeId(form.district_id);
    if (!districtKey) {
      setVillageOptions([]);
      setVillagesLoading(false);
      return;
    }
    const tryLoad = (key: string) =>
      getVillages(key).then((res) => (res?.length ? res : null));
    tryLoad(districtKey)
      .then((res) => {
        if (res) return res;
        if (districtKey.length > 6) return tryLoad(districtKey.slice(0, 6));
        return [];
      })
      .then((res) => setVillageOptions(toOptions(res ?? [])))
      .catch(() => setVillageOptions([]))
      .finally(() => setVillagesLoading(false));
  }, [form?.district_id]);

  // Jangan reset village_id bila tidak ketemu di daftar — pertahankan nilai dari DB
  // dan tampilkan lewat optionsWithFallback (label "—" atau ID) agar Kelurahan tidak kosong.

  if (!user || !form) {
    return <div className="text-sm text-zinc-500">Pilih pengguna</div>;
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

  const handleSaveProfile = async () => {
    if (!user?.user_id || !form || !dirty) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: user.user_id,
          nama: form.nama,
          email: form.email,
          nik: form.nik,
          telepon: form.telepon,
          jenis_kelamin: form.jenis_kelamin,
          alamat: form.alamat || null,
          tanggal_lahir: form.tanggal_lahir || null,
          nama_ayah: form.nama_ayah,
          nama_ibu: form.nama_ibu,
          pekerjaan_ortu: form.pekerjaan_ortu,
          province_id: form.province_id,
          regency_id: form.regency_id,
          district_id: form.district_id,
          village_id: form.village_id,
          ranting_id: form.ranting_id,
          app_role: form.app_role,
          structural_level: form.structural_level,
          structural_role: form.structural_role || null,
          email_allowed: form.email_allowed,
          status: form.status,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        detail?: string;
        code?: string;
      };
      if (!res.ok) {
        const msg = data.detail
          ? `${data.message ?? "Gagal menyimpan profil"}\n\n${data.detail}`
          : (data.message ?? "Gagal menyimpan profil");
        alert(msg);
        return;
      }
      setDirty(false);
      const roleChanged =
        "structural_level" in payload ||
        "ranting_id" in payload ||
        "app_role" in payload ||
        "email_allowed" in payload ||
        "email" in payload;
      const msg = roleChanged
        ? "Profil berhasil disimpan.\n\nUser perlu refresh halaman (F5) atau logout lalu login ulang agar menu ter-update."
        : "Profil berhasil disimpan";
      alert(msg);
    } catch {
      alert("Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Edit Profil Pengguna</h2>
        <div className="text-sm text-zinc-500 font-mono">{user.email}</div>
      </div>

      {/* IDENTITAS UTAMA */}
      <section className="border border-zinc-700 rounded-lg p-4 space-y-3 bg-zinc-900/40">
        <h3 className="font-medium text-zinc-200">Identitas Utama</h3>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Input
            label="Nama Lengkap"
            value={form.nama}
            onChange={(v) => update("nama", v)}
            placeholder="Nama lengkap"
          />
          <Input
            label="NIK"
            value={form.nik}
            onChange={(v) => update("nik", v)}
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(v) => update("email", v)}
            placeholder="email@contoh.com"
          />
          <Input
            label="Telepon"
            value={form.telepon}
            onChange={(v) => update("telepon", v)}
          />

          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Jenis Kelamin</span>
            <div className="flex gap-2" role="group" aria-label="Jenis Kelamin">
              {(["L", "P"] as const).map((v) => {
                const selected = form.jenis_kelamin === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => update("jenis_kelamin", v)}
                    className={`px-3 py-1.5 rounded-md text-sm border ${
                      selected
                        ? "bg-zinc-600 border-zinc-500 text-zinc-100"
                        : "bg-zinc-800 border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {v === "L" ? "Laki-laki" : "Perempuan"}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Tanggal Lahir"
            type="date"
            value={form.tanggal_lahir}
            onChange={(v) => update("tanggal_lahir", v)}
          />
        </div>
      </section>

      {/* DATA KELUARGA */}
      <section className="border border-zinc-700 rounded-lg p-4 space-y-3 bg-zinc-900/40">
        <h3 className="font-medium text-zinc-200">Data Keluarga</h3>
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

      {/* ALAMAT & WILAYAH (step 2 + 3 ProfileModal) */}
      <section className="border border-zinc-700 rounded-lg p-4 space-y-3 bg-zinc-900/40">
        <h3 className="font-medium text-zinc-200">Alamat & Wilayah</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Input
            label="Alamat Lengkap"
            value={form.alamat}
            onChange={(v) => update("alamat", v)}
            placeholder="Jalan, RT/RW, kelurahan, kecamatan..."
          />

          <Select
            label="Provinsi"
            value={selectValueWilayah(form.province_id, provinceOptions)}
            options={optionsWithFallback(
              provinceOptions,
              form.province_id,
              provincesLoading ? "Memuat provinsi..." : "—"
            )}
            onChange={(v) => {
              const num = v === "" ? null : parseInt(String(v).replace(/\./g, ""), 10) || null;
              update("province_id", num);
              update("regency_id", null);
              update("district_id", null);
              update("village_id", null);
              update("ranting_id", null);
            }}
          />
          <Select
            label="Kabupaten / Kota"
            value={selectValueWilayah(form.regency_id, regencyOptions)}
            options={optionsWithFallback(
              regencyOptions,
              form.regency_id,
              regenciesLoading ? "Memuat kabupaten..." : "—"
            )}
            onChange={(v) => {
              const num = v === "" ? null : parseInt(String(v).replace(/\./g, ""), 10) || null;
              update("regency_id", num);
              update("district_id", null);
              update("village_id", null);
              update("ranting_id", null);
            }}
          />
          <Select
            label="Kecamatan"
            value={selectValueWilayah(form.district_id, districtOptions)}
            options={optionsWithFallback(
              districtOptions,
              form.district_id,
              districtsLoading
                ? "Memuat kecamatan..."
                : normalizeId(form.district_id)
                  ? `Kec. (ID: ${normalizeId(form.district_id)})`
                  : "—"
            )}
            onChange={(v) => {
              const num = v === "" ? null : parseInt(String(v).replace(/\./g, ""), 10) || null;
              update("district_id", num);
              update("village_id", null);
              update("ranting_id", null);
            }}
          />
          <Select
            label="Kelurahan"
            value={selectValueWilayah(form.village_id, villageOptions)}
            options={optionsWithFallback(
              villageOptions,
              form.village_id,
              villagesLoading
                ? "Memuat kelurahan..."
                : form.village_id
                  ? villageNameById ?? `ID: ${normalizeId(form.village_id)}`
                  : "—"
            )}
            onChange={(v) => update("village_id", v ? String(v).replace(/\./g, "") || null : null)}
          />

          <div className="sm:col-span-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-white/50">Ranting</span>
              {rantingLoading ? (
                <input
                  value="Memuat ranting..."
                  readOnly
                  className={inputBase}
                />
              ) : (
                <select
                  value={form.ranting_id ?? ""}
                  onChange={(e) => update("ranting_id", e.target.value || null)}
                  className={selectBase}
                >
                  <option value="">Pilih Ranting</option>
                  {rantingOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>
        </div>
      </section>

      {/* WILAYAH & ORGANISASI */}
      <section className="border border-zinc-700 rounded-lg p-4 space-y-3 bg-zinc-900/40">
        <h3 className="font-medium text-zinc-200">Wilayah & Organisasi</h3>
        <p className="text-xs text-zinc-500">
          Untuk multi jabatan (banyak jabatan per user), gunakan tab <strong className="text-zinc-400">Role Management</strong>. Level & Jabatan di bawah hanya ringkasan/legacy.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Select
            label="Role"
            value={form.app_role}
            options={["SUPERADMIN", "ADMIN", "USER"]}
            onChange={(v) => update("app_role", v)}
          />

          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Status Akun</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Status Akun">
              {[
                { value: "active", label: "Aktif" },
                { value: "pending", label: "Pending" },
                { value: "suspended", label: "Ditangguhkan" },
              ].map(({ value, label }) => {
                const selected = form.status === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update("status", value)}
                    className={`px-3 py-1.5 rounded-md text-sm border ${
                      selected
                        ? "bg-zinc-600 border-zinc-500 text-zinc-100"
                        : "bg-zinc-800 border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Level Struktural (hirarki)</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Level Struktural">
              {([1, 2, 3, 4, 5] as const).map((L) => {
                const label = LEVEL_LABELS[L];
                const selected = form.structural_level === L;
                return (
                  <button
                    key={L}
                    type="button"
                    onClick={() => update("structural_level", L)}
                    className={`px-3 py-1.5 rounded-md text-sm border ${
                      selected
                        ? "bg-zinc-600 border-zinc-500 text-zinc-100"
                        : "bg-zinc-800 border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {L} — {label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Jabatan Struktural (role)"
            value={form.structural_role ?? ""}
            onChange={(v) => update("structural_role", v)}
            placeholder="mis. KETUA_RANTING (untuk multi jabatan gunakan tab Role Management)"
          />

          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Email Diizinkan</span>
            <div className="flex gap-2" role="group" aria-label="Email Allowed">
              <button
                type="button"
                onClick={() => update("email_allowed", true)}
                className={`px-3 py-1.5 rounded-md text-sm border ${
                  form.email_allowed
                    ? "bg-zinc-600 border-zinc-500 text-zinc-100"
                    : "bg-zinc-800 border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                Ya (diizinkan)
              </button>
              <button
                type="button"
                onClick={() => update("email_allowed", false)}
                className={`px-3 py-1.5 rounded-md text-sm border ${
                  !form.email_allowed
                    ? "bg-zinc-600 border-zinc-500 text-zinc-100"
                    : "bg-zinc-800 border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                Tidak
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* METADATA */}
      <section className="border border-zinc-700 rounded-lg p-4 text-sm text-zinc-500 bg-zinc-900/40">
        <div>Dibuat: {new Date(user.created_at).toLocaleString()}</div>
        <div>Update Terakhir: {new Date(user.updated_at).toLocaleString()}</div>
      </section>

      {/* ACTIONS */}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={handleSaveProfile}
          className="px-4 py-2 bg-zinc-600 hover:bg-zinc-500 text-zinc-100 rounded-md text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Menyimpan…" : "Simpan Perubahan"}
        </button>
        <button
          onClick={() => {
            setDirty(false);
            setForm(null);
          }}
          className="px-4 py-2 bg-zinc-800 border border-zinc-600 text-zinc-300 hover:bg-zinc-700 rounded-md text-sm"
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
const inputBase =
  "px-2.5 py-1.5 rounded-md border text-sm w-full " +
  "bg-zinc-700 border-zinc-500 text-white placeholder:text-zinc-400 " +
  "focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 " +
  "read-only:opacity-90 read-only:cursor-default";

function Input({
  label,
  value,
  onChange,
  readOnly = false,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-zinc-400">{label}</span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className={inputBase}
      />
    </label>
  );
}

const selectBase =
  "px-2.5 py-1.5 rounded-md border text-sm w-full " +
  "bg-zinc-700 border-zinc-500 text-white " +
  "focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400";

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: string[] | { value: string; label: string }[];
  onChange?: (v: string) => void;
}) {
  const opts = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-zinc-400">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className={selectBase}
      >
        <option value="">—</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
