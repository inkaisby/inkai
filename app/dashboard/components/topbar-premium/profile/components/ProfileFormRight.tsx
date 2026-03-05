"use client";

import BlockInput from "./BlockInput";
import BlockSelect from "./BlockSelect";
import { ProfileData } from "../hooks/useProfileData";

export type WilayahOption = { label: string; value: string };

type Props = {
  profile: ProfileData | null;
  update: <K extends keyof ProfileData>(
    field: K,
    value: ProfileData[K],
  ) => void;
  step: number;
  errors: Record<string, boolean>;
  provinceOptions: WilayahOption[];
  regencyOptions: WilayahOption[];
  districtOptions: WilayahOption[];
  villageOptions: WilayahOption[];
  districtNameById?: string | null;
  villageNameById?: string | null;
  provincesLoading?: boolean;
  regenciesLoading?: boolean;
  districtsLoading?: boolean;
  villagesLoading?: boolean;
};

/** Normalisasi id wilayah (tanpa titik) agar "35.78.01" dan "357801" dianggap sama. */
function normalizeId(x: string | undefined): string {
  if (x == null) return "";
  return String(x).replace(/\./g, "").trim();
}

/** Agar nilai dari DB tetap tampil di HP saat opsi belum ter-load; picker tidak kosong. */
function optionsWithFallback(
  options: WilayahOption[],
  currentValue: string | undefined,
  loadingLabel: string
): WilayahOption[] {
  if (!currentValue?.trim()) return options;
  const n = normalizeId(currentValue);
  const hasValue = options.some((o) => normalizeId(o.value) === n);
  if (hasValue) return options;
  return [{ value: currentValue, label: loadingLabel }, ...options];
}

export default function ProfileFormRight({
  profile,
  update,
  step,
  errors,
  provinceOptions,
  regencyOptions,
  districtOptions,
  villageOptions,
  districtNameById = null,
  villageNameById = null,
  provincesLoading = false,
  regenciesLoading = false,
  districtsLoading = false,
  villagesLoading = false,
}: Props) {
  if (step !== 2) return null;
  if (!profile) return null;

  const provinceOpts = optionsWithFallback(
    provinceOptions,
    profile.provinceId,
    provincesLoading ? "Memuat provinsi..." : "—"
  );
  const regencyOpts = optionsWithFallback(
    regencyOptions,
    profile.regencyId,
    regenciesLoading ? "Memuat kabupaten..." : "—"
  );
  const districtOpts = optionsWithFallback(
    districtOptions,
    profile.districtId,
    districtsLoading
      ? "Memuat kecamatan..."
      : profile.districtId
        ? (districtNameById ?? `ID: ${normalizeId(profile.districtId)}`)
        : "—"
  );
  const villageOpts = optionsWithFallback(
    villageOptions,
    profile.villageId,
    villagesLoading
      ? "Memuat kelurahan..."
      : profile.villageId
        ? (villageNameById ?? `ID: ${normalizeId(profile.villageId)}`)
        : "—"
  );

  return (
    <div className="space-y-4">
      <BlockInput
        label="Alamat Lengkap"
        value={profile.alamat ?? ""}
        onChange={(v) => update("alamat", v)}
        error={errors?.alamat}
        dataField="alamat"
      />

      <BlockSelect
        label="Provinsi"
        value={profile.provinceId}
        options={provinceOpts}
        placeholder={provincesLoading ? "Memuat provinsi..." : "Pilih..."}
        disabled={provincesLoading}
        error={errors?.provinceId}
        onChange={(v) => {
          update("provinceId", v);
          update("regencyId", "");
          update("districtId", "");
          update("villageId", "");
        }}
      />

      <BlockSelect
        label="Kabupaten / Kota"
        value={profile.regencyId}
        options={regencyOpts}
        placeholder={regenciesLoading ? "Memuat kabupaten..." : "Pilih..."}
        disabled={!profile.provinceId || regenciesLoading}
        error={errors?.regencyId}
        onChange={(v) => {
          update("regencyId", v);
          update("districtId", "");
          update("villageId", "");
        }}
      />

      <BlockSelect
        label="Kecamatan"
        value={profile.districtId}
        options={districtOpts}
        placeholder={districtsLoading ? "Memuat kecamatan..." : "Pilih..."}
        disabled={!profile.regencyId || districtsLoading}
        error={errors?.districtId}
        onChange={(v) => {
          update("districtId", v);
          update("villageId", "");
        }}
      />

      <BlockSelect
        label="Kelurahan"
        value={profile.villageId}
        options={villageOpts}
        placeholder={villagesLoading ? "Memuat kelurahan..." : "Pilih..."}
        disabled={!profile.districtId || villagesLoading}
        error={errors?.villageId}
        onChange={(v) => update("villageId", v)}
      />
    </div>
  );
}
