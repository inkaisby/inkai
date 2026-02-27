"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { z } from "zod";
import { toast } from "react-hot-toast";

import useProfileModal from "./useProfileModal";
import useProfileData from "./hooks/useProfileData";
import useAutoSave from "./hooks/useAutoSave";
import useWizard from "./hooks/useWizard";
import useRantingOptions from "./hooks/useRantingOptions";

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
const resumeOrder: Array<[keyof any, string]> = [
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
});

/* ================= COMPONENT ================= */
export default function ProfileModal() {
  const { isOpen, close } = useProfileModal();

  const {
    profile,
    updateField,
    selectAvatar,
    saveProfile,
    loading,
    saving,
    nikExists,
  } = useProfileData();

  const { currentStep, nextStep, prevStep, maxStep } = useWizard();
  const { options: rantingOptions, loading: rantingLoading } =
    useRantingOptions();

  /* ================= ROLE LOGIC ================= */
  const isKetua = profile?.role === "ketua_cabang";
  const rantingLocked = !!profile?.rantingId && !isKetua;

  /* ================= WILAYAH ================= */
  const [provinceOptions, setProvinceOptions] = useState<Option[]>([]);
  const [regencyOptions, setRegencyOptions] = useState<Option[]>([]);
  const [districtOptions, setDistrictOptions] = useState<Option[]>([]);
  const [villageOptions, setVillageOptions] = useState<Option[]>([]);

  useEffect(() => {
    getProvinces().then((res) => setProvinceOptions(toOptions(res)));
  }, []);

  useEffect(() => {
    if (!profile?.provinceId) return setRegencyOptions([]);
    getRegencies(profile.provinceId).then((res) =>
      setRegencyOptions(toOptions(res)),
    );
  }, [profile?.provinceId]);

  useEffect(() => {
    if (!profile?.regencyId) return setDistrictOptions([]);
    getDistricts(profile.regencyId).then((res) =>
      setDistrictOptions(toOptions(res)),
    );
  }, [profile?.regencyId]);

  useEffect(() => {
    if (!profile?.districtId) return setVillageOptions([]);
    getVillages(profile.districtId).then((res) =>
      setVillageOptions(toOptions(res)),
    );
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
      <motion.div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/60">
        <motion.div className="relative w-[900px] max-h-[90vh] rounded-2xl bg-[#0A0F14]/90 border border-cyan-400/20">
          <button
            onClick={close}
            className="absolute right-4 top-4 text-cyan-300"
          >
            <X size={22} />
          </button>

          <ProfileHeader currentStep={currentStep} />
          <CompletionScore profile={profile} />
          <WizardStepper step={currentStep} maxStep={maxStep} />

          <div className="px-6 py-6 space-y-10 overflow-y-auto max-h-[62vh]">
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
                      /* 🟢 USER BARU atau KETUA → Dropdown */
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
                      /* 🔒 TERKUNCI */
                      <input
                        value={resolveRanting(profile!.rantingId)}
                        disabled
                        className="w-full rounded-lg px-3 py-2 text-sm
      bg-[#0A0F14]
      border border-emerald-400/40
      text-emerald-300
      cursor-not-allowed"
                      />
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
            canNext={true}
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
