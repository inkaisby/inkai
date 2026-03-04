"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  /** Siap tampilkan form setelah code ditukar ke session (atau tidak pakai code) */
  const [sessionReady, setSessionReady] = useState(false);
  /** Error saat menukar code (link kadaluarsa / invalid) */
  const [codeError, setCodeError] = useState<string | null>(null);

  // Verifikasi link reset: tukar code → session, atau baca session dari hash (#access_token=...&type=recovery).
  // Baca code dari URL langsung agar tidak perlu refresh 2x (searchParams kadang belum ready di mount pertama).
  useEffect(() => {
    let cancelled = false;

    const getCodeFromUrl = () => {
      if (typeof window === "undefined") return code ?? null;
      const fromParams = code;
      if (fromParams) return fromParams;
      const q = new URLSearchParams(window.location.search);
      return q.get("code");
    };

    const tryHashFragment = async () => {
      if (typeof window === "undefined") return null;
      const hash = window.location.hash?.slice(1) || "";
      if (!hash) return null;
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const type = params.get("type");
      if (type !== "recovery" || !access_token || !refresh_token) return null;
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (error) return null;
      return data.session;
    };

    (async () => {
      // 1) Redirect dengan hash (#access_token=...&type=recovery) — tidak perlu code verifier
      const hashSession = await tryHashFragment();
      if (cancelled) return;
      if (hashSession) {
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        setCodeError(null);
        setSessionReady(true);
        return;
      }

      // 2) Redirect dengan ?code=... (PKCE) — baca code dari URL agar jalan di load pertama
      const codeToUse = getCodeFromUrl();
      if (codeToUse) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeToUse);
        if (cancelled) return;
        if (exchangeError) {
          const isVerifierError =
            exchangeError.message?.includes("code verifier") ||
            exchangeError.message?.includes("PKCE");
          setCodeError(
            isVerifierError
              ? "Buka link reset di browser yang sama dengan saat Anda meminta reset password (jangan buka dari aplikasi email lain atau perangkat lain). Atau salin link dan buka di browser yang tadi dipakai."
              : exchangeError.message?.includes("expired") || exchangeError.message?.includes("invalid")
                ? "Link reset sudah kadaluarsa atau tidak valid. Silakan minta link baru di halaman reset password."
                : exchangeError.message || "Gagal memverifikasi link.",
          );
          setSessionReady(false);
          return;
        }
        if (data.session) {
          setCodeError(null);
          setSessionReady(true);
        } else {
          setCodeError("Tidak dapat membuat sesi. Coba lagi atau minta link baru.");
        }
        return;
      }

      // 3) Tanpa code dan tanpa hash: beri waktu agar detectSessionInUrl / hash sempat diproses, lalu cek lagi
      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionData.session) {
        setCodeError(null);
        setSessionReady(true);
        return;
      }
      await new Promise((r) => setTimeout(r, 200));
      if (cancelled) return;
      const hashRetry = await tryHashFragment();
      if (hashRetry) {
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        setCodeError(null);
        setSessionReady(true);
        return;
      }
      const { data: sessionData2 } = await supabase.auth.getSession();
      if (cancelled) return;
      setSessionReady(!!sessionData2.session);
      if (!sessionData2.session) setCodeError("Link tidak valid. Minta link reset password baru.");
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleUpdate = async () => {
    if (!password || !confirm) {
      setError("Password wajib diisi");
      return;
    }

    if (password !== confirm) {
      setError("Password tidak sama");
      return;
    }

    setLoading(true);
    setError("");

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);

    // Redirect ke login setelah sukses
    setTimeout(() => {
      router.replace("/");
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black/60 backdrop-blur-xl text-white px-6">
      <div className="bg-black/40 p-8 rounded-2xl border border-cyan-400/40 w-[380px] shadow-xl">
        {/* HEADER */}
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/logo/inkai-logo.png"
            alt="INKAI Logo"
            width={80}
            height={80}
            className="w-20 h-20 object-contain drop-shadow-lg"
          />
          <h1 className="text-2xl font-bold mt-3 tracking-wide">
            Password Baru
          </h1>
        </div>

        {/* CONTENT */}
        {codeError ? (
          <div className="space-y-3">
            <p className="text-center text-red-400 text-sm">{codeError}</p>
            <button
              type="button"
              onClick={() => router.push("/auth/reset-password")}
              className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-black font-semibold rounded-lg transition-all"
            >
              Minta link reset baru
            </button>
          </div>
        ) : !sessionReady ? (
          <p className="text-center text-white/70 text-sm">
            Memverifikasi link reset…
          </p>
        ) : success ? (
          <p className="text-center text-cyan-300">
            Password berhasil diperbarui. Mengalihkan ke login…
          </p>
        ) : (
          <>
            {/* PASSWORD BARU */}
            <div className="relative mb-3">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Password baru"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full p-3 pr-16 bg-white/10 border border-white/20 rounded-lg outline-none focus:bg-white/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="
                  absolute right-0 top-0 h-full
                  px-4
                  flex items-center justify-center
                  text-cyan-300 text-2xl
                  hover:text-cyan-200 transition-colors
                  focus:outline-none
                "
                aria-label="Toggle password"
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>

            {/* KONFIRMASI PASSWORD */}
            <div className="relative mb-3">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Konfirmasi password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
                className="w-full p-3 pr-16 bg-white/10 border border-white/20 rounded-lg outline-none focus:bg-white/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="
                  absolute right-0 top-0 h-full
                  px-4
                  flex items-center justify-center
                  text-cyan-300 text-2xl
                  hover:text-cyan-200 transition-colors
                  focus:outline-none
                "
                aria-label="Toggle confirm password"
              >
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>

            {/* ERROR */}
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            {/* SUBMIT */}
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-black font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Simpan Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
