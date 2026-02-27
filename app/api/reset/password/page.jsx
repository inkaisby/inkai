"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

function ResetPasswordContent() {
  const params = useSearchParams();
  const token = params.get("token");

  const [email, setEmail] = useState("");
  const [valid, setValid] = useState(null);
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/reset/verify", {
        method: "POST",
        body: JSON.stringify({ token }),
      }).then((r) => r.json());

      if (res.valid) {
        setValid(true);
        setEmail(res.email);
      } else {
        setValid(false);
      }
    })();
  }, [token]);

  if (valid === null) return <div>Cek token...</div>;
  if (valid === false)
    return <div>Token tidak valid atau sudah kadaluarsa.</div>;

  const handleUpdate = async () => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setDone(true);
  };

  if (done)
    return (
      <div className="text-center mt-20">
        <h2>Password berhasil diperbarui</h2>
        <button onClick={() => (window.location.href = "/login")}>
          Kembali ke Login
        </button>
      </div>
    );

  return (
    <div className="flex flex-col items-center mt-20">
      <h2 className="text-xl font-bold mb-4">Reset Password untuk {email}</h2>

      <input
        type="password"
        placeholder="Password baru"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="p-3 bg-white/10 border border-white/20 rounded-lg mb-3"
      />

      <button
        onClick={handleUpdate}
        className="px-4 py-2 bg-cyan-400 text-black rounded-lg"
      >
        Simpan Password Baru
      </button>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Cek token...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
