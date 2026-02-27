"use client";

import React, { useRef, useState } from "react";
import { Camera, User } from "lucide-react";
import Image from "next/image";
import { ProfileData } from "../hooks/useProfileData";

interface ProfileAvatarProps {
  profile?: ProfileData | null;
  update?: <K extends keyof ProfileData>(
    field: K,
  update,
    value: ProfileData[K],
  ) => void;
  uploadAvatar?: (file: File) => void | Promise<void>;
  saveProfile?: () => Promise<void>;
  readonly?: boolean;
}

export default function ProfileAvatar({
  profile,
  uploadAvatar,
  saveProfile: _saveProfile,
  readonly = false,
}: ProfileAvatarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const _lastFileRef = useRef<File | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!profile) {
    return (
      <div className="relative w-full flex flex-col items-center">
        <div className="w-32 h-32 rounded-full bg-cyan-900/30 animate-pulse" />
        <p className="text-xs text-cyan-400 mt-3">Memuat avatar…</p>
      </div>
    );
  }

  const avatarUrl = profile.avatarUrl ?? null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readonly || uploading) return;
    if (!uploadAvatar) {
      console.error("uploadAvatar missing");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("File harus berupa gambar");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran maksimal 2MB");
      return;
    }

    try {
      setUploading(true);

      // HANYA PREVIEW + MARK DIRTY
      await uploadAvatar(file);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      <div className="absolute w-44 h-44 rounded-full bg-yellow-400/20 blur-2xl" />

      <div className="relative w-40 h-40 flex items-center justify-center">
        <div className="absolute w-36 h-36 rounded-full border-[3px] border-yellow-400/70 z-0" />

        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-black/80 flex items-center justify-center z-20">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Avatar"
              fill
              sizes="128px"
              className="object-cover"
              priority
            />
          ) : (
            <User size={48} className="text-white/70" />
          )}
        </div>

        <button
          type="button"
          disabled={readonly || uploading}
          onClick={() => {
            if (!readonly) inputRef.current?.click();
          }}
          className={`
            absolute bottom-0 right-0
            translate-x-1 translate-y-1
            z-50 p-2 rounded-full
            ${
              readonly || uploading
                ? "bg-gray-600 opacity-40"
                : "bg-red-600 hover:bg-red-500"
            }
          `}
        >
          <Camera size={18} color="white" />
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
        disabled={readonly || uploading}
      />

      <p className="text-xs text-cyan-300 mt-2">
        {uploading
          ? "Mengunggah foto…"
          : "Klik ikon kamera untuk mengubah foto."}
      </p>
    </div>
  );
}
