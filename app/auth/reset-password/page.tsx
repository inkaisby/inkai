"use client";
import { useState, FormEvent } from "react";
import Image from "next/image";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrMsg("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset/update`,
    });

    if (error) {
      setErrMsg(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black/60 backdrop-blur-xl text-white px-6">
      <div className="bg-black/40 p-8 rounded-2xl border border-white/20 w-[380px] shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/logo/inkai-logo.png"
            alt="INKAI Logo"
            width={80}
            height={80}
            className="w-20 h-20 object-contain drop-shadow-lg"
          />
          <h1 className="text-2xl font-bold mt-3 tracking-wide">
            Reset Password
          </h1>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <p className="text-sm text-white/80 mb-4">
              Masukkan email Anda untuk menerima link reset password.
            </p>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg mb-4 outline-none focus:bg-white/20 transition-all"
            />

            {errMsg && <p className="text-red-400 text-sm mb-3">{errMsg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-black font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? "Mengirim..." : "Kirim Link Reset"}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-white/90">
              Link reset password telah dikirim ke:
            </p>
            <p className="font-semibold">{email}</p>

            <button
              onClick={() => (window.location.href = "/")}
              className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-black font-semibold rounded-lg transition-all"
            >
              Kembali ke Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
