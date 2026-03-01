"use client";

import { useState } from "react";

export default function ChangePasswordPanel({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid = password.length >= 8;

  const submit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          newPassword: password,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (res.ok) {
        setPassword("");
        alert(data.message ?? "Password berhasil diubah.");
      } else {
        alert(data.message ?? "Gagal mengubah password.");
      }
    } catch {
      alert("Gagal mengubah password.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-2.5 py-1.5 rounded-md border text-sm bg-zinc-700 border-zinc-500 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 disabled:opacity-80";

  return (
    <div className="space-y-4">
      {/* EMAIL */}
      <div>
        <label className="text-xs text-zinc-400">Email</label>
        <input
          value={email}
          disabled
          className={`mt-1 ${inputClass}`}
        />
      </div>

      {/* PASSWORD BARU */}
      <div>
        <label className="text-xs text-zinc-400">Password Baru</label>
        <div className="relative mt-1">
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`pr-10 ${inputClass}`}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute inset-y-0 right-2 flex items-center text-zinc-400 hover:text-white"
            aria-label={showPass ? "Sembunyikan" : "Tampilkan"}
          >
            {showPass ? "🙈" : "👁"}
          </button>
        </div>
      </div>

      {/* SUBMIT */}
      <button
        disabled={!valid || loading}
        onClick={submit}
        className="w-full py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Menyimpan…" : "Simpan Password"}
      </button>
    </div>
  );
}
