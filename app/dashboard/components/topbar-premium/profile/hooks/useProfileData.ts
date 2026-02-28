"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";
import { waitForSessionReady } from "@/app/lib/auth/sessionReady";

/* =====================
   DB ROW TYPE
===================== */
type ProfileRow = {
  nik: string | null;
  nama: string | null;
  email: string | null;
  telepon: string | null;
  role?: string | null;
  jenis_kelamin: string | null;
  tanggal_lahir: string | null;

  nama_ayah: string | null;
  nama_ibu: string | null;
  pekerjaan_ortu: string | null;

  alamat: string | null;

  province_id: string | null;
  regency_id: string | null;
  district_id: string | null;
  village_id: string | null;

  ranting_id: string | null;
  avatar_path: string | null;
};

/* =====================
   UI TYPE
===================== */
export interface ProfileData {
  nik: string;
  nikLocked: boolean;

  nama: string;
  email: string;
  telepon: string;
  role?: string;
  jenisKelamin: string;
  tanggalLahir: string;

  namaAyah: string;
  namaIbu: string;
  pekerjaanOrtu: string;

  alamat: string;

  provinceId: string;
  regencyId: string;
  districtId: string;
  villageId: string;

  rantingId: string;
  rantingLocked: boolean;

  avatarPath?: string | null;
  avatarUrl?: string | null;
  avatarDirty?: boolean;
  avatarFile?: File | null;
}

/* =====================
   EMPTY STATE
===================== */
const EMPTY: ProfileData = {
  nik: "",
  nikLocked: false,

  nama: "",
  email: "",
  telepon: "",
  role: "",
  jenisKelamin: "",
  tanggalLahir: "",

  namaAyah: "",
  namaIbu: "",
  pekerjaanOrtu: "",
  alamat: "",

  provinceId: "",
  regencyId: "",
  districtId: "",
  villageId: "",

  rantingId: "",
  rantingLocked: false,

  avatarPath: null,
  avatarUrl: null,
  avatarDirty: false,
  avatarFile: null,
};

/* =====================
   NORMALIZE
===================== */
function normalize(db: ProfileRow | null): ProfileData {
  if (!db) return EMPTY;

  return {
    ...EMPTY,
    nik: db.nik ?? "",
    nikLocked: Boolean(db.nik),

    nama: db.nama ?? "",
    email: db.email ?? "",
    telepon: db.telepon ?? "",
    role: db.role ?? "",
    jenisKelamin: db.jenis_kelamin ?? "",
    tanggalLahir: db.tanggal_lahir?.slice(0, 10) ?? "",

    namaAyah: db.nama_ayah ?? "",
    namaIbu: db.nama_ibu ?? "",
    pekerjaanOrtu: db.pekerjaan_ortu ?? "",
    alamat: db.alamat ?? "",

    provinceId: String(db.province_id ?? ""),
    regencyId: String(db.regency_id ?? ""),
    districtId: String(db.district_id ?? ""),
    villageId: String(db.village_id ?? ""),

    rantingId: db.ranting_id ?? "",
    rantingLocked: Boolean(db.ranting_id),

    avatarPath: db.avatar_path ?? null,
    avatarUrl: null,
    avatarDirty: false,
    avatarFile: null,
  };
}

/* =====================
   HOOK
===================== */
const NIK_LENGTH = 16;
const NIK_CHECK_DEBOUNCE_MS = 400;

