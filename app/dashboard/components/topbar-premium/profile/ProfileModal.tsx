"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { z } from "zod";
import { toast } from "react-hot-toast";

import useProfileModal from "./useProfileModal";
import useProfileData, { type ProfileData } from "./hooks/useProfileData";
import useAutoSave from "./hooks/useAutoSave";
import useWizard from "./hooks/useWizard";
import useRantingOptions from "./hooks/useRantingOptions";
import { useBootstrapStore } from "../../../store/bootstrapStore";

import {
  getProvinces,
  getRegencies,
  getDistricts,
  getVillages,
} from "./services/wilayahService";

import ProfileHeader from "./components/ProfileHeader";
import ProfileAvatar from "./components/ProfileAvatar";
import ProfileFormLeft from "./components/ProfileFormLeft";
import ProfileFormRight from "./components/ProfileFormRight";
import ProfileButtons from "./components/ProfileButtons";
import WizardStepper from "./components/WizardStepper";
import CompletionScore from "./components/CompletionScore";

/* ================= TYPES ================= */
type Option = { label: string; value: string };

/* ================= REOPEN TIMER (FORCED MODE) ================= */
let forcedReopenTimer: number | null = null;

const toOptions = (
  arr: { id: unknown; nama?: string; name?: string }[] | unknown,
): Option[] =>
  Array.isArray(arr)
    ? arr.map((v) => ({
        label: (v as { nama?: string; name?: string }).nama ?? (v as { name?: string }).name ?? "-",
        value: String((v as { id: unknown }).id),
      }))
    : [];

/* ================= RESUME ORDER ================= */
const resumeOrder: Array<[keyof ProfileData, string]> = [
  ["nik", "NIK"],
  ["nama", "Nama"],
  ["email", "Email"],
  ["telepon", "Telepon"],
  ["jenisKelamin", "Jenis Kelamin"],
  ["tanggalLahir", "Tanggal Lahir"],
  ["namaAyah", "Nama Ayah"],
  ["namaIbu", "Nama Ibu"],
  ["pekerjaanOrtu", "Pekerjaan Orang Tua"],
  ["alamat", "Alamat"],
  ["provinceId", "Provinsi"],
  ["regencyId", "Kabupaten/Kota"],
  ["districtId", "Kecamatan"],
  ["villageId", "Kelurahan"],
  ["rantingId", "Ranting"],
];

/* ================= VALIDATION ================= */
const ProfileSchema = z.object({
  nik: z.string().length(16),
  nama: z.string().min(1),
  email: z.string().email(),
  telepon: z.string().min(8),
  jenisKelamin: z.string().min(1),
  tanggalLahir: z.string().min(1),
  namaAyah: z.string().min(1),
  namaIbu: z.string().min(1),
  pekerjaanOrtu: z.string().min(1),
  alamat: z.string().min(1),
  provinceId: z.string().min(1),
  regencyId: z.string().min(1),
  districtId: z.string().min(1),
  villageId: z.string().min(1),
  rantingId: z.string().min(1),
  nomor: z.string(),
  status: z.string(),
});

