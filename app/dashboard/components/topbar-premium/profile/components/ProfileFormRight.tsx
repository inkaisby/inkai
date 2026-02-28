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
  provincesLoading?: boolean;
  regenciesLoading?: boolean;
  districtsLoading?: boolean;
  villagesLoading?: boolean;
};

/** Agar nilai dari DB tetap tampil di HP saat opsi belum ter-load; piker tidak kosong. */
function optionsWithFallback(
  options: WilayahOption[],
  currentValue: string | undefined,
  loadingLabel: string
): WilayahOption[] {
  if (!currentValue?.trim()) return options;
  const hasValue = options.some((o) => String(o.value) === String(currentValue));
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
    districtsLoading ? "Memuat kecamatan..." : "—"
  );
  const villageOpts = optionsWithFallback(
    villageOptions,
    profile.villageId,
    villagesLoading ? "Memuat kelurahan..." : "—"
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