export default function useProfileData() {
  const [profile, setProfile] = useState<ProfileData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nikExists, setNikExists] = useState(false);
  const [nikChecking, setNikChecking] = useState(false);

  /* ===== LOAD ===== */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      await waitForSessionReady();

      const { data: rpcData, error } =
        await supabase.rpc("get_profile_self");

      if (error) throw error;

      const row = (Array.isArray(rpcData)
        ? rpcData[0]
        : rpcData) as ProfileRow | null;

      const normalized = normalize(row);

      if (row?.avatar_path) {
        const { data } = supabase.storage
          .from("avatars_v2")
          .getPublicUrl(row.avatar_path);

        normalized.avatarUrl = data?.publicUrl ?? null;
      }

      setProfile(normalized);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ===== NIK DUPLICATE CHECK (debounced) ===== */
  const nikCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const nik = profile.nik;
    if (profile.nikLocked || nik.length !== NIK_LENGTH) {
      setNikExists(false);
      setNikChecking(false);
      return;
    }

    if (nikCheckTimeoutRef.current) {
      clearTimeout(nikCheckTimeoutRef.current);
      nikCheckTimeoutRef.current = null;
    }

    nikCheckTimeoutRef.current = setTimeout(async () => {
      nikCheckTimeoutRef.current = null;
      setNikChecking(true);
      setNikExists(false);
      try {
        const res = await fetch(
          `/api/profile/check-nik?nik=${encodeURIComponent(nik)}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as { exists?: boolean };
        setNikExists(Boolean(data.exists));
      } catch {
        // ignore network error
      } finally {
        setNikChecking(false);
      }
    }, NIK_CHECK_DEBOUNCE_MS);

    return () => {
      if (nikCheckTimeoutRef.current) {
        clearTimeout(nikCheckTimeoutRef.current);
      }
    };
  }, [profile.nik, profile.nikLocked]);

  /* ===== CLEANUP BLOB URL ===== */
  useEffect(() => {
    return () => {
      if (profile.avatarUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(profile.avatarUrl);
      }
    };
  }, [profile.avatarUrl]);

  /* ===== UPDATE FIELD ===== */
  const updateField = <K extends keyof ProfileData>(
    key: K,
    value: ProfileData[K]
  ) => {
    if (key === "email") return;
    if (key === "nik" && profile.nikLocked) return;

    setProfile((p) => ({ ...p, [key]: value }));
  };

  /* ===== SELECT AVATAR (preview only) ===== */
  const selectAvatar = (file: File) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("File harus berupa gambar");
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error("Ukuran maksimal 2MB");
    }

    const previewUrl = URL.createObjectURL(file);

    setProfile((p) => ({
      ...p,
      avatarFile: file,
      avatarUrl: previewUrl,
      avatarDirty: true,
    }));
  };

  /* ===== SAVE PROFILE ===== */
  const saveProfile = useCallback(
    async (currentProfile?: ProfileData) => {
      const p = currentProfile ?? profile;

      if (saving) return;
      // Hanya paksa isi ranting untuk user yang memang belum punya ranting sama sekali
      // (rantingLocked === false). Kalau sudah punya di DB, jangan blokir simpan lagi.
      if (!p.rantingId && !p.rantingLocked) {
        throw new Error("Ranting wajib");
      }
      if (!p.nikLocked && nikExists) {
        throw new Error("NIK sudah terdaftar pada anggota lain");
      }

      setSaving(true);

      try {
        await waitForSessionReady();

        const { data: sessionData } =
          await supabase.auth.getSession();

        const userId = sessionData.session?.user?.id;
        if (!userId) throw new Error("User tidak ditemukan");

        let avatarPath = p.avatarPath;

        /* ===== UPLOAD AVATAR =====
           Upload via API route (server + service role) agar tidak kena error 42P01
           saat upload langsung dari client ke Storage. */
        if (p.avatarDirty && p.avatarFile) {
          try {
            const formData = new FormData();
            formData.set("file", p.avatarFile);

            const uploadUrl =
              typeof window !== "undefined"
                ? `${window.location.origin}/api/profile/upload-avatar`
                : "/api/profile/upload-avatar";
            const uploadRes = await fetch(uploadUrl, {
              method: "POST",
              body: formData,
              credentials: "include",
            });

            if (!uploadRes.ok) {
              const data = await uploadRes.json().catch(() => ({}));
              throw new Error(
                (data as { message?: string }).message ||
                  "Gagal mengunggah avatar"
              );
            }

            const data = (await uploadRes.json()) as { path: string };
            if (data.path) {
              avatarPath = data.path;
              setProfile((prev) => ({
                ...prev,
                avatarPath,
                avatarDirty: false,
                avatarFile: null,
              }));
            }
          } catch (e) {
            console.warn("Upload avatar gagal:", e);
            throw e;
          }
        }

        /* ===== SAVE DB ===== */
        const { error: rpcError } = await supabase.rpc(
          "save_profile",
          {
            p_user_id: userId,
            p_nik: p.nik,
            p_nama: p.nama,
            p_email: p.email,
            p_telepon: p.telepon,
            p_jenis_kelamin: p.jenisKelamin,
            p_tanggal_lahir: p.tanggalLahir || null,
            p_nama_ayah: p.namaAyah || null,
            p_nama_ibu: p.namaIbu || null,
            p_pekerjaan_ortu: p.pekerjaanOrtu || null,
            p_alamat: p.alamat || null,
            p_province_id: p.provinceId
              ? Number(p.provinceId)
              : null,
            p_regency_id: p.regencyId
              ? Number(p.regencyId)
              : null,
            p_district_id: p.districtId
              ? Number(p.districtId)
              : null,
            p_village_id: p.villageId || null,
            p_avatar_path: avatarPath || null,
            p_ranting_id: p.rantingId,
          }
        );

        if (rpcError) throw rpcError;

        setProfile((prev) => ({
          ...prev,
          avatarPath,
          avatarDirty: false,
          avatarFile: null,
          nikLocked: true,
          rantingLocked: true,
        }));
      } finally {
        setSaving(false);
      }
    },
    [saving, profile, nikExists]
  );

  return {
    profile,
    loading,
    saving,
    nikExists,
    nikChecking,
    updateField,
    selectAvatar,
    saveProfile,
    reload: load,
  };
}