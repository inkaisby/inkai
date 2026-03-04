"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

export default function RegisterForm() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [errorKey, setErrorKey] = useState(0);

  // Render form hanya setelah mount agar tidak hydration mismatch (ekstensi browser bisa ubah DOM sebelum React)
  useEffect(() => {
    setMounted(true);
  }, []);

  // helper error (blink)
  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setErrorKey((v) => v + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.email.trim()) return triggerError("Email tidak boleh kosong.");
    if (form.password.length < 6)
      return triggerError("Password minimal 6 karakter.");
    if (!/[A-Z]/.test(form.password))
      return triggerError("Password harus mengandung huruf besar.");
    if (!/[0-9]/.test(form.password))
      return triggerError("Password harus mengandung angka.");
    if (!agree)
      return triggerError("Anda harus menyetujui syarat & ketentuan.");

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (error) {
        console.error("SIGNUP ERROR:", error);

        const msg = error.message.toLowerCase();

        if (
          msg.includes("already") ||
          msg.includes("exist") ||
          msg.includes("registered") ||
          msg.includes("duplicate")
        ) {
          triggerError("Email sudah terdaftar. Silakan login.");
          return;
        }

        if (msg.includes("rate limit") || msg.includes("rate_limit")) {
          triggerError(
            "Batas pengiriman sementara tercapai. Coba lagi nanti.",
          );
          return;
        }

        triggerError(error.message);
        return;
      }

      // Tanpa konfirmasi email: jika Supabase mengembalikan session, langsung ke dashboard
      if (data.session) {
        router.replace("/dashboard");
        return;
      }
      setSuccessModal(true);
    } catch (err) {
      console.error("UNEXPECTED ERROR:", err); // ⬅️ tambahan opsional
      triggerError("Terjadi kesalahan sistem.");
    }
  };

  return (
    <>
      {/* SUCCESS MODAL */}
      {successModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1d] p-5 sm:p-6 rounded-t-xl sm:rounded-xl border border-white/10 text-center w-full max-w-md">
            <div className="text-[#00c3ff] text-4xl mb-3">✓</div>
            <p className="text-lg font-semibold mb-2">Pendaftaran berhasil!</p>
            <p className="text-sm text-white/80 mb-4">
              Akun Anda siap dipakai. Silakan masuk dengan email dan kata sandi yang baru didaftarkan.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-2 min-h-[44px] px-5 py-2.5 bg-cyan-400 text-black font-semibold rounded-lg hover:bg-cyan-300 transition-colors"
            >
              Ke halaman masuk
            </button>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 text-[#00c3ff] text-xl">
          Memproses...
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center bg-black text-white px-6">
        <div className="w-[380px] p-8 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
          {/* LOGO */}
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/logo/inkai-logo.png"
              className="w-20 h-20 rounded-full shadow-md"
              alt="INKAI"
              width={80}
              height={80}
            />
            <h1 className="text-2xl font-bold mt-3 tracking-wide">
              Daftar Akun INKAI
            </h1>
          </div>

          {!mounted ? (
            <div className="space-y-4 py-4 text-center text-white/60 text-sm">
              Memuat form...
            </div>
          ) : (
            <>
          {/* ERROR */}
          {errorMsg && (
            <>
              <p
                key={errorKey}
                style={{
                  color: "rgba(248,113,113,1)",
                  fontSize: "0.875rem",
                  marginBottom: "0.75rem",
                  animation: "blinkError 0.9s 1.2s ease-out infinite",
                }}
              >
                {errorMsg}
              </p>
              <style jsx>{`
                @keyframes blinkError {
                  0% {
                    opacity: 0;
                    transform: translateY(3px);
                  }
                  40% {
                    opacity: 1;
                    transform: translateY(0);
                  }
                  70% {
                    opacity: 0.7;
                  }
                  100% {
                    opacity: 1;
                  }
                }
              `}</style>
            </>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* EMAIL */}
            <input
              autoFocus
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value.trim().toLowerCase(),
                })
              }
              className="w-full p-3 rounded-lg bg-[#2c2c2c] border border-[#3a3a3a]"
            />

            {/* PASSWORD */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full p-3 rounded-lg bg-[#2c2c2c] border border-[#3a3a3a]"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[55%] -translate-y-1/2 cursor-pointer text-gray-300 text-[22px]"
              >
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>

            {/* AGREEMENT */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={agree}
                onChange={() => setAgree(!agree)}
              />
              Saya setuju dengan syarat & ketentuan
            </label>

            {/* ACTIONS */}
            <div className="flex justify-between mt-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="px-4 py-2 bg-gray-700 rounded-lg"
              >
                Kembali
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-cyan-400 text-black font-semibold rounded-lg"
              >
                Daftar Sekarang
              </button>
            </div>

            {/* ADMIN */}
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() =>
                  (window.location.href = "https://wa.me/6281331053100")
                }
                className="text-[#00c3ff]"
              >
                Bantuan / Hubungi Admin
              </button>
            </div>
          </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