/* ================= COMPONENT ================= */
export default function ProfileModal() {
  const { isOpen, close, requireComplete } = useProfileModal();

  const {
    profile,
    updateField,
    selectAvatar,
    saveProfile,
    loading,
    saving,
    nikExists,
  } = useProfileData();

  const bootstrapUser = useBootstrapStore((s) => s.data?.user);
  const canEditNomor =
    (bootstrapUser?.app_role ?? "").toUpperCase() === "SUPERADMIN";

  const { currentStep, nextStep, prevStep, maxStep } = useWizard();
  const { options: rantingOptions, loading: rantingLoading } =
    useRantingOptions({
      provinceId: profile?.provinceId ?? null,
      regencyId: profile?.regencyId ?? null,
      districtId: profile?.districtId ?? null,
      contextRantingId: profile?.rantingId ?? null,
    });

  /* ================= RANTING LOCK ================= */
  // User baru pilih ranting sekali (by wilayah); setelah tersimpan terkunci. Hanya admin yang bisa ubah (via Pengaturan → Edit pengguna).
  const rantingLocked = !!profile?.rantingId;

  /* ================= WILAYAH ================= */
  const [provinceOptions, setProvinceOptions] = useState<Option[]>([]);
  const [regencyOptions, setRegencyOptions] = useState<Option[]>([]);
  const [districtOptions, setDistrictOptions] = useState<Option[]>([]);
  const [villageOptions, setVillageOptions] = useState<Option[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(true);
  const [regenciesLoading, setRegenciesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [villagesLoading, setVillagesLoading] = useState(false);

  useEffect(() => {
    setProvincesLoading(true);
    getProvinces()
      .then((res) => setProvinceOptions(toOptions(res)))
      .catch(() => setProvinceOptions([]))
      .finally(() => setProvincesLoading(false));
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync wilayah options from profile */
    if (!profile?.provinceId) {
      setRegencyOptions([]);
      setRegenciesLoading(false);
      return;
    }
    setRegenciesLoading(true);
    getRegencies(profile.provinceId)
      .then((res) => setRegencyOptions(toOptions(res)))
      .catch(() => setRegencyOptions([]))
      .finally(() => setRegenciesLoading(false));
  }, [profile?.provinceId]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync wilayah options from profile */
    if (!profile?.regencyId) {
      setDistrictOptions([]);
      setDistrictsLoading(false);
      return;
    }
    setDistrictsLoading(true);
    getDistricts(profile.regencyId)
      .then((res) => setDistrictOptions(toOptions(res)))
      .catch(() => setDistrictOptions([]))
      .finally(() => setDistrictsLoading(false));
  }, [profile?.regencyId]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync wilayah options from profile */
    if (!profile?.districtId) {
      setVillageOptions([]);
      setVillagesLoading(false);
      return;
    }
    setVillagesLoading(true);
    getVillages(profile.districtId)
      .then((res) => setVillageOptions(toOptions(res)))
      .catch(() => setVillageOptions([]))
      .finally(() => setVillagesLoading(false));
  }, [profile?.districtId]);

  /* ================= RESOLVE FUNCTIONS ================= */
  const resolveWilayah = (value: string) => {
    const allOptions = [
      ...provinceOptions,
      ...regencyOptions,
      ...districtOptions,
      ...villageOptions,
    ];
    return allOptions.find((o) => o.value === value)?.label ?? "";
  };

  const resolveRanting = (value: string) => {
    if (!value) return "";

    if (rantingLoading) return "Memuat...";

    const found = rantingOptions.find((o) => String(o.value) === String(value));

    return found?.label ?? "Tidak ditemukan";
  };

  /* ================= VALIDATION ================= */
  const validation = ProfileSchema.safeParse(profile);
  const errors: Record<string, boolean> = {};

  if (!validation.success) {
    validation.error.issues.forEach((e) => {
      if (e.path?.length) errors[e.path[0] as string] = true;
    });
  }

  useAutoSave(
    profile,
    async () => {
      try {
        await saveProfile();
      } catch {}
    },
    false,
  );

  /* ================= CLOSE REQUEST ================= */
  const handleCloseRequest = () => {
    if (validation.success) {
      if (forcedReopenTimer) {
        clearTimeout(forcedReopenTimer);
        forcedReopenTimer = null;
      }
      close();
      return;
    }

    if (requireComplete) {
      toast.error(
        "Profil belum lengkap. Lengkapi data terlebih dahulu — jendela ini akan muncul lagi sebentar lagi.",
      );

      close();

      if (typeof window !== "undefined") {
        if (forcedReopenTimer) {
          clearTimeout(forcedReopenTimer);
        }
        forcedReopenTimer = window.setTimeout(() => {
          const state = useProfileModal.getState();
          if (!state.isOpen) {
            state.openForced();
          }
        }, 8000);
      }
      return;
    }

    close();
  };

  /* ================= CAN NEXT (step-specific validation) ================= */
  const step1Schema = ProfileSchema.pick({
    nik: true,
    nama: true,
    email: true,
    telepon: true,
    jenisKelamin: true,
    tanggalLahir: true,
    namaAyah: true,
    namaIbu: true,
    pekerjaanOrtu: true,
  });
  const step2Schema = ProfileSchema.pick({
    alamat: true,
    provinceId: true,
    regencyId: true,
    districtId: true,
    villageId: true,
  });
  const canNext =
    currentStep === 1
      ? step1Schema.safeParse(profile).success && !nikExists
      : currentStep === 2
        ? step2Schema.safeParse(profile).success
        : true;

  if (!isOpen) return null;

  if (loading || !profile) {
    return (
      <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/60">
        <div className="rounded-xl bg-[#0A0F14] px-6 py-4 text-sm text-cyan-300">
          Memuat profil…
        </div>
      </div>
    );
  }

  /* ================= RENDER ================= */
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[200000] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/60">
        <motion.div className="relative w-full max-w-[900px] max-h-[90vh] rounded-t-2xl sm:rounded-2xl bg-[#0A0F14]/90 border border-cyan-400/20 overflow-hidden flex flex-col">
          {!requireComplete && (
            <button
              onClick={handleCloseRequest}
              className="absolute right-4 top-4 text-cyan-300 hover:text-white"
              aria-label="Tutup"
            >
              <X size={22} />
            </button>
          )}

          <ProfileHeader
            currentStep={currentStep}
            onCloseRequest={handleCloseRequest}
            hideClose={false}
          />
          <CompletionScore profile={profile} />
          <WizardStepper step={currentStep} maxStep={maxStep} />

          <div
            className="px-4 sm:px-6 py-6 space-y-10 overflow-y-auto max-h-[62vh] overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            {currentStep === 1 && (
              <>
                <ProfileAvatar
                  profile={profile}
                  update={updateField}
                  uploadAvatar={selectAvatar}
                  saveProfile={saveProfile}
                />
                <ProfileFormLeft
                  profile={profile}
                  update={updateField}
                  step={currentStep}
                  errors={errors}
                  nikExists={nikExists}
                  canEditNomor={canEditNomor}
                />
              </>
            )}

            {currentStep === 2 && (
              <ProfileFormRight
                profile={profile}
                update={updateField}
                step={currentStep}
                errors={errors}
                provinceOptions={provinceOptions}
                regencyOptions={regencyOptions}
                districtOptions={districtOptions}
                villageOptions={villageOptions}
                provincesLoading={provincesLoading}
                regenciesLoading={regenciesLoading}
                districtsLoading={districtsLoading}
                villagesLoading={villagesLoading}
              />
            )}

            {currentStep === 3 && (
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-7 space-y-2">
                  {resumeOrder.map(([key, label]) => {
                    const raw = profile[key as keyof typeof profile];
                    if (!raw) return null;

                    return (
                      <div key={String(key)} className="flex gap-3 text-sm">
                        <span className="w-44 text-cyan-200 font-medium">
                          {label}
                        </span>

                        <span className="text-cyan-300">
                          {key === "rantingId"
                            ? resolveRanting(String(raw))
                            : key === "provinceId" ||
                                key === "regencyId" ||
                                key === "districtId" ||
                                key === "villageId"
                              ? resolveWilayah(String(raw))
                              : String(raw)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="col-span-5 flex flex-col items-center gap-4 pt-20">
                  <ProfileAvatar
                    profile={profile}
                    update={updateField}
                    uploadAvatar={selectAvatar}
                    saveProfile={saveProfile}
                  />

                  {/* ================= RANTING FIELD ================= */}
                  <div className="w-full max-w-xs">
                    <label className="text-xs text-cyan-300 mb-1 block">
                      Ranting
                    </label>

                    {rantingLoading ? (
                      <input
                        value="Memuat..."
                        disabled
                        className="w-full rounded-lg px-3 py-2 text-sm
      bg-[#0A0F14]
      border border-cyan-400/40
      text-cyan-400
      cursor-wait"
                      />
                    ) : !rantingLocked ? (
                      /* 🟢 User baru: pilih ranting (by wilayah), sekali simpan lalu terkunci */
                      <select
                        value={profile?.rantingId ?? ""}
                        onChange={(e) =>
                          updateField("rantingId", e.target.value)
                        }
                        className="w-full rounded-lg px-3 py-2 text-sm
      bg-[#0A0F14]
      border border-cyan-400/40
      text-cyan-200"
                      >
                        <option value="">Pilih Ranting</option>
                        {rantingOptions.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      /* 🔒 Terkunci setelah simpan; hanya admin yang bisa ubah */
                      <>
                        <input
                          value={resolveRanting(profile!.rantingId)}
                          disabled
                          className="w-full rounded-lg px-3 py-2 text-sm
      bg-[#0A0F14]
      border border-emerald-400/40
      text-emerald-300
      cursor-not-allowed"
                        />
                        <p className="text-xs text-cyan-300/70 mt-1">
                          Hanya admin yang dapat mengubah ranting.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <ProfileButtons
            step={currentStep}
            maxStep={maxStep}
            next={nextStep}
            prev={prevStep}
            isSaving={saving}
            canNext={canNext}
            save={async () => {
              try {
                await saveProfile();
                toast.success("Profil berhasil disimpan");
                close();
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Gagal menyimpan profil",
                );
              }
            }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
