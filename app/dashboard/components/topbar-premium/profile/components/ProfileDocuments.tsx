"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";
import type { ProfileData } from "../hooks/useProfileData";

type DocKind = "ktp" | "akta_lahir" | "kk";

const DOCS: Array<{ kind: DocKind; label: string; hint: string }> = [
  { kind: "ktp", label: "KTP", hint: "PDF / JPG / PNG / WebP (opsional)" },
  {
    kind: "akta_lahir",
    label: "Akte Lahir",
    hint: "PDF / JPG / PNG / WebP (opsional)",
  },
  { kind: "kk", label: "Kartu Keluarga", hint: "PDF / JPG / PNG / WebP (opsional)" },
];

function getStatus(profile: ProfileData, kind: DocKind): boolean {
  if (kind === "ktp") return Boolean(profile.ktpPath);
  if (kind === "akta_lahir") return Boolean(profile.aktaLahirPath);
  return Boolean(profile.kkPath);
}

export default function ProfileDocuments({
  profile,
  uploadDocument,
}: {
  profile: ProfileData;
  uploadDocument: (kind: DocKind, file: File) => Promise<void>;
}) {
  const refs = {
    ktp: useRef<HTMLInputElement | null>(null),
    akta_lahir: useRef<HTMLInputElement | null>(null),
    kk: useRef<HTMLInputElement | null>(null),
  };
  const [uploadingKind, setUploadingKind] = useState<DocKind | null>(null);

  const missing = DOCS.filter((d) => !getStatus(profile, d.kind));
  const allComplete = missing.length === 0;

  return (
    <div className="w-full max-w-xs space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-cyan-300 block">Dokumen (opsional)</label>
          {allComplete ? (
            <span className="text-[11px] text-emerald-300 flex items-center gap-1">
              <CheckCircle2 size={14} /> Lengkap
            </span>
          ) : (
            <span className="text-[11px] text-amber-300 flex items-center gap-1">
              <AlertTriangle size={14} /> Belum lengkap
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {DOCS.map((d) => {
          const done = getStatus(profile, d.kind);
          const busy = uploadingKind === d.kind;
          return (
            <div
              key={d.kind}
              className="rounded-lg border border-cyan-400/20 bg-[#0A0F14]/60 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-cyan-200 font-medium truncate">{d.label}</div>
                  <div className="text-[11px] text-cyan-300/70">{d.hint}</div>
                </div>

                <button
                  type="button"
                  onClick={() => refs[d.kind].current?.click()}
                  disabled={busy}
                  className={
                    "shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] border transition " +
                    (done
                      ? "border-emerald-400/40 text-emerald-200 hover:bg-emerald-900/20"
                      : "border-cyan-400/30 text-cyan-200 hover:bg-cyan-900/30") +
                    (busy ? " opacity-60 cursor-wait" : "")
                  }
                >
                  <UploadCloud size={14} />
                  {busy ? "Mengunggah..." : done ? "Ganti" : "Upload"}
                </button>
              </div>

              <input
                ref={refs[d.kind]}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (!file) return;
                  try {
                    setUploadingKind(d.kind);
                    await uploadDocument(d.kind, file);
                    toast.success(`${d.label} berhasil diunggah`);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Gagal upload dokumen");
                  } finally {
                    setUploadingKind(null);
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

