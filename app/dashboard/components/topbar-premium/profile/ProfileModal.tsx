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
import useCompletionScore from "./hooks/useCompletionScore";
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
        label:
          (v as { nama?: string; name?: string }).nama ??
          (v as { name?: string }).name ??
          "-",
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
  const { score: completionScore } = useCompletionScore(profile);
  const { options: rantingOptions, loading: rantingLoading } =
    useRantingOptions({
      provinceId: profile?.provinceId ?? null,
      regencyId: profile?.regencyId ?? null,
      districtId: profile?.districtId ?? null,
      contextRantingId: profile?.rantingId ?? null,
    });

  /* ================= WILAYAH ================= */
  const [provinceOptions, setProvinceOptions] = useState<Option[]>([]);
  const [regencyOptions, setRegencyOptions] = useState<Option[]>([]);
  const [districtOptions, setDistrictOptions] = useState<Option[]>([]);
  const [villageOptions, setVillageOptions] = useState<Option[]>([]);
  const [districtNameById, setDistrictNameById] = useState<string | null>(null);
  const [villageNameById, setVillageNameById] = useState<string | null>(null);
  const [provincesLoading, setProvincesLoading] = useState(true);
  const [regenciesLoading, setRegenciesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [villagesLoading, setVillagesLoading] = useState(false);
  const [rantingLocked, setRantingLocked] = useState<boolean>(false);
  const [legalConfirmOpen, setLegalConfirmOpen] = useState(false);
  // Read-only setelah save (session) atau dari DB setelah refresh (profile.rantingLocked)
  const isRantingReadOnly =
    rantingLocked || (profile?.rantingLocked === true);

  useEffect(() => {
    queueMicrotask(() => setProvincesLoading(true));
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
    const districtKey = String(profile.districtId).replace(/\./g, "").trim();
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
  }, [profile?.districtId]);

  // Resolve nama kecamatan/kelurahan by ID agar tampil nama (bukan "-") saat nilai ada tapi belum di opsi
  useEffect(() => {
    const did = profile?.districtId ? String(profile.districtId).replace(/\./g, "").trim() : "";
    if (!did) {
      setDistrictNameById(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/wilayah/name?${new URLSearchParams({ id: did })}`)
      .then((res) => res.json())
      .then((data: { name?: string | null }) => {
        if (!cancelled) setDistrictNameById(data?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) setDistrictNameById(null);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.districtId]);

  useEffect(() => {
    const vid = profile?.villageId ? String(profile.villageId).replace(/\./g, "").trim() : "";
    if (!vid) {
      setVillageNameById(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/wilayah/name?${new URLSearchParams({ id: vid })}`)
      .then((res) => res.json())
      .then((data: { name?: string | null }) => {
        if (!cancelled) setVillageNameById(data?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) setVillageNameById(null);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.villageId]);

  /* ================= RESOLVE FUNCTIONS ================= */
  const resolveWilayah = (key: string, value: string) => {
    const allOptions = [
      ...provinceOptions,
      ...regencyOptions,
      ...districtOptions,
      ...villageOptions,
    ];
    const found = allOptions.find((o) => String(o.value).replace(/\./g, "") === String(value).replace(/\./g, ""));
    if (found) return found.label;
    if (key === "districtId" && districtNameById) return districtNameById;
    if (key === "villageId" && villageNameById) return villageNameById;
    return "";
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
    // Jika tidak dalam mode wajib lengkap, izinkan tutup kapan saja
    if (!requireComplete) {
      close();
      return;
    }

    // Mode wajib lengkap: hanya boleh tutup jika validasi penuh lolos
    if (!validation.success) {
      toast.error(
        "Profil belum lengkap. Lengkapi semua data wajib sebelum menutup profil.",
      );
      return;
    }

    if (forcedReopenTimer) {
      clearTimeout(forcedReopenTimer);
      forcedReopenTimer = null;
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
      <motion.div
        key="profile-modal"
        className="fixed inset-0 z-[200000] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/60"
        onClick={requireComplete ? handleCloseRequest : undefined}
        role="presentation"
      >
        <motion.div
          className="relative w-full max-w-[900px] max-h-[90vh] rounded-t-2xl sm:rounded-2xl bg-[#0A0F14]/90 border border-cyan-400/20 overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
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
                districtNameById={districtNameById}
                villageNameById={villageNameById}
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

                    const value =
                      key === "rantingId"
                        ? resolveRanting(String(raw))
                        : key === "provinceId" ||
                            key === "regencyId" ||
                            key === "districtId" ||
                            key === "villageId"
                          ? resolveWilayah(key, String(raw))
                          : String(raw);

                    return (
                      <div key={String(key)} className="flex gap-3 text-sm">
                        <span className="w-44 text-cyan-200 font-medium">
                          {label}
                        </span>

                        <span className="text-cyan-300">{value}</span>
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
                    ) : isRantingReadOnly ? (
                      <>
                        <input
                          value={resolveRanting(profile!.rantingId)}
                          disabled
                          readOnly
                          className="w-full rounded-lg px-3 py-2 text-sm
      bg-[#0A0F14]
      border border-emerald-400/40
      text-emerald-300
      cursor-not-allowed"
                        />
                        <p className="mt-1 text-[11px] text-amber-300">
                          Ranting sudah terkunci. Proses pindah ranting hanya
                          bisa melalui prosedur resmi (menu Keanggotaan) atau
                          oleh admin.
                        </p>
                      </>
                    ) : (
                      <>
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
                          <option value="">
                            {rantingLoading
                              ? "Memuat..."
                              : rantingOptions.length === 0
                                ? "Ranting belum tersedia di wilayah anda pilih"
                                : "Pilih Ranting"}
                          </option>
                          {rantingOptions.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        {!rantingLoading && rantingOptions.length === 0 && (
                          <p className="mt-1 text-xs text-amber-400">
                            Ranting belum tersedia di wilayah anda pilih.
                          </p>
                        )}
                        <p className="mt-1 flex items-start gap-2 text-xs text-amber-300">
                          <span className="mt-[1px] inline-flex h-4 w-4 items-center justify-center rounded-full border border-amber-400 text-[10px] font-bold">
                            !
                          </span>
                          <span>
                            Pastikan ranting sesuai tempat latihan utama Anda.{" "}
                            <span className="font-semibold">
                              Setelah dipilih dan disimpan, ranting tidak bisa
                              diganti
                            </span>
                            . Pilih dengan hati-hati !!!!
                          </span>
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
            canSave={completionScore === 100}
            save={() => {
              setLegalConfirmOpen(true);
            }}
          />
        </motion.div>
      </motion.div>

      {legalConfirmOpen && (
        <motion.div
          key="legal-confirm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300000] flex items-center justify-center bg-black/70"
        >
          <div className="w-full max-w-md rounded-xl border border-cyan-500/40 bg-[#05080d]/95 p-5 text-sm text-cyan-50 space-y-4 shadow-[0_0_25px_rgba(34,211,238,0.35)]">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-cyan-200">
                Konfirmasi Legalitas Data
              </h2>
              <p className="text-[13px] text-cyan-100/80">
                Dengan menekan tombol{" "}
                <span className="font-semibold">“Ya, data saya benar”</span>,
                Anda menyatakan bahwa{" "}
                <span className="font-semibold">
                  seluruh data profil yang Anda isi adalah benar
                </span>{" "}
                dan dapat dipakai untuk keperluan legalitas (keanggotaan, UKT,
                sertifikat, dan administrasi resmi lainnya).
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-[12px] text-yellow-100">
              <span className="mt-0.5 text-xs">⚠️</span>
              <p>
                Jika ada kesalahan penulisan nama, NIK, atau data penting lain,
                <span className="font-semibold">
                  {" "}
                  proses administrasi dan penerbitan sertifikat dapat terganggu
                </span>
                . Periksa kembali sebelum menyimpan.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-1 text-xs">
              <button
                type="button"
                onClick={() => setLegalConfirmOpen(false)}
                className="rounded-lg border border-cyan-500/40 px-3 py-1.5 text-cyan-200 hover:bg-cyan-900/40"
              >
                Periksa lagi
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  try {
                    await saveProfile();
                    toast.success("Profil berhasil disimpan");
                    setRantingLocked(true);
                    setLegalConfirmOpen(false);
                    close();
                  } catch (err) {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Gagal menyimpan profil",
                    );
                  }
                }}
                className="rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-300 px-3 py-1.5 text-xs font-semibold text-black hover:shadow-[0_0_15px_rgba(34,211,238,0.7)] disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Ya, data saya benar"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
